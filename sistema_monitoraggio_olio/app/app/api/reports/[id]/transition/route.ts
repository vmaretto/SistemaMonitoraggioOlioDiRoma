import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { z } from 'zod';
import { ReportStatus, InspectionType, ClarificationRecipient, AuthorityType, NoticeSeverity } from '@prisma/client';

// Schema di validazione per le transizioni
const transitionBaseSchema = z.object({
  targetStatus: z.enum([
    'BOZZA',
    'IN_LAVORAZIONE',
    'IN_VERIFICA',
    'RICHIESTA_CHIARIMENTI',
    'SEGNALATO_AUTORITA',
    'CHIUSO',
    'ARCHIVIATO'
  ]),
  motivo: z.string().min(1, 'Motivo obbligatorio'),
  note: z.string().optional(),
  attachmentIds: z.array(z.string()).optional(),
  metadata: z.any().optional()
});

// Schema per metadata ispezione
const inspectionMetadataSchema = z.object({
  type: z.literal('inspection'),
  tipoIspezione: z.nativeEnum(InspectionType),
  dataIspezione: z.string().transform(str => new Date(str)),
  luogo: z.string().optional(),
  ispettore: z.string().optional()
});

// Schema per metadata chiarimento
const clarificationMetadataSchema = z.object({
  type: z.literal('clarification'),
  destinatario: z.nativeEnum(ClarificationRecipient),
  emailDestinatario: z.string().email().optional(),
  oggetto: z.string().min(1),
  domande: z.array(z.string()),
  dataScadenza: z.string().transform(str => new Date(str)).optional()
});

// Schema per metadata segnalazione autorità
const authorityNoticeMetadataSchema = z.object({
  type: z.literal('authority_notice'),
  autorita: z.nativeEnum(AuthorityType),
  denominazione: z.string().min(1),
  emailAutorita: z.string().email().optional(),
  oggetto: z.string().min(1),
  violazioni: z.array(z.string()),
  gravita: z.nativeEnum(NoticeSeverity)
});

// Schema per metadata chiusura
const closeMetadataSchema = z.object({
  type: z.literal('close'),
  motivoChiusura: z.string().min(20, 'Il motivo di chiusura deve contenere almeno 20 caratteri')
});

// Mappa delle transizioni consentite secondo il workflow
// Da qualsiasi stato (tranne ARCHIVIATO) si può andare a qualsiasi altro stato
const allStates: string[] = ['BOZZA', 'IN_LAVORAZIONE', 'IN_VERIFICA', 'RICHIESTA_CHIARIMENTI', 'SEGNALATO_AUTORITA', 'CHIUSO', 'ARCHIVIATO'];
const allowedTransitions: Record<string, string[]> = {
  BOZZA: allStates.filter(s => s !== 'BOZZA'),
  IN_LAVORAZIONE: allStates.filter(s => s !== 'IN_LAVORAZIONE'),
  IN_VERIFICA: allStates.filter(s => s !== 'IN_VERIFICA'),
  RICHIESTA_CHIARIMENTI: allStates.filter(s => s !== 'RICHIESTA_CHIARIMENTI'),
  SEGNALATO_AUTORITA: allStates.filter(s => s !== 'SEGNALATO_AUTORITA'),
  CHIUSO: allStates.filter(s => s !== 'CHIUSO'),
  ARCHIVIATO: [] // Stato terminale - nessuna transizione possibile
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
        { success: false, error: 'Non autorizzato' },
        { status: 401 }
      );
    }

    const reportId = params.id;
    const body = await request.json();
    const validatedData = transitionBaseSchema.parse(body);

    // Recupera il report corrente
    const report = await prisma.report.findUnique({
      where: { id: reportId },
      include: {
        inspections: true,
        clarifications: true,
        authorityNotices: true
      }
    });

    if (!report) {
      return NextResponse.json(
        { success: false, error: 'Report non trovato' },
        { status: 404 }
      );
    }

    const fromStatus = report.status;
    const toStatus = validatedData.targetStatus as ReportStatus;

    // Validazione transizione
    if (!allowedTransitions[fromStatus]?.includes(toStatus)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Transizione non consentita',
          details: `Non è possibile passare da ${fromStatus} a ${toStatus}`,
          allowedTransitions: allowedTransitions[fromStatus] || []
        },
        { status: 400 }
      );
    }

    // Esegui la transizione in una transaction
    const result = await prisma.$transaction(async (tx) => {
      // Crea ReportStateChange
      const stateChange = await tx.reportStateChange.create({
        data: {
          reportId,
          statoPrec: fromStatus,
          statoNuovo: toStatus,
          motivo: validatedData.motivo,
          note: validatedData.note,
          metadata: validatedData.metadata,
          userId: session.user.id
        }
      });

      // Gestione allegati per il cambio stato
      if (validatedData.attachmentIds && validatedData.attachmentIds.length > 0) {
        await tx.attachment.updateMany({
          where: {
            id: { in: validatedData.attachmentIds }
          },
          data: {
            stateChangeId: stateChange.id
          }
        });
      }

      // Gestione creazione entità correlate basata su metadata
      let createdEntity = null;

      if (validatedData.metadata) {
        if (validatedData.metadata.type === 'inspection') {
          // Crea Inspection
          const inspectionData = inspectionMetadataSchema.parse(validatedData.metadata);
          createdEntity = await tx.inspection.create({
            data: {
              reportId,
              tipo: inspectionData.tipoIspezione,
              date: inspectionData.dataIspezione,
              inspectorId: session.user.id,
              location: inspectionData.luogo,
              ispettore: inspectionData.ispettore,
              stato: 'PIANIFICATA'
            }
          });
        } else if (validatedData.metadata.type === 'clarification') {
          // Crea ClarificationRequest
          const clarificationData = clarificationMetadataSchema.parse(validatedData.metadata);
          createdEntity = await tx.clarificationRequest.create({
            data: {
              reportId,
              requestedBy: session.user.id,
              destinatario: clarificationData.destinatario,
              emailDestinatario: clarificationData.emailDestinatario,
              oggetto: clarificationData.oggetto,
              question: clarificationData.domande.join('\n'),
              domande: clarificationData.domande,
              stato: 'INVIATA',
              dataScadenza: clarificationData.dataScadenza,
              dueAt: clarificationData.dataScadenza
            }
          });
        } else if (validatedData.metadata.type === 'authority_notice') {
          // Crea AuthorityNotice
          const authorityData = authorityNoticeMetadataSchema.parse(validatedData.metadata);
          createdEntity = await tx.authorityNotice.create({
            data: {
              reportId,
              sentBy: session.user.id,
              autorita: authorityData.autorita,
              authority: authorityData.denominazione,
              denominazione: authorityData.denominazione,
              emailAutorita: authorityData.emailAutorita,
              oggetto: authorityData.oggetto,
              testo: validatedData.motivo,
              violazioni: authorityData.violazioni,
              gravita: authorityData.gravita,
              stato: 'PREPARATA'
            }
          });
        } else if (validatedData.metadata.type === 'close') {
          // Aggiorna report con motivo chiusura
          const closeData = closeMetadataSchema.parse(validatedData.metadata);
          await tx.report.update({
            where: { id: reportId },
            data: {
              motivoChiusura: closeData.motivoChiusura,
              dataChiusura: new Date()
            }
          });
        }
      }

      // Aggiorna lo stato del report
      const updatedReport = await tx.report.update({
        where: { id: reportId },
        data: { status: toStatus }
      });

      // Crea ActionLog
      await tx.actionLog.create({
        data: {
          reportId,
          type: 'TRANSIZIONE_STATO',
          message: `Cambio stato: ${fromStatus} → ${toStatus}. ${validatedData.motivo}`,
          actorId: session.user.id,
          meta: {
            fromStatus,
            toStatus,
            stateChangeId: stateChange.id,
            entityCreated: createdEntity ? {
              type: validatedData.metadata?.type,
              id: createdEntity.id
            } : null,
            ...validatedData.metadata
          }
        }
      });

      return {
        report: updatedReport,
        stateChange,
        createdEntity
      };
    });

    return NextResponse.json({
      success: true,
      data: result,
      message: `Cambio di stato completato con successo: ${fromStatus} → ${toStatus}`
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Dati non validi', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Errore transizione report:', error);
    return NextResponse.json(
      { success: false, error: 'Errore interno del server', details: String(error) },
      { status: 500 }
    );
  }
}

// GET /api/reports/[id]/transition - Ottieni storico transizioni e transizioni disponibili
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Non autorizzato' },
        { status: 401 }
      );
    }

    const reportId = params.id;

    const report = await prisma.report.findUnique({
      where: { id: reportId },
      include: {
        stateChanges: {
          orderBy: { createdAt: 'desc' },
          include: {
            attachments: true
          }
        },
        inspections: {
          orderBy: { createdAt: 'desc' }
        },
        clarifications: {
          orderBy: { requestedAt: 'desc' }
        },
        authorityNotices: {
          orderBy: { sentAt: 'desc' }
        }
      }
    });

    if (!report) {
      return NextResponse.json(
        { success: false, error: 'Report non trovato' },
        { status: 404 }
      );
    }

    const availableTransitions = allowedTransitions[report.status] || [];

    return NextResponse.json({
      success: true,
      data: {
        currentStatus: report.status,
        availableTransitions,
        stateChanges: report.stateChanges,
        inspections: report.inspections,
        clarifications: report.clarifications,
        authorityNotices: report.authorityNotices
      }
    });

  } catch (error) {
    console.error('Errore recupero transizioni:', error);
    return NextResponse.json(
      { success: false, error: 'Errore interno del server' },
      { status: 500 }
    );
  }
}
