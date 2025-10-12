
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const sentiment = searchParams.get('sentiment');
    const fonte = searchParams.get('fonte');
    const search = searchParams.get('search'); // Ricerca generale nel testo
    const keywordFilter = searchParams.get('keyword'); // Filtro per keyword specifica
    const dataType = searchParams.get('dataType'); // Filtro per tipo di dati (real/demo)
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');

    const skip = (page - 1) * limit;
    
    // Costruisce i filtri
    const where: any = {};
    
    if (sentiment && sentiment !== 'all') {
      where.sentiment = sentiment;
    }
    
    if (fonte && fonte !== 'all') {
      where.fonte = fonte;
    }
    
    // Ricerca generale nel testo
    if (search) {
      where.testo = {
        contains: search,
        mode: 'insensitive'
      };
    }

    // Filtro per keyword specifica
    if (keywordFilter && keywordFilter !== 'all') {
      where.keywords = {
        has: keywordFilter
      };
    }

    // Filtro per tipo di dati (real vs demo)
    if (dataType && dataType !== 'all') {
      if (dataType === 'real') {
        // Dati reali: piattaforme che finiscono con '_real'
        where.piattaforma = {
          endsWith: '_real'
        };
      } else if (dataType === 'demo') {
        // Dati demo: piattaforme che contengono 'demo' o sono legacy platforms senza '_real'
        where.piattaforma = {
          OR: [
            { contains: 'demo' },
            { equals: 'multiprovider' },
            { equals: 'google_news' },
            { equals: 'reddit' },
            { equals: 'webzio' }
          ]
        };
      }
    }
    
    if (dateFrom || dateTo) {
      where.dataPost = {};
      if (dateFrom) where.dataPost.gte = new Date(dateFrom);
      if (dateTo) where.dataPost.lte = new Date(dateTo);
    }

    // Recupera i contenuti e le keywords attive
    const [contenuti, totalCount, activeKeywords] = await Promise.all([
      prisma.contenutiMonitorati.findMany({
        where,
        include: {
          verifiche: {
            orderBy: { createdAt: 'desc' },
            take: 1
          }
        },
        orderBy: [
          { dataPost: 'desc' },
          { rilevanza: 'desc' }
        ],
        skip,
        take: limit
      }),
      prisma.contenutiMonitorati.count({ where }),
      prisma.keywords.findMany({
        where: { isActive: true },
        select: { keyword: true }
      })
    ]);

    const totalPages = Math.ceil(totalCount / limit);

    return NextResponse.json({
      contenuti,
      activeKeywords: activeKeywords.map(k => k.keyword),
      total: totalCount,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    });

  } catch (error) {
    console.error('Errore nel recupero contenuti:', error);
    return NextResponse.json({ error: 'Errore interno del server' }, { status: 500 });
  }
}
