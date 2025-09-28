import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { z } from 'zod';

// Schema di validazione per la richiesta di chiarimenti
const createClarificationSchema = z.object({
  question: z.string().min(1, 'La domanda è obbligatoria'),
  dueAt: z.string().datetime().optional() // Data entro cui si richiede il feedback
});

// GET /api/reports/[id]/clarifications - Lista richieste chiarimenti per un report
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

    const clarifications = await prisma.clarificationRequest.findMany({
      where: { reportId },
      orderBy: { requestedAt: 'desc' }
    });

    return NextResponse.json({
      report: {
        id: report.id,
        title: report.title,
        status: report.status
      },
      clarifications
    });

  } catch (error) {
    console.error('Errore recupero richieste chiarimenti:', error);
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    );
  }
}

// POST /api/reports/[id]/clarifications - Crea richiesta chiarimenti
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
    const validatedData = createClarificationSchema.parse(body);

    // Verifica che il report esista e sia nello stato corretto
    const report = await prisma.report.findUnique({
      where: { id: reportId }
    });

    if (!report) {
      return NextResponse.json(
        { error: 'Report non trovato' },
        { status: 404 }
      );
    }

    // Verifica che il report sia in uno stato che permette richieste di chiarimenti
    const allowedStatuses = ['IN_CONTROLLO', 'VERIFICA_CHIARIMENTI'];
    if (!allowedStatuses.includes(report.status)) {
      return NextResponse.json(
        { 
          error: 'Stato del report non valido',
          details: `Le richieste di chiarimenti sono consentite solo per report in stato IN_CONTROLLO o VERIFICA_CHIARIMENTI. Stato attuale: ${report.status}`
        },
        { status: 400 }
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      // Crea la richiesta di chiarimenti
      const clarification = await tx.clarificationRequest.create({
        data: {
          reportId,
          requestedBy: session.user.id,
          question: validatedData.question,
          dueAt: validatedData.dueAt ? new Date(validatedData.dueAt) : null
        }
      });

      // Se il report non era già in VERIFICA_CHIARIMENTI, portalo in quello stato
      if (report.status !== 'VERIFICA_CHIARIMENTI') {
        await tx.report.update({
          where: { id: reportId },
          data: { status: 'VERIFICA_CHIARIMENTI' }
        });
      }

      // Crea ActionLog
      const dueAtFormatted = validatedData.dueAt 
        ? new Date(validatedData.dueAt).toLocaleDateString('it-IT')
        : 'non specificata';

      await tx.actionLog.create({
        data: {
          reportId,
          type: 'RICHIESTA_CHIARIMENTI',
          message: `Richiesti chiarimenti${validatedData.dueAt ? ` entro ${dueAtFormatted}` : ''}`,
          actorId: session.user.id,
          meta: {
            clarificationId: clarification.id,
            question: validatedData.question,
            dueAt: validatedData.dueAt,
            fromStatus: report.status,
            toStatus: 'VERIFICA_CHIARIMENTI'
          }
        }
      });

      return clarification;
    });

    return NextResponse.json({
      clarification: result,
      message: 'Richiesta chiarimenti creata con successo'
    }, { status: 201 });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Dati non validi', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Errore creazione richiesta chiarimenti:', error);
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    );
  }
}