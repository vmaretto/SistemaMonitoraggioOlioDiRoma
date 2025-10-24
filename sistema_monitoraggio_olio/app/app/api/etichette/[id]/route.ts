import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

// GET - Recupera singola etichetta per ID
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
    }

    const etichetta = await prisma.etichetteUfficiali.findUnique({
      where: { id: params.id },
      include: {
        _count: {
          select: {
            verifiche: true
          }
        }
      }
    });

    if (!etichetta) {
      return NextResponse.json({ error: 'Etichetta non trovata' }, { status: 404 });
    }

    return NextResponse.json({ etichetta });

  } catch (error) {
    console.error('Errore nel recupero etichetta:', error);
    return NextResponse.json({ error: 'Errore interno del server' }, { status: 500 });
  }
}

// PUT - Aggiorna etichetta
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  console.log('🔄 PUT /api/etichette/[id] chiamato per ID:', params.id);
  
  try {
    // Step 1: Verifica sessione
    console.log('🔐 Step 1: Verifica sessione...');
    const session = await getServerSession(authOptions);
    
    if (!session) {
      console.error('❌ Sessione non trovata');
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
    }
    console.log('✅ Sessione trovata:', session.user?.email);

    // Step 2: Verifica ruolo
    console.log('👤 Step 2: Verifica ruolo...');
    const userRole = session.user.role?.toUpperCase();
    if (userRole !== 'DIRETTORE' && userRole !== 'ADMIN') {
      console.error('❌ Ruolo non autorizzato:', session.user.role);
      return NextResponse.json({ 
        error: 'Non hai i permessi per modificare etichette ufficiali' 
      }, { status: 403 });
    }
    console.log('✅ Ruolo autorizzato');

    // Step 3: Verifica che l'etichetta esista
    console.log('🔍 Step 3: Verifica esistenza etichetta...');
    const etichettaEsistente = await prisma.etichetteUfficiali.findUnique({
      where: { id: params.id }
    });

    if (!etichettaEsistente) {
      console.error('❌ Etichetta non trovata');
      return NextResponse.json({ error: 'Etichetta non trovata' }, { status: 404 });
    }
    console.log('✅ Etichetta trovata');

    // Step 4: Parse body
    console.log('📦 Step 4: Parse dati...');
    const body = await request.json();
    
    const {
      nome,
      descrizione,
      denominazione,
      categoria,
      produttore,
      comune,
      regioneProduzione,
      tipoEtichetta,
      isAttiva
    } = body;

    console.log('📝 Dati ricevuti:', {
      nome,
      denominazione,
      categoria,
      isAttiva
    });

    // Step 5: Validazione
    console.log('✔️ Step 5: Validazione dati...');
    if (!nome || !denominazione || !categoria || !regioneProduzione) {
      console.error('❌ Campi obbligatori mancanti');
      return NextResponse.json({
        error: 'Campi obbligatori mancanti',
        required: ['nome', 'denominazione', 'categoria', 'regioneProduzione']
      }, { status: 400 });
    }

    const categorieValide = ['DOP', 'IGP', 'Biologici', 'ufficiale'];
    if (!categorieValide.includes(categoria)) {
      console.error('❌ Categoria non valida:', categoria);
      return NextResponse.json({
        error: 'Categoria non valida',
        validCategories: categorieValide
      }, { status: 400 });
    }
    console.log('✅ Validazione completata');

    // Step 6: Aggiorna nel database
    console.log('💾 Step 6: Aggiornamento database...');
    const etichettaAggiornata = await prisma.etichetteUfficiali.update({
      where: { id: params.id },
      data: {
        nome,
        descrizione,
        denominazione,
        categoria,
        produttore,
        comune,
        regioneProduzione,
        tipoEtichetta: tipoEtichetta || 'etichetta',
        isAttiva: isAttiva !== undefined ? isAttiva : true,
        updatedAt: new Date()
      }
    });

    console.log('✅ Etichetta aggiornata con successo');

    return NextResponse.json({
      success: true,
      data: etichettaAggiornata,
      message: 'Etichetta aggiornata con successo'
    });

  } catch (error) {
    console.error('💥 ERRORE nell\'aggiornamento etichetta:', error);
    return NextResponse.json({ 
      error: 'Errore durante l\'aggiornamento dell\'etichetta',
      details: error instanceof Error ? error.message : 'Errore sconosciuto'
    }, { status: 500 });
  }
}

// DELETE - Elimina etichetta
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  console.log('🗑️ DELETE /api/etichette/[id] chiamato per ID:', params.id);
  
  try {
    // Step 1: Verifica sessione
    console.log('🔐 Step 1: Verifica sessione...');
    const session = await getServerSession(authOptions);
    
    if (!session) {
      console.error('❌ Sessione non trovata');
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
    }
    console.log('✅ Sessione trovata:', session.user?.email);

    // Step 2: Verifica ruolo
    console.log('👤 Step 2: Verifica ruolo...');
    const userRole = session.user.role?.toUpperCase();
    if (userRole !== 'DIRETTORE' && userRole !== 'ADMIN') {
      console.error('❌ Ruolo non autorizzato:', session.user.role);
      return NextResponse.json({ 
        error: 'Non hai i permessi per eliminare etichette ufficiali' 
      }, { status: 403 });
    }
    console.log('✅ Ruolo autorizzato');

    // Step 3: Verifica che l'etichetta esista
    console.log('🔍 Step 3: Verifica esistenza etichetta...');
    const etichettaEsistente = await prisma.etichetteUfficiali.findUnique({
      where: { id: params.id },
      include: {
        _count: {
          select: {
            verifiche: true
          }
        }
      }
    });

    if (!etichettaEsistente) {
      console.error('❌ Etichetta non trovata');
      return NextResponse.json({ error: 'Etichetta non trovata' }, { status: 404 });
    }
    console.log('✅ Etichetta trovata');

    // Step 4: Verifica se ci sono verifiche associate
    if (etichettaEsistente._count.verifiche > 0) {
      console.warn('⚠️ Etichetta ha verifiche associate, soft delete');
      // Invece di eliminare, disattiva
      const etichettaDisattivata = await prisma.etichetteUfficiali.update({
        where: { id: params.id },
        data: {
          isAttiva: false,
          updatedAt: new Date()
        }
      });

      return NextResponse.json({
        success: true,
        data: etichettaDisattivata,
        message: 'Etichetta disattivata (ha verifiche associate)',
        softDelete: true
      });
    }

    // Step 5: Elimina dal database
    console.log('🗑️ Step 5: Eliminazione dal database...');
    await prisma.etichetteUfficiali.delete({
      where: { id: params.id }
    });

    console.log('✅ Etichetta eliminata con successo');

    return NextResponse.json({
      success: true,
      message: 'Etichetta eliminata con successo'
    });

  } catch (error) {
    console.error('💥 ERRORE nell\'eliminazione etichetta:', error);
    return NextResponse.json({ 
      error: 'Errore durante l\'eliminazione dell\'etichetta',
      details: error instanceof Error ? error.message : 'Errore sconosciuto'
    }, { status: 500 });
  }
}




