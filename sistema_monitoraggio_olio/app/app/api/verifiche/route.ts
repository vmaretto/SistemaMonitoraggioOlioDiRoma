
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
    const limit = parseInt(searchParams.get('limit') || '10');
    const stato = searchParams.get('stato');
    const risultato = searchParams.get('risultato');

    const skip = (page - 1) * limit;
    
    const where: any = {};
    if (stato && stato !== 'all') where.stato = stato;
    if (risultato && risultato !== 'all') where.risultatoMatching = risultato;

    const [verifiche, totalCount] = await Promise.all([
      prisma.verificheEtichette.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          etichettaUfficiale: {
            select: {
              nome: true,
              produttore: true
            }
          }
        }
      }),
      prisma.verificheEtichette.count({ where })
    ]);

    const totalPages = Math.ceil(totalCount / limit);

    return NextResponse.json({
      verifiche,
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
    console.error('Errore nel recupero verifiche:', error);
    return NextResponse.json({ error: 'Errore interno del server' }, { status: 500 });
  }
}
