
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type'); // contenuti, verifiche, alert
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');

    let csvData = '';
    let filename = '';

    if (type === 'contenuti') {
      const where: any = {};
      if (dateFrom || dateTo) {
        where.dataPost = {};
        if (dateFrom) where.dataPost.gte = new Date(dateFrom);
        if (dateTo) where.dataPost.lte = new Date(dateTo);
      }

      const contenuti = await prisma.contenutiMonitorati.findMany({
        where,
        orderBy: { dataPost: 'desc' }
      });

      const headers = ['Data', 'Fonte', 'Piattaforma', 'Testo', 'Autore', 'Sentiment', 'Score', 'Keywords', 'Rilevanza'];
      csvData = headers.join(',') + '\n';
      
      contenuti.forEach(item => {
        const row = [
          item.dataPost.toISOString().split('T')[0],
          `"${item.fonte}"`,
          `"${item.piattaforma}"`,
          `"${item.testo.replace(/"/g, '""')}"`,
          `"${item.autore || ''}"`,
          `"${item.sentiment}"`,
          item.sentimentScore.toString(),
          `"${item.keywords.join('; ')}"`,
          item.rilevanza.toString()
        ];
        csvData += row.join(',') + '\n';
      });

      filename = `contenuti_monitorati_${new Date().toISOString().split('T')[0]}.csv`;
    
    } else if (type === 'verifiche') {
      const where: any = {};
      if (dateFrom || dateTo) {
        where.createdAt = {};
        if (dateFrom) where.createdAt.gte = new Date(dateFrom);
        if (dateTo) where.createdAt.lte = new Date(dateTo);
      }

      const verifiche = await prisma.verificheEtichette.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        include: {
          etichettaUfficiale: true
        }
      });

      const headers = ['Data', 'Testo OCR', 'Risultato', 'Match %', 'Violazioni', 'Stato', 'Note'];
      csvData = headers.join(',') + '\n';
      
      verifiche.forEach(item => {
        const row = [
          item.createdAt.toISOString().split('T')[0],
          `"${item.testoOcr?.replace(/"/g, '""') || ''}"`,
          `"${item.risultatoMatching}"`,
          item.percentualeMatch.toString(),
          `"${item.violazioniRilevate.join('; ')}"`,
          `"${item.stato}"`,
          `"${item.note?.replace(/"/g, '""') || ''}"`
        ];
        csvData += row.join(',') + '\n';
      });

      filename = `verifiche_etichette_${new Date().toISOString().split('T')[0]}.csv`;

    } else if (type === 'alert') {
      const where: any = {};
      if (dateFrom || dateTo) {
        where.createdAt = {};
        if (dateFrom) where.createdAt.gte = new Date(dateFrom);
        if (dateTo) where.createdAt.lte = new Date(dateTo);
      }

      const alerts = await prisma.alert.findMany({
        where,
        orderBy: { createdAt: 'desc' }
      });

      const headers = ['Data', 'Tipo', 'Priorità', 'Titolo', 'Descrizione', 'Stato', 'Data Risoluzione'];
      csvData = headers.join(',') + '\n';
      
      alerts.forEach(item => {
        const row = [
          item.createdAt.toISOString().split('T')[0],
          `"${item.tipo}"`,
          `"${item.priorita}"`,
          `"${item.titolo.replace(/"/g, '""')}"`,
          `"${item.descrizione.replace(/"/g, '""')}"`,
          item.isRisolto ? 'Risolto' : 'Attivo',
          item.dataRisolto ? item.dataRisolto.toISOString().split('T')[0] : ''
        ];
        csvData += row.join(',') + '\n';
      });

      filename = `alert_${new Date().toISOString().split('T')[0]}.csv`;
    
    } else {
      return NextResponse.json({ error: 'Tipo export non supportato' }, { status: 400 });
    }

    // Restituisce il file CSV
    return new NextResponse(csvData, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`
      }
    });

  } catch (error) {
    console.error('Errore nell\'export CSV:', error);
    return NextResponse.json({ error: 'Errore interno del server' }, { status: 500 });
  }
}
