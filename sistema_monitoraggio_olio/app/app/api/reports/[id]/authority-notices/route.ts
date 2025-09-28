import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { z } from 'zod';

// Schema di validazione per la segnalazione all'ente
const createAuthorityNoticeSchema = z.object({
  authority: z.string().min(1, 'Il nome dell\'ente è obbligatorio'),
  protocol: z.string().optional(),
  note: z.string().optional()
});

// GET /api/reports/[id]/authority-notices - Lista segnalazioni ente per un report
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

    const authorityNotices = await prisma.authorityNotice.findMany({
      where: { reportId },
      orderBy: { sentAt: 'desc' }
    });

    return NextResponse.json({
      report: {
        id: report.id,
        title: report.title,
        status: report.status
      },
      authorityNotices
    });

  } catch (error) {
    console.error('Errore recupero segnalazioni ente:', error);
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    );
  }
}

// POST /api/reports/[id]/authority-notices - Crea segnalazione all'ente
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
    const validatedData = createAuthorityNoticeSchema.parse(body);

    // Verifica che il report esista
    const report = await prisma.report.findUnique({
      where: { id: reportId },
      include: {
        authorityNotices: true
      }
    });

    if (!report) {
      return NextResponse.json(
        { error: 'Report non trovato' },
        { status: 404 }
      );
    }

    // Verifica che il report sia in uno stato che permette segnalazioni all'ente
    // Praticamente tutti gli stati tranne ANALISI e ARCHIVIATA
    const forbiddenStatuses = ['ANALISI', 'ARCHIVIATA'];
    if (forbiddenStatuses.includes(report.status)) {
      return NextResponse.json(
        { 
          error: 'Stato del report non valido',
          details: `Le segnalazioni all'ente non sono consentite per report in stato ${report.status}. Il report deve essere almeno in fase di controllo.`
        },
        { status: 400 }
      );
    }

    // Verifica se esiste già una segnalazione in attesa di feedback
    const pendingNotice = report.authorityNotices.find(notice => !notice.feedbackAt);
    if (pendingNotice) {
      return NextResponse.json(
        { 
          error: 'Segnalazione già inviata',
          details: `Esiste già una segnalazione a ${pendingNotice.authority} in attesa di feedback (del ${pendingNotice.sentAt.toLocaleDateString('it-IT')})`
        },
        { status: 400 }
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      // Crea la segnalazione all'ente
      const authorityNotice = await tx.authorityNotice.create({
        data: {
          reportId,
          sentBy: session.user.id,
          authority: validatedData.authority,
          protocol: validatedData.protocol || null
        }
      });

      // Aggiorna lo stato del report a IN_ATTESA_FEEDBACK_ENTE
      const updatedReport = await tx.report.update({
        where: { id: reportId },
        data: { status: 'IN_ATTESA_FEEDBACK_ENTE' }
      });

      // Crea ActionLog
      await tx.actionLog.create({
        data: {
          reportId,
          type: 'INVIO_A_ENTE',
          message: `Report segnalato a ${validatedData.authority}${validatedData.protocol ? ` (Protocollo: ${validatedData.protocol})` : ''}${validatedData.note ? `. ${validatedData.note}` : ''}`,
          actorId: session.user.id,
          meta: {
            fromStatus: report.status,
            toStatus: 'IN_ATTESA_FEEDBACK_ENTE',
            authority: validatedData.authority,
            protocol: validatedData.protocol,
            authorityNoticeId: authorityNotice.id,
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
      message: `Report segnalato con successo a ${validatedData.authority}`
    }, { status: 201 });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Dati non validi', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Errore creazione segnalazione ente:', error);
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    );
  }
}