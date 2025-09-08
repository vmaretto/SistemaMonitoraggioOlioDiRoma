
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
    const category = searchParams.get('category');
    const isActive = searchParams.get('isActive');

    const where: any = {};
    if (category && category !== 'all') where.category = category;
    if (isActive === 'true') where.isActive = true;
    if (isActive === 'false') where.isActive = false;

    const keywords = await prisma.keywords.findMany({
      where,
      orderBy: [
        { category: 'asc' },
        { keyword: 'asc' }
      ]
    });

    return NextResponse.json({ keywords });

  } catch (error) {
    console.error('Errore nel recupero keywords:', error);
    return NextResponse.json({ error: 'Errore interno del server' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
    }

    const { keyword, category } = await request.json();

    if (!keyword) {
      return NextResponse.json({ error: 'Keyword richiesta' }, { status: 400 });
    }

    const newKeyword = await prisma.keywords.create({
      data: {
        keyword,
        category: category || 'secondary',
        isActive: true
      }
    });

    return NextResponse.json({ 
      success: true,
      keyword: newKeyword
    });

  } catch (error) {
    console.error('Errore nella creazione keyword:', error);
    return NextResponse.json({ error: 'Errore interno del server' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID keyword richiesto' }, { status: 400 });
    }

    await prisma.keywords.delete({
      where: { id }
    });

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Errore nell\'eliminazione keyword:', error);
    return NextResponse.json({ error: 'Errore interno del server' }, { status: 500 });
  }
}
