
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
    const categoria = searchParams.get('categoria');
    const isAttiva = searchParams.get('isAttiva');

    const where: any = {};
    if (categoria && categoria !== 'all') where.categoria = categoria;
    if (isAttiva === 'true') where.isAttiva = true;
    if (isAttiva === 'false') where.isAttiva = false;

    const etichette = await prisma.etichetteUfficiali.findMany({
      where,
      orderBy: [
        { isAttiva: 'desc' },
        { createdAt: 'desc' }
      ],
      include: {
        _count: {
          select: {
            verifiche: true
          }
        }
      }
    });

    return NextResponse.json({ etichette });

  } catch (error) {
    console.error('Errore nel recupero etichette:', error);
    return NextResponse.json({ error: 'Errore interno del server' }, { status: 500 });
  }
}
