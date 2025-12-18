import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * GET - Recupera singolo alert
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

    const alert = await prisma.alert.findUnique({
      where: { id: params.id }
    });

    if (!alert) {
      return NextResponse.json({ error: 'Alert non trovato' }, { status: 404 });
    }

    return NextResponse.json({ alert });

  } catch (error) {
    console.error('Errore nel recupero alert:', error);
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 });
  }
}

/**
 * PATCH - Modifica alert (risolvi, aggiungi note, ecc.)
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

    const { isRisolto } = await request.json();

    // Verifica che l'alert esista
    const existingAlert = await prisma.alert.findUnique({
      where: { id: params.id }
    });

    if (!existingAlert) {
      return NextResponse.json({ error: 'Alert non trovato' }, { status: 404 });
    }

    // Prepara i dati da aggiornare
    const updateData: any = {};

    if (isRisolto !== undefined) {
      updateData.isRisolto = isRisolto;
      if (isRisolto) {
        updateData.dataRisolto = new Date();
      } else {
        updateData.dataRisolto = null;
      }
    }

    // Esegui l'aggiornamento
    const updatedAlert = await prisma.alert.update({
      where: { id: params.id },
      data: updateData
    });

    return NextResponse.json({
      success: true,
      message: isRisolto ? 'Alert risolto con successo' : 'Alert aggiornato con successo',
      alert: updatedAlert
    });

  } catch (error) {
    console.error('Errore nella modifica alert:', error);
    return NextResponse.json({
      error: 'Errore nella modifica dell\'alert',
      details: error instanceof Error ? error.message : 'Errore sconosciuto'
    }, { status: 500 });
  }
}

/**
 * DELETE - Elimina alert
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

    // Solo ADMIN e INSPECTOR possono eliminare alert
    const allowedRoles = ['ADMIN', 'INSPECTOR'];
    if (!allowedRoles.includes(session.user?.role || '')) {
      return NextResponse.json({ error: 'Accesso negato' }, { status: 403 });
    }

    // Verifica che l'alert esista
    const existingAlert = await prisma.alert.findUnique({
      where: { id: params.id }
    });

    if (!existingAlert) {
      return NextResponse.json({ error: 'Alert non trovato' }, { status: 404 });
    }

    // Elimina l'alert
    await prisma.alert.delete({
      where: { id: params.id }
    });

    return NextResponse.json({
      success: true,
      message: 'Alert eliminato con successo'
    });

  } catch (error) {
    console.error('Errore nell\'eliminazione alert:', error);
    return NextResponse.json({
      error: 'Errore nell\'eliminazione dell\'alert',
      details: error instanceof Error ? error.message : 'Errore sconosciuto'
    }, { status: 500 });
  }
}
