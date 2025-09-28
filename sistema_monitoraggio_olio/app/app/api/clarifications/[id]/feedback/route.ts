import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { z } from 'zod';

// Schema di validazione per il feedback ai chiarimenti
const clarificationFeedbackSchema = z.object({
  feedback: z.string().min(1, 'Il feedback è obbligatorio'),
  outcome: z.enum(['CHIUSA', 'SEGNALATA_A_ENTE'], {
    required_error: 'Specificare l\'esito (CHIUSA o SEGNALATA_A_ENTE)'
  }),
  authority: z.string().optional(), // Richiesto solo se outcome è SEGNALATA_A_ENTE
  protocol: z.string().optional()
});

// POST /api/clarifications/[id]/feedback - Fornisci feedback a richiesta chiarimenti
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

    const clarificationId = params.id;
    const body = await request.json();
    const validatedData = clarificationFeedbackSchema.parse(body);

    // Validazione specifica: se outcome è SEGNALATA_A_ENTE, authority è richiesto
    if (validatedData.outcome === 'SEGNALATA_A_ENTE' && !validatedData.authority) {
      return NextResponse.json(
        { 
          error: 'Dati mancanti',
          details: 'Il campo "authority" è obbligatorio quando l\'esito è SEGNALATA_A_ENTE'
        },
        { status: 400 }
      );
    }

    // Verifica che la richiesta di chiarimenti esista
    const clarification = await prisma.clarificationRequest.findUnique({
      where: { id: clarificationId },
      include: {
        report: true
      }
    });

    if (!clarification) {
      return NextResponse.json(
        { error: 'Richiesta chiarimenti non trovata' },
        { status: 404 }
      );
    }

    // Verifica che non sia già stata fornita una risposta
    if (clarification.feedbackAt || clarification.feedback) {
      return NextResponse.json(
        { error: 'Feedback già fornito per questa richiesta' },
        { status: 400 }
      );
    }

    // Verifica che il report sia nello stato corretto
    if (clarification.report.status !== 'VERIFICA_CHIARIMENTI') {
      return NextResponse.json(
        { 
          error: 'Stato del report non valido',
          details: `Il feedback può essere fornito solo per report in stato VERIFICA_CHIARIMENTI. Stato attuale: ${clarification.report.status}`
        },
        { status: 400 }
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      // Aggiorna la richiesta di chiarimenti
      const updatedClarification = await tx.clarificationRequest.update({
        where: { id: clarificationId },
        data: {
          feedback: validatedData.feedback,
          feedbackAt: new Date(),
          outcome: validatedData.outcome
        }
      });

      let updatedReport;
      let authorityNotice = null;

      if (validatedData.outcome === 'CHIUSA') {
        // Chiudi il report
        updatedReport = await tx.report.update({
          where: { id: clarification.reportId },
          data: { status: 'CHIUSA' }
        });

        // Crea ActionLog per chiusura
        await tx.actionLog.create({
          data: {
            reportId: clarification.reportId,
            type: 'CHIUSURA_POST_CHIARIMENTI',
            message: `Report chiuso in seguito a chiarimenti ricevuti`,
            actorId: session.user.id,
            meta: {
              fromStatus: clarification.report.status,
              toStatus: 'CHIUSA',
              clarificationId,
              feedback: validatedData.feedback,
              outcome: validatedData.outcome
            }
          }
        });

      } else if (validatedData.outcome === 'SEGNALATA_A_ENTE') {
        // Segnala a ente
        updatedReport = await tx.report.update({
          where: { id: clarification.reportId },
          data: { status: 'IN_ATTESA_FEEDBACK_ENTE' }
        });

        // Crea AuthorityNotice
        authorityNotice = await tx.authorityNotice.create({
          data: {
            reportId: clarification.reportId,
            sentBy: session.user.id,
            authority: validatedData.authority!,
            protocol: validatedData.protocol || null
          }
        });

        // Crea ActionLog per segnalazione
        await tx.actionLog.create({
          data: {
            reportId: clarification.reportId,
            type: 'INVIO_A_ENTE_POST_CHIARIMENTI',
            message: `Report segnalato a ${validatedData.authority} in seguito ai chiarimenti ricevuti`,
            actorId: session.user.id,
            meta: {
              fromStatus: clarification.report.status,
              toStatus: 'IN_ATTESA_FEEDBACK_ENTE',
              clarificationId,
              feedback: validatedData.feedback,
              outcome: validatedData.outcome,
              authority: validatedData.authority,
              protocol: validatedData.protocol,
              authorityNoticeId: authorityNotice.id
            }
          }
        });
      }

      // ActionLog per il feedback ricevuto
      await tx.actionLog.create({
        data: {
          reportId: clarification.reportId,
          type: 'FEEDBACK_CHIARIMENTI',
          message: `Feedback ricevuto per richiesta chiarimenti`,
          actorId: session.user.id,
          meta: {
            clarificationId,
            feedback: validatedData.feedback,
            outcome: validatedData.outcome,
            questionAsked: clarification.question,
            requestedAt: clarification.requestedAt
          }
        }
      });

      return {
        clarification: updatedClarification,
        report: updatedReport,
        authorityNotice
      };
    });

    const responseMessage = validatedData.outcome === 'CHIUSA'
      ? 'Feedback fornito e report chiuso con successo'
      : `Feedback fornito e report segnalato a ${validatedData.authority}`;

    return NextResponse.json({
      clarification: result.clarification,
      report: result.report,
      authorityNotice: result.authorityNotice,
      message: responseMessage
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Dati non validi', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Errore feedback chiarimenti:', error);
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    );
  }
}

// GET /api/clarifications/[id]/feedback - Ottieni dettagli richiesta chiarimenti
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

    const clarificationId = params.id;

    const clarification = await prisma.clarificationRequest.findUnique({
      where: { id: clarificationId },
      include: {
        report: {
          select: {
            id: true,
            title: true,
            status: true
          }
        }
      }
    });

    if (!clarification) {
      return NextResponse.json(
        { error: 'Richiesta chiarimenti non trovata' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      clarification
    });

  } catch (error) {
    console.error('Errore recupero dettagli chiarimenti:', error);
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    );
  }
}