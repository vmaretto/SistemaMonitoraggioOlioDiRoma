import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import bcrypt from 'bcryptjs';

export const dynamic = 'force-dynamic';

/**
 * GET - Recupera singolo utente (solo ADMIN)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
    }

    if (session.user?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Accesso negato' }, { status: 403 });
    }

    const user = await prisma.user.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        organization: true,
        createdAt: true,
        updatedAt: true,
      }
    });

    if (!user) {
      return NextResponse.json({ error: 'Utente non trovato' }, { status: 404 });
    }

    return NextResponse.json({ user });

  } catch (error) {
    console.error('Errore nel recupero utente:', error);
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 });
  }
}

/**
 * PATCH - Modifica utente (ruolo o reset password) (solo ADMIN)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
    }

    if (session.user?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Accesso negato' }, { status: 403 });
    }

    const { role, resetPassword, name, organization } = await request.json();

    // Verifica che l'utente esista
    const existingUser = await prisma.user.findUnique({
      where: { id: params.id }
    });

    if (!existingUser) {
      return NextResponse.json({ error: 'Utente non trovato' }, { status: 404 });
    }

    // Prepara i dati da aggiornare
    const updateData: any = {};

    // Aggiorna nome se fornito
    if (name !== undefined) {
      updateData.name = name;
    }

    // Aggiorna organizzazione se fornita
    if (organization !== undefined) {
      updateData.organization = organization;
    }

    // Aggiorna ruolo se fornito (solo Operatore e Amministratore)
    if (role) {
      const validRoles = ['USER', 'ADMIN'];
      const newRole = role.toUpperCase();
      if (!validRoles.includes(newRole)) {
        return NextResponse.json({ error: 'Ruolo non valido. Valori ammessi: USER (Operatore), ADMIN (Amministratore)' }, { status: 400 });
      }
      updateData.role = newRole;
    }

    // Reset password se richiesto
    let tempPassword: string | null = null;
    if (resetPassword) {
      // Genera password temporanea
      tempPassword = generateTempPassword();
      const hashedPassword = await bcrypt.hash(tempPassword, 10);
      updateData.password = hashedPassword;
    }

    // Esegui l'aggiornamento
    const updatedUser = await prisma.user.update({
      where: { id: params.id },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        organization: true,
        updatedAt: true,
      }
    });

    const response: any = {
      success: true,
      message: resetPassword ? 'Password resettata con successo' : 'Utente aggiornato con successo',
      user: updatedUser
    };

    // Includi la password temporanea solo se è stato fatto il reset
    if (tempPassword) {
      response.tempPassword = tempPassword;
      response.message = `Password resettata. Nuova password temporanea: ${tempPassword}`;
    }

    return NextResponse.json(response);

  } catch (error) {
    console.error('Errore nella modifica utente:', error);
    return NextResponse.json({
      error: 'Errore nella modifica dell\'utente',
      details: error instanceof Error ? error.message : 'Errore sconosciuto'
    }, { status: 500 });
  }
}

/**
 * DELETE - Elimina utente (solo ADMIN)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
    }

    if (session.user?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Accesso negato' }, { status: 403 });
    }

    // Impedisce l'auto-eliminazione
    if (session.user?.email) {
      const currentUser = await prisma.user.findUnique({
        where: { id: params.id }
      });
      if (currentUser?.email === session.user.email) {
        return NextResponse.json({ error: 'Non puoi eliminare il tuo stesso account' }, { status: 400 });
      }
    }

    // Verifica che l'utente esista
    const existingUser = await prisma.user.findUnique({
      where: { id: params.id }
    });

    if (!existingUser) {
      return NextResponse.json({ error: 'Utente non trovato' }, { status: 404 });
    }

    // Elimina l'utente
    await prisma.user.delete({
      where: { id: params.id }
    });

    return NextResponse.json({
      success: true,
      message: 'Utente eliminato con successo'
    });

  } catch (error) {
    console.error('Errore nell\'eliminazione utente:', error);
    return NextResponse.json({
      error: 'Errore nell\'eliminazione dell\'utente',
      details: error instanceof Error ? error.message : 'Errore sconosciuto'
    }, { status: 500 });
  }
}

/**
 * Genera una password temporanea casuale
 */
function generateTempPassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let password = '';
  for (let i = 0; i < 10; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}
