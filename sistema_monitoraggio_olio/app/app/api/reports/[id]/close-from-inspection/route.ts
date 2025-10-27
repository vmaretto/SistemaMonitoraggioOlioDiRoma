import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { z } from 'zod';

// Schema di validazione
const closeFromInspectionSchema = z.object({
  note: z.string().min(1, 'Una nota è obbligatoria per la chiusura'),
  inspectionId: z.string().optional() // Se specificato, riferimento al sopralluogo specifico
});

// POST /api/reports/[id]/close-from-inspection - Chiudi report dopo sopralluogo
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
    const validatedData = closeFromInspectionSchema.parse(body);

    // Verifica il report e i suoi sopralluoghi
    const report = await prisma.report.findUnique({
      where: { id: reportId },
      include: {
        inspections: {
          orderBy: { date: 'desc' }
        }
      }
    });

    if (!report) {
      return NextResponse.json(
        { error: 'Report non trovato' },
        { status: 404 }
      );
    }

    // Verifica che il report sia nello stato corretto
    if (report.status !== 'IN_VERIFICA') {
      return NextResponse.json(
        {
          error: 'Stato del report non valido',
          details: `La chiusura da sopralluogo è consentita solo per report in stato IN_VERIFICA. Stato attuale: ${report.status}`
        },
        { status: 400 }
      );
    }

    // Verifica che esista almeno un sopralluogo con verbale completato
    const completedInspections = report.inspections.filter(
      inspection => inspection.minutesText && inspection.minutesText.trim().length > 0
    );

    if (completedInspections.length === 0) {
      return NextResponse.json(
        { 
          error: 'Sopralluogo incompleto',
          details: 'È necessario completare almeno un sopralluogo con verbale prima di chiudere il caso'
        },
        { status: 400 }
      );
    }

    // Identifica il sopralluogo di riferimento
    let referencedInspection = completedInspections[0]; // Default: il più recente
    if (validatedData.inspectionId) {
      const specificInspection = completedInspections.find(
        inspection => inspection.id === validatedData.inspectionId
      );
      if (!specificInspection) {
        return NextResponse.json(
          { error: 'Sopralluogo specificato non trovato o incompleto' },
          { status: 400 }
        );
      }
      referencedInspection = specificInspection;
    }

    const result = await prisma.$transaction(async (tx) => {
      // Aggiorna lo stato del report a CHIUSO
      const updatedReport = await tx.report.update({
        where: { id: reportId },
        data: { status: 'CHIUSO' }
      });

      // Crea ActionLog per la chiusura
      await tx.actionLog.create({
        data: {
          reportId,
          type: 'CHIUSURA_POST_SOPRALLUOGO',
          message: `Report chiuso in seguito a sopralluogo. ${validatedData.note}`,
          actorId: session.user.id,
          meta: {
            fromStatus: report.status,
            toStatus: 'CHIUSO',
            referencedInspectionId: referencedInspection.id,
            inspectionDate: referencedInspection.date,
            inspectionLocation: referencedInspection.location,
            inspectionOutcome: referencedInspection.outcome,
            closureNote: validatedData.note,
            totalInspections: report.inspections.length,
            completedInspections: completedInspections.length
          }
        }
      });

      return updatedReport;
    });

    return NextResponse.json({
      report: result,
      referencedInspection: {
        id: referencedInspection.id,
        date: referencedInspection.date,
        location: referencedInspection.location,
        outcome: referencedInspection.outcome
      },
      message: 'Report chiuso con successo dopo sopralluogo'
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Dati non validi', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Errore chiusura report da sopralluogo:', error);
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    );
  }
}