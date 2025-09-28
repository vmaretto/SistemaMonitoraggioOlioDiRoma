import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { z } from 'zod';
import { ReportStatus } from '@prisma/client';

// Schema di validazione per le transizioni
const transitionSchema = z.object({
  to: z.enum([
    'ANALISI',
    'ARCHIVIATA', 
    'IN_CONTROLLO',
    'VERIFICA_SOPRALLUOGO',
    'VERIFICA_CHIARIMENTI', 
    'SEGNALATA_A_ENTE',
    'IN_ATTESA_FEEDBACK_ENTE',
    'CHIUSA'
  ]),
  note: z.string().optional(),
  meta: z.record(z.any()).optional()
});

// Mappa delle transizioni consentite secondo il workflow
const allowedTransitions: Record<ReportStatus, ReportStatus[]> = {
  ANALISI: ['ARCHIVIATA', 'IN_CONTROLLO'],
  ARCHIVIATA: [], // Stato terminale
  IN_CONTROLLO: ['VERIFICA_SOPRALLUOGO', 'VERIFICA_CHIARIMENTI', 'SEGNALATA_A_ENTE'],
  VERIFICA_SOPRALLUOGO: ['CHIUSA', 'SEGNALATA_A_ENTE'],
  VERIFICA_CHIARIMENTI: ['CHIUSA', 'SEGNALATA_A_ENTE'], 
  SEGNALATA_A_ENTE: ['IN_ATTESA_FEEDBACK_ENTE'],
  IN_ATTESA_FEEDBACK_ENTE: ['CHIUSA'],
  CHIUSA: ['ARCHIVIATA'] // Solo archiviazione dopo chiusura
};

// Mappa dei messaggi di default per ogni tipo di transizione
const defaultMessages: Record<string, string> = {
  ANALISI_TO_ARCHIVIATA: 'Report archiviato senza ulteriori azioni necessarie',
  ANALISI_TO_IN_CONTROLLO: 'Analisi completata, avviato controllo approfondito',
  IN_CONTROLLO_TO_VERIFICA_SOPRALLUOGO: 'Richiesto sopralluogo per verifica sul campo',
  IN_CONTROLLO_TO_VERIFICA_CHIARIMENTI: 'Richiesti chiarimenti prima di procedere',
  IN_CONTROLLO_TO_SEGNALATA_A_ENTE: 'Caso segnalato direttamente alle autorità competenti',
  VERIFICA_SOPRALLUOGO_TO_CHIUSA: 'Sopralluogo completato, caso chiuso',
  VERIFICA_SOPRALLUOGO_TO_SEGNALATA_A_ENTE: 'Sopralluogo evidenzia necessità intervento autorità',
  VERIFICA_CHIARIMENTI_TO_CHIUSA: 'Chiarimenti ricevuti, caso chiuso',
  VERIFICA_CHIARIMENTI_TO_SEGNALATA_A_ENTE: 'Chiarimenti evidenziano necessità intervento autorità',
  SEGNALATA_A_ENTE_TO_IN_ATTESA_FEEDBACK_ENTE: 'Segnalazione inviata, in attesa feedback autorità',
  IN_ATTESA_FEEDBACK_ENTE_TO_CHIUSA: 'Feedback autorità ricevuto, caso chiuso',
  CHIUSA_TO_ARCHIVIATA: 'Caso chiuso e archiviato definitivamente'
};

// Tipi di action log per ogni transizione
const actionTypes: Record<string, string> = {
  ANALISI_TO_ARCHIVIATA: 'ARCHIVIAZIONE',
  ANALISI_TO_IN_CONTROLLO: 'AVVIO_CONTROLLO',
  IN_CONTROLLO_TO_VERIFICA_SOPRALLUOGO: 'RICHIESTA_SOPRALLUOGO',
  IN_CONTROLLO_TO_VERIFICA_CHIARIMENTI: 'RICHIESTA_CHIARIMENTI',
  IN_CONTROLLO_TO_SEGNALATA_A_ENTE: 'INVIO_A_ENTE',
  VERIFICA_SOPRALLUOGO_TO_CHIUSA: 'CHIUSURA_POST_SOPRALLUOGO',
  VERIFICA_SOPRALLUOGO_TO_SEGNALATA_A_ENTE: 'INVIO_A_ENTE_POST_SOPRALLUOGO',
  VERIFICA_CHIARIMENTI_TO_CHIUSA: 'CHIUSURA_POST_CHIARIMENTI',
  VERIFICA_CHIARIMENTI_TO_SEGNALATA_A_ENTE: 'INVIO_A_ENTE_POST_CHIARIMENTI',
  SEGNALATA_A_ENTE_TO_IN_ATTESA_FEEDBACK_ENTE: 'ATTESA_FEEDBACK',
  IN_ATTESA_FEEDBACK_ENTE_TO_CHIUSA: 'CHIUSURA_FEEDBACK_ENTE',
  CHIUSA_TO_ARCHIVIATA: 'ARCHIVIAZIONE'
};

// POST /api/reports/[id]/transition - Applica transizione di stato
export async function POST(
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
    const validatedData = transitionSchema.parse(body);

    // Recupera il report corrente
    const report = await prisma.report.findUnique({
      where: { id: reportId },
      include: {
        inspections: true,
        authorityNotices: true
      }
    });

    if (!report) {
      return NextResponse.json(
        { error: 'Report non trovato' },
        { status: 404 }
      );
    }

    const fromStatus = report.status;
    const toStatus = validatedData.to as ReportStatus;

    // Validazione transizione
    if (!allowedTransitions[fromStatus]?.includes(toStatus)) {
      return NextResponse.json(
        { 
          error: 'Transizione non consentita',
          details: `Non è possibile passare da ${fromStatus} a ${toStatus}`,
          allowedTransitions: allowedTransitions[fromStatus] || []
        },
        { status: 400 }
      );
    }

    // Validazioni specifiche per certe transizioni
    if (toStatus === 'SEGNALATA_A_ENTE') {
      // Quando si segnala a un ente, deve automaticamente diventare IN_ATTESA_FEEDBACK_ENTE
      const finalStatus = 'IN_ATTESA_FEEDBACK_ENTE';
      
      // Esegui la transizione in una transaction
      const result = await prisma.$transaction(async (tx) => {
        // Aggiorna lo stato del report
        const updatedReport = await tx.report.update({
          where: { id: reportId },
          data: { status: finalStatus }
        });

        // Crea AuthorityNotice se non esiste già per questo report
        const existingNotice = report.authorityNotices.find(notice => !notice.feedbackAt);
        if (!existingNotice) {
          await tx.authorityNotice.create({
            data: {
              reportId,
              sentBy: session.user.id,
              authority: validatedData.meta?.authority || 'Ente Competente',
              protocol: validatedData.meta?.protocol || null
            }
          });
        }

        // Crea ActionLog per INVIO_A_ENTE
        await tx.actionLog.create({
          data: {
            reportId,
            type: 'INVIO_A_ENTE',
            message: validatedData.note || defaultMessages[`${fromStatus}_TO_SEGNALATA_A_ENTE`] || 'Segnalazione inviata alle autorità competenti',
            actorId: session.user.id,
            meta: {
              fromStatus,
              toStatus: finalStatus,
              authority: validatedData.meta?.authority,
              protocol: validatedData.meta?.protocol,
              ...validatedData.meta
            }
          }
        });

        return updatedReport;
      });

      return NextResponse.json({
        report: result,
        message: 'Report segnalato alle autorità competenti'
      });
    }

    // Validazione specifica per chiusura da sopralluogo
    if (fromStatus === 'VERIFICA_SOPRALLUOGO' && toStatus === 'CHIUSA') {
      const hasCompletedInspection = report.inspections.some(
        inspection => inspection.minutesText && inspection.minutesText.trim().length > 0
      );
      
      if (!hasCompletedInspection) {
        return NextResponse.json(
          { 
            error: 'Chiusura non consentita',
            details: 'È necessario completare almeno un sopralluogo con verbale prima di chiudere il caso'
          },
          { status: 400 }
        );
      }
    }

    // Esegui la transizione standard
    const updatedReport = await prisma.$transaction(async (tx) => {
      // Aggiorna lo stato del report
      const report = await tx.report.update({
        where: { id: reportId },
        data: { status: toStatus }
      });

      // Crea ActionLog
      const transitionKey = `${fromStatus}_TO_${toStatus}`;
      await tx.actionLog.create({
        data: {
          reportId,
          type: actionTypes[transitionKey] || 'TRANSIZIONE_STATO',
          message: validatedData.note || defaultMessages[transitionKey] || `Transizione da ${fromStatus} a ${toStatus}`,
          actorId: session.user.id,
          meta: {
            fromStatus,
            toStatus,
            ...validatedData.meta
          }
        }
      });

      return report;
    });

    return NextResponse.json({
      report: updatedReport,
      message: 'Transizione applicata con successo'
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Dati non validi', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Errore transizione report:', error);
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    );
  }
}

// GET /api/reports/[id]/transition - Ottieni transizioni disponibili per il report
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
      select: { status: true }
    });

    if (!report) {
      return NextResponse.json(
        { error: 'Report non trovato' },
        { status: 404 }
      );
    }

    const availableTransitions = allowedTransitions[report.status] || [];
    
    return NextResponse.json({
      currentStatus: report.status,
      availableTransitions,
      transitionDescriptions: availableTransitions.reduce((acc, status) => {
        const key = `${report.status}_TO_${status}`;
        acc[status] = defaultMessages[key] || `Transizione a ${status}`;
        return acc;
      }, {} as Record<string, string>)
    });

  } catch (error) {
    console.error('Errore recupero transizioni:', error);
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    );
  }
}