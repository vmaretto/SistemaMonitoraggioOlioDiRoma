

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = parseInt(searchParams.get('offset') || '0');

    const notifiche = await prisma.logNotifiche.findMany({
      take: limit,
      skip: offset,
      orderBy: { createdAt: 'desc' }
    });

    const total = await prisma.logNotifiche.count();

    return NextResponse.json({ notifiche, total });
  } catch (error) {
    console.error('Errore recupero notifiche:', error);
    return NextResponse.json({ error: 'Errore recupero notifiche' }, { status: 500 });
  }
}
