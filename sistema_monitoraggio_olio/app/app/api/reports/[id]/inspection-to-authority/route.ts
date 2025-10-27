import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { z } from 'zod';

// Schema di validazione
const inspectionToAuthoritySchema = z.object({
  authority: z.string().min(1, 'Il nome dell\'ente è obbligatorio'),
  protocol: z.string().optional(),
  note: z.string().optional(),
  inspectionId: z.string().optional() // Se specificato, riferimento al sopralluogo specifico
});

// POST /api/reports/[id]/inspection-to-authority - Segnala a ente dopo sopralluogo
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
    const validatedData = inspectionToAuthoritySchema.parse(body);

    // Verifica il report e i suoi sopralluoghi
    const report = await prisma.report.findUnique({
      where: { id: reportId },
      include: {
        inspections: {
          orderBy: { date: 'desc' }
        },
        authorityNotices: true
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
          details: `La segnalazione a ente da sopralluogo è consentita solo per report in stato IN_VERIFICA. Stato attuale: ${report.status}`
        },
        { status: 400 }
      );
    }

    // Verifica che esista almeno un sopralluogo completato
    const completedInspections = report.inspections.filter(
      inspection => inspection.minutesText && inspection.minutesText.trim().length > 0
    );

    if (completedInspections.length === 0) {
      return NextResponse.json(
        { 
          error: 'Sopralluogo incompleto',
          details: 'È necessario completare almeno un sopralluogo con verbale prima di segnalare alle autorità'
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
      // Aggiorna lo stato del report
      const updatedReport = await tx.report.update({
        where: { id: reportId },
        data: { status: 'SEGNALATO_AUTORITA' }
      });

      // Crea AuthorityNotice
      const authorityNotice = await tx.authorityNotice.create({
        data: {
          reportId,
          sentBy: session.user.id,
          authority: validatedData.authority,
          protocol: validatedData.protocol || null
        }
      });

      // Crea ActionLog per la segnalazione
      await tx.actionLog.create({
        data: {
          reportId,
          type: 'INVIO_A_ENTE_POST_SOPRALLUOGO',
          message: `Report segnalato a ${validatedData.authority} in seguito a sopralluogo${validatedData.note ? `. ${validatedData.note}` : ''}`,
          actorId: session.user.id,
          meta: {
            fromStatus: report.status,
            toStatus: 'SEGNALATO_AUTORITA',
            authority: validatedData.authority,
            protocol: validatedData.protocol,
            authorityNoticeId: authorityNotice.id,
            referencedInspectionId: referencedInspection.id,
            inspectionDate: referencedInspection.date,
            inspectionLocation: referencedInspection.location,
            inspectionOutcome: referencedInspection.outcome,
            note: validatedData.note
          }
        }
      });

      return {
        report: updatedReport,
        authorityNotice
      };
    });

    return NextResponse.json({
      report: result.report,
      authorityNotice: result.authorityNotice,
      referencedInspection: {
        id: referencedInspection.id,
        date: referencedInspection.date,
        location: referencedInspection.location,
        outcome: referencedInspection.outcome
      },
      message: `Report segnalato con successo a ${validatedData.authority}`
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Dati non validi', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Errore segnalazione report a ente:', error);
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    );
  }
}