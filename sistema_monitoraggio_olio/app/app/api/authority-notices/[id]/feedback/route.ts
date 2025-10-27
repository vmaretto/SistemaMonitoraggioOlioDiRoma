import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { z } from 'zod';

// Schema di validazione per il feedback dell'ente
const authorityFeedbackSchema = z.object({
  feedback: z.string().min(1, 'Il feedback dell\'ente è obbligatorio'),
  closeCase: z.boolean().default(true) // Se chiudere automaticamente il caso
});

// POST /api/authority-notices/[id]/feedback - Registra feedback dall'ente
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

    const authorityNoticeId = params.id;
    const body = await request.json();
    const validatedData = authorityFeedbackSchema.parse(body);

    // Verifica che la segnalazione esista
    const authorityNotice = await prisma.authorityNotice.findUnique({
      where: { id: authorityNoticeId },
      include: {
        report: true
      }
    });

    if (!authorityNotice) {
      return NextResponse.json(
        { error: 'Segnalazione ente non trovata' },
        { status: 404 }
      );
    }

    // Verifica che non sia già stato fornito un feedback
    if (authorityNotice.feedbackAt || authorityNotice.feedback) {
      return NextResponse.json(
        { error: 'Feedback già registrato per questa segnalazione' },
        { status: 400 }
      );
    }

    // Verifica che il report sia nello stato corretto
    if (authorityNotice.report.status !== 'SEGNALATO_AUTORITA') {
      return NextResponse.json(
        {
          error: 'Stato del report non valido',
          details: `Il feedback può essere registrato solo per report in stato SEGNALATO_AUTORITA. Stato attuale: ${authorityNotice.report.status}`
        },
        { status: 400 }
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      // Aggiorna la segnalazione con il feedback
      const updatedAuthorityNotice = await tx.authorityNotice.update({
        where: { id: authorityNoticeId },
        data: {
          feedback: validatedData.feedback,
          feedbackAt: new Date()
        }
      });

      let updatedReport = null;

      // Se richiesto, chiudi automaticamente il caso
      if (validatedData.closeCase) {
        updatedReport = await tx.report.update({
          where: { id: authorityNotice.reportId },
          data: { status: 'CHIUSO' }
        });

        // Crea ActionLog per chiusura
        await tx.actionLog.create({
          data: {
            reportId: authorityNotice.reportId,
            type: 'CHIUSURA_FEEDBACK_ENTE',
            message: `Report chiuso in seguito al feedback dell'ente ${authorityNotice.authority}`,
            actorId: session.user.id,
            meta: {
              fromStatus: authorityNotice.report.status,
              toStatus: 'CHIUSO',
              authorityNoticeId: authorityNoticeId,
              authority: authorityNotice.authority,
              protocol: authorityNotice.protocol,
              feedback: validatedData.feedback,
              feedbackAt: new Date()
            }
          }
        });
      }

      // ActionLog per registrazione feedback
      await tx.actionLog.create({
        data: {
          reportId: authorityNotice.reportId,
          type: 'FEEDBACK_ENTE',
          message: `Feedback ricevuto da ${authorityNotice.authority}${authorityNotice.protocol ? ` (${authorityNotice.protocol})` : ''}`,
          actorId: session.user.id,
          meta: {
            authorityNoticeId: authorityNoticeId,
            authority: authorityNotice.authority,
            protocol: authorityNotice.protocol,
            feedback: validatedData.feedback,
            feedbackAt: new Date(),
            caseClosed: validatedData.closeCase
          }
        }
      });

      return {
        authorityNotice: updatedAuthorityNotice,
        report: updatedReport
      };
    });

    const responseMessage = validatedData.closeCase
      ? `Feedback registrato e report chiuso con successo`
      : `Feedback registrato con successo`;

    return NextResponse.json({
      authorityNotice: result.authorityNotice,
      report: result.report,
      message: responseMessage
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Dati non validi', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Errore registrazione feedback ente:', error);
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    );
  }
}

// GET /api/authority-notices/[id]/feedback - Ottieni dettagli segnalazione ente
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

    const authorityNoticeId = params.id;

    const authorityNotice = await prisma.authorityNotice.findUnique({
      where: { id: authorityNoticeId },
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

    if (!authorityNotice) {
      return NextResponse.json(
        { error: 'Segnalazione ente non trovata' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      authorityNotice
    });

  } catch (error) {
    console.error('Errore recupero dettagli segnalazione ente:', error);
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    );
  }
}