import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { z } from 'zod';

// Schema di validazione per la creazione di un report
const createReportSchema = z.object({
  title: z.string().min(1, 'Il titolo è obbligatorio'),
  description: z.string().min(1, 'La descrizione è obbligatoria'),
  createdById: z.string().optional()
});

// GET /api/reports - Lista report con filtri
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Non autorizzato' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = (page - 1) * limit;

    // Costruisci filtri
    const where: any = {};
    if (status && status !== 'all') {
      where.status = status;
    }

    // Recupera report con paginazione
    const [reports, totalCount] = await Promise.all([
      prisma.report.findMany({
        where,
        include: {
          actions: {
            orderBy: { createdAt: 'desc' },
            take: 1, // Solo l'ultima azione per la lista
            include: {
              // Riferimento utente tramite actorId se necessario
            }
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
        },
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: limit
      }),
      prisma.report.count({ where })
    ]);

    // Calcola informazioni aggiuntive per ogni report
    const reportsWithDetails = reports.map(report => ({
      id: report.id,
      title: report.title,
      description: report.description,
      status: report.status,
      createdAt: report.createdAt,
      createdById: report.createdById,
      lastAction: report.actions[0] || null,
_count: {
        actionLogs: report._count.actions || 0,
        inspections: report._count.inspections || 0,
        clarificationRequests: report._count.clarifications || 0,
        authorityNotices: report._count.authorityNotices || 0,
        attachments: report._count.attachments || 0
      },
      updatedAt: report.updatedAt
    }));

    return NextResponse.json({
      reports: reportsWithDetails,
      pagination: {
        page,
        limit,
        total: totalCount,
        pages: Math.ceil(totalCount / limit)
      }
    });

  } catch (error) {
    console.error('Errore recupero report:', error);
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    );
  }
}

// POST /api/reports - Crea nuovo report
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Non autorizzato' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const validatedData = createReportSchema.parse(body);

    // Usa l'utente della sessione se createdById non è specificato
    const createdById = validatedData.createdById || session.user.id;

    // Crea il report
    const report = await prisma.report.create({
      data: {
        title: validatedData.title,
        description: validatedData.description,
        createdById,
        status: 'IN_LAVORAZIONE' // Stato iniziale
      },
      include: {
        actions: true,
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

    // Crea il primo ActionLog
    await prisma.actionLog.create({
      data: {
        reportId: report.id,
        type: 'LAVORAZIONE_AVVIATA',
        message: 'Nuovo report creato e messo in lavorazione',
        actorId: session.user.id,
        meta: {
          source: 'Creazione manuale',
          initialStatus: 'IN_LAVORAZIONE'
        }
      }
    });

    return NextResponse.json({
      report: {
        ...report,
        counters: report._count
      }
    }, { status: 201 });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Dati non validi', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Errore creazione report:', error);
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    );
  }
}