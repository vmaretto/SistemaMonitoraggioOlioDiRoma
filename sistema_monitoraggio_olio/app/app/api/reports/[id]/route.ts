import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { ReportStatus } from '@prisma/client';

// Mappa delle transizioni consentite secondo il workflow
const allowedTransitions: Record<ReportStatus, ReportStatus[]> = {
  BOZZA: ['IN_LAVORAZIONE', 'ARCHIVIATO'],
  IN_LAVORAZIONE: ['IN_VERIFICA', 'RICHIESTA_CHIARIMENTI', 'ARCHIVIATO'],
  IN_VERIFICA: ['SEGNALATO_AUTORITA', 'CHIUSO', 'RICHIESTA_CHIARIMENTI', 'IN_LAVORAZIONE'],
  RICHIESTA_CHIARIMENTI: ['IN_VERIFICA', 'SEGNALATO_AUTORITA', 'CHIUSO', 'IN_LAVORAZIONE'],
  SEGNALATO_AUTORITA: ['CHIUSO', 'IN_VERIFICA'],
  CHIUSO: ['ARCHIVIATO'],
  ARCHIVIATO: [] // Stato terminale
};

// GET /api/reports/[id] - Dettaglio report completo
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

    const report = await prisma.report.findUnique({
      where: { id: reportId },
      include: {
        actions: {
          orderBy: { createdAt: 'desc' }
        },
        inspections: {
          orderBy: { date: 'desc' }
        },
        clarifications: {
          orderBy: { requestedAt: 'desc' }
        },
        authorityNotices: {
          orderBy: { sentAt: 'desc' }
        },
        attachments: {
          orderBy: { uploadedAt: 'desc' }
        },
        _count: {
          select: {
            actions: true,
            attachments: true,
            inspections: true,
            clarifications: true,
            authorityNotices: true
          }
        }
      }
    });

    if (!report) {
      return NextResponse.json(
        { error: 'Report non trovato' },
        { status: 404 }
      );
    }

    // Calcola transizioni disponibili per lo stato attuale
    const availableTransitions = allowedTransitions[report.status as ReportStatus] || [];

    return NextResponse.json({
      report: {
        ...report,
        _count: {
          actionLogs: report._count.actions || 0,
          inspections: report._count.inspections || 0,
          clarificationRequests: report._count.clarifications || 0,
          authorityNotices: report._count.authorityNotices || 0,
          attachments: report._count.attachments || 0
        }
      },
      actionLogs: report.actions || [],
      inspections: report.inspections || [],
      clarificationRequests: report.clarifications || [],
      authorityNotices: report.authorityNotices || [],
      attachments: report.attachments || [],
      availableTransitions
    });

  } catch (error) {
    console.error('Errore recupero report:', error);
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    );
  }
}

// PUT /api/reports/[id] - Aggiorna report
export async function PUT(
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
    const body = await request.json();

    // Verifica che il report esista
    const existingReport = await prisma.report.findUnique({
      where: { id: reportId }
    });

    if (!existingReport) {
      return NextResponse.json(
        { error: 'Report non trovato' },
        { status: 404 }
      );
    }

    // Aggiorna solo i campi specificati
    const updateData: any = {};
    if (body.title !== undefined) updateData.title = body.title;
    if (body.description !== undefined) updateData.description = body.description;

    const updatedReport = await prisma.report.update({
      where: { id: reportId },
      data: updateData,
      include: {
        actions: {
          orderBy: { createdAt: 'desc' },
          take: 1
        },
        _count: {
          select: {
            actions: true,
            attachments: true,
            inspections: true,
            clarifications: true,
            authorityNotices: true
          }
        }
      }
    });

    // Log dell'aggiornamento
    if (Object.keys(updateData).length > 0) {
      await prisma.actionLog.create({
        data: {
          reportId,
          type: 'AGGIORNAMENTO',
          message: 'Report aggiornato',
          actorId: session.user.id,
          meta: {
            updatedFields: Object.keys(updateData),
            changes: updateData
          }
        }
      });
    }

    return NextResponse.json({
      report: {
        ...updatedReport,
        counters: updatedReport._count
      }
    });

  } catch (error) {
    console.error('Errore aggiornamento report:', error);
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    );
  }
}

// DELETE /api/reports/[id] - Elimina report (soft delete o hard delete)
export async function DELETE(
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
    const existingReport = await prisma.report.findUnique({
      where: { id: reportId }
    });

    if (!existingReport) {
      return NextResponse.json(
        { error: 'Report non trovato' },
        { status: 404 }
      );
    }

    // Per ora implementiamo solo l'archiviazione (cambio stato)
    // Hard delete potrebbe essere pericoloso per l'audit trail
    if (existingReport.status !== 'CHIUSO') {
      return NextResponse.json(
        { error: 'Solo i report chiusi possono essere archiviati' },
        { status: 400 }
      );
    }

    const archivedReport = await prisma.report.update({
      where: { id: reportId },
      data: { status: 'ARCHIVIATO' }
    });

    // Log dell'archiviazione
    await prisma.actionLog.create({
      data: {
        reportId,
        type: 'ARCHIVIAZIONE',
        message: 'Report archiviato',
        actorId: session.user.id,
        meta: {
          previousStatus: existingReport.status,
          reason: 'Archiviazione manuale'
        }
      }
    });

    return NextResponse.json({
      message: 'Report archiviato con successo',
      report: archivedReport
    });

  } catch (error) {
    console.error('Errore eliminazione report:', error);
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    );
  }
}