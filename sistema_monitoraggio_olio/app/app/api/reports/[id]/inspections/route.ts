import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { z } from 'zod';

// Schema di validazione per la creazione di un sopralluogo
const createInspectionSchema = z.object({
  date: z.string().datetime(),
  inspectorId: z.string().optional(), // Se non specificato, usa l'utente corrente
  location: z.string().optional(),
  minutesText: z.string().optional(),
  outcome: z.string().optional()
});

// GET /api/reports/[id]/inspections - Lista sopralluoghi per un report
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
      select: { id: true, title: true }
    });

    if (!report) {
      return NextResponse.json(
        { error: 'Report non trovato' },
        { status: 404 }
      );
    }

    const inspections = await prisma.inspection.findMany({
      where: { reportId },
      orderBy: { date: 'desc' }
    });

    return NextResponse.json({
      report: {
        id: report.id,
        title: report.title
      },
      inspections
    });

  } catch (error) {
    console.error('Errore recupero sopralluoghi:', error);
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    );
  }
}

// POST /api/reports/[id]/inspections - Crea nuovo sopralluogo
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
    const validatedData = createInspectionSchema.parse(body);

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

    // Verifica che il report sia in uno stato che permette sopralluoghi
    const allowedStatuses = ['IN_LAVORAZIONE', 'IN_VERIFICA'];
    if (!allowedStatuses.includes(report.status)) {
      return NextResponse.json(
        {
          error: 'Stato del report non valido',
          details: `I sopralluoghi sono consentiti solo per report in stato IN_LAVORAZIONE o IN_VERIFICA. Stato attuale: ${report.status}`
        },
        { status: 400 }
      );
    }

    // Usa l'utente corrente come ispettore se non specificato
    const inspectorId = validatedData.inspectorId || session.user.id;

    const result = await prisma.$transaction(async (tx) => {
      // Crea il sopralluogo
      const inspection = await tx.inspection.create({
        data: {
          reportId,
          date: new Date(validatedData.date),
          inspectorId,
          location: validatedData.location,
          minutesText: validatedData.minutesText,
          outcome: validatedData.outcome
        }
      });

      // Se il report non era già in IN_VERIFICA, portalo in quello stato
      if (report.status !== 'IN_VERIFICA') {
        await tx.report.update({
          where: { id: reportId },
          data: { status: 'IN_VERIFICA' }
        });
      }

      // Crea ActionLog
      const actionType = validatedData.minutesText ? 'SOPRALLUOGO_VERBALE' : 'SOPRALLUOGO_PROGRAMMATO';
      const message = validatedData.minutesText 
        ? `Sopralluogo completato presso ${validatedData.location || 'location non specificata'}${validatedData.outcome ? ` - Esito: ${validatedData.outcome}` : ''}`
        : `Sopralluogo programmato per ${new Date(validatedData.date).toLocaleDateString('it-IT')}${validatedData.location ? ` presso ${validatedData.location}` : ''}`;

      await tx.actionLog.create({
        data: {
          reportId,
          type: actionType,
          message,
          actorId: session.user.id,
          meta: {
            inspectionId: inspection.id,
            inspectorId,
            location: validatedData.location,
            outcome: validatedData.outcome,
            hasMinutes: !!validatedData.minutesText
          }
        }
      });

      return inspection;
    });

    return NextResponse.json({
      inspection: result,
      message: 'Sopralluogo creato con successo'
    }, { status: 201 });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Dati non validi', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Errore creazione sopralluogo:', error);
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    );
  }
}