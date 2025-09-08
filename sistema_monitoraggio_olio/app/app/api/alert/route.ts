
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
    const isRisolto = searchParams.get('isRisolto');
    const priorita = searchParams.get('priorita');
    const tipo = searchParams.get('tipo');

    const where: any = {};
    if (isRisolto === 'true') where.isRisolto = true;
    if (isRisolto === 'false') where.isRisolto = false;
    if (priorita && priorita !== 'all') where.priorita = priorita;
    if (tipo && tipo !== 'all') where.tipo = tipo;

    const alerts = await prisma.alert.findMany({
      where,
      orderBy: [
        { isRisolto: 'asc' },
        { priorita: 'desc' },
        { createdAt: 'desc' }
      ]
    });

    return NextResponse.json({ alerts });

  } catch (error) {
    console.error('Errore nel recupero alert:', error);
    return NextResponse.json({ error: 'Errore interno del server' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
    }

    const { id, isRisolto } = await request.json();

    if (!id) {
      return NextResponse.json({ error: 'ID alert richiesto' }, { status: 400 });
    }

    const updatedAlert = await prisma.alert.update({
      where: { id },
      data: {
        isRisolto,
        dataRisolto: isRisolto ? new Date() : null
      }
    });

    return NextResponse.json({ 
      success: true,
      alert: updatedAlert
    });

  } catch (error) {
    console.error('Errore nell\'aggiornamento alert:', error);
    return NextResponse.json({ error: 'Errore interno del server' }, { status: 500 });
  }
}
