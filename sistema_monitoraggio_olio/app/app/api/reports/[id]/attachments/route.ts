import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

// GET /api/reports/[id]/attachments - Lista allegati per un report specifico
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Non autorizzato' },
        { status: 401 }
      );
    }

    const reportId = params.id;

    // Verifica che il report esista
    const report = await prisma.report.findUnique({
      where: { id: reportId },
      select: { id: true, title: true, status: true }
    });

    if (!report) {
      return NextResponse.json(
        { error: 'Report non trovato' },
        { status: 404 }
      );
    }

    const { searchParams } = new URL(request.url);
    const entityType = searchParams.get('entityType');

    // Costruisci filtri
    const where: any = { reportId };
    if (entityType) {
      where.entityType = entityType;
    }

    const attachments = await prisma.attachment.findMany({
      where,
      orderBy: { uploadedAt: 'desc' }
    });

    // Raggruppa allegati per tipo di entità
    const attachmentsByType = attachments.reduce((acc, attachment) => {
      if (!acc[attachment.entityType]) {
        acc[attachment.entityType] = [];
      }
      acc[attachment.entityType].push(attachment);
      return acc;
    }, {} as Record<string, any[]>);

    // Calcola statistiche
    const stats = {
      total: attachments.length,
      byType: Object.keys(attachmentsByType).reduce((acc, type) => {
        acc[type] = attachmentsByType[type].length;
        return acc;
      }, {} as Record<string, number>)
    };

    return NextResponse.json({
      report: {
        id: report.id,
        title: report.title,
        status: report.status
      },
      attachments,
      attachmentsByType,
      stats
    });

  } catch (error) {
    console.error('Errore recupero allegati report:', error);
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    );
  }
}