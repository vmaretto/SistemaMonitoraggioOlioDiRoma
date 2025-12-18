import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import bcrypt from 'bcryptjs';

export const dynamic = 'force-dynamic';

/**
 * GET - Lista tutti gli utenti (solo ADMIN)
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
    }

    // Verifica ruolo ADMIN
    if (session.user?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Accesso negato. Solo gli amministratori possono gestire gli utenti.' }, { status: 403 });
    }

    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        organization: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({ users });

  } catch (error) {
    console.error('Errore nel recupero utenti:', error);
    return NextResponse.json({
      error: 'Errore nel recupero degli utenti',
      details: error instanceof Error ? error.message : 'Errore sconosciuto'
    }, { status: 500 });
  }
}

/**
 * POST - Crea nuovo utente (solo ADMIN)
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
    }

    // Verifica ruolo ADMIN
    if (session.user?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Accesso negato. Solo gli amministratori possono creare utenti.' }, { status: 403 });
    }

    const { email, name, password, role, organization } = await request.json();

    // Validazione
    if (!email || !password) {
      return NextResponse.json({ error: 'Email e password sono obbligatori' }, { status: 400 });
    }

    // Verifica email valida
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: 'Email non valida' }, { status: 400 });
    }

    // Verifica password minima
    if (password.length < 6) {
      return NextResponse.json({ error: 'La password deve essere di almeno 6 caratteri' }, { status: 400 });
    }

    // Verifica ruolo valido
    const validRoles = ['USER', 'ANALYST', 'INSPECTOR', 'ADMIN'];
    const userRole = role?.toUpperCase() || 'USER';
    if (!validRoles.includes(userRole)) {
      return NextResponse.json({ error: 'Ruolo non valido. Valori ammessi: USER, ANALYST, INSPECTOR, ADMIN' }, { status: 400 });
    }

    // Verifica se l'email esiste già
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      return NextResponse.json({ error: 'Un utente con questa email esiste già' }, { status: 409 });
    }

    // Hash della password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Crea l'utente
    const newUser = await prisma.user.create({
      data: {
        email,
        name: name || null,
        password: hashedPassword,
        role: userRole as any,
        organization: organization || null,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        organization: true,
        createdAt: true,
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Utente creato con successo',
      user: newUser
    }, { status: 201 });

  } catch (error) {
    console.error('Errore nella creazione utente:', error);
    return NextResponse.json({
      error: 'Errore nella creazione dell\'utente',
      details: error instanceof Error ? error.message : 'Errore sconosciuto'
    }, { status: 500 });
  }
}
