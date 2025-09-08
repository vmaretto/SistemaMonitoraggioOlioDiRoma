
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

    const where: any = {};
    if (categoria && categoria !== 'all') where.categoria = categoria;

    const configurazioni = await prisma.configurazioni.findMany({
      where,
      orderBy: { categoria: 'asc' }
    });

    return NextResponse.json({ configurazioni });

  } catch (error) {
    console.error('Errore nel recupero configurazioni:', error);
    return NextResponse.json({ error: 'Errore interno del server' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
    }

    const { chiave, valore } = await request.json();

    if (!chiave || valore === undefined) {
      return NextResponse.json({ error: 'Chiave e valore sono obbligatori' }, { status: 400 });
    }

    const configurazione = await prisma.configurazioni.upsert({
      where: { chiave },
      update: { valore },
      create: {
        chiave,
        valore,
        categoria: 'generale'
      }
    });

    return NextResponse.json({ 
      success: true,
      configurazione
    });

  } catch (error) {
    console.error('Errore nell\'aggiornamento configurazione:', error);
    return NextResponse.json({ error: 'Errore interno del server' }, { status: 500 });
  }
}
