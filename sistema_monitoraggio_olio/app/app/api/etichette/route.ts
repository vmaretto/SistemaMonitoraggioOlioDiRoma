import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

// GET - Recupera etichette ufficiali con filtri
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const categoria = searchParams.get('categoria');
    const denominazione = searchParams.get('denominazione');
    const isAttiva = searchParams.get('isAttiva');
    const search = searchParams.get('search');

    const where: any = {};
    
    if (categoria && categoria !== 'all' && categoria !== 'Tutte le categorie') {
      where.categoria = categoria;
    }
    
    if (denominazione && denominazione !== 'all' && denominazione !== 'Tutte le denominazioni') {
      where.denominazione = denominazione;
    }
    
    if (isAttiva === 'true') where.isAttiva = true;
    if (isAttiva === 'false') where.isAttiva = false;
    
    if (search) {
      where.OR = [
        { nome: { contains: search, mode: 'insensitive' } },
        { produttore: { contains: search, mode: 'insensitive' } },
        { denominazione: { contains: search, mode: 'insensitive' } },
        { comune: { contains: search, mode: 'insensitive' } }
      ];
    }

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

    return NextResponse.json({ etichette, count: etichette.length });

  } catch (error) {
    console.error('Errore nel recupero etichette:', error);
    return NextResponse.json({ error: 'Errore interno del server' }, { status: 500 });
  }
}

// POST - Carica nuova etichetta ufficiale
export async function POST(request: NextRequest) {
  console.log('🚀 POST /api/etichette chiamato');
  
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
    console.log('Ruolo utente:', session.user.role);
    
    // Verifica ruolo (case-insensitive)
const userRole = session.user.role?.toUpperCase();
if (userRole !== 'DIRETTORE' && userRole !== 'ADMIN') {

      
      console.error('❌ Ruolo non autorizzato:', session.user.role);
      return NextResponse.json({ 
        error: 'Non hai i permessi per caricare etichette ufficiali. Serve ruolo direttore o admin.' 
      }, { status: 403 });
    }
    console.log('✅ Ruolo autorizzato');

    // Step 3: Parse FormData
    console.log('📦 Step 3: Parse FormData...');
    const formData = await request.formData();
    
    const nome = formData.get('nome') as string;
    const descrizione = formData.get('descrizione') as string | null;
    const denominazione = formData.get('denominazione') as string;
    const categoria = formData.get('categoria') as string;
    const produttore = formData.get('produttore') as string | null;
    const comune = formData.get('comune') as string | null;
    const regioneProduzione = formData.get('regioneProduzione') as string;
    const tipoEtichetta = formData.get('tipoEtichetta') as string;
    const imageFronte = formData.get('imageFronte') as File | null;
    const imageRetro = formData.get('imageRetro') as File | null;

    console.log('📝 Dati ricevuti:', {
      nome,
      denominazione,
      categoria,
      produttore,
      comune,
      regioneProduzione,
      tipoEtichetta,
      haImageFronte: !!imageFronte,
      haImageRetro: !!imageRetro
    });

    // Step 4: Validazione campi obbligatori
    console.log('✔️ Step 4: Validazione campi...');
    if (!nome || !denominazione || !categoria || !regioneProduzione) {
      console.error('❌ Campi obbligatori mancanti');
      return NextResponse.json({
        error: 'Campi obbligatori mancanti',
        required: ['nome', 'denominazione', 'categoria', 'regioneProduzione'],
        received: { nome, denominazione, categoria, regioneProduzione }
      }, { status: 400 });
    }

    // Validazione categoria
    const categorieValide = ['DOP', 'IGP', 'Biologici', 'ufficiale'];
    if (!categorieValide.includes(categoria)) {
      console.error('❌ Categoria non valida:', categoria);
      return NextResponse.json({
        error: 'Categoria non valida',
        validCategories: categorieValide
      }, { status: 400 });
    }

    // Validazione immagine fronte obbligatoria
    if (!imageFronte) {
      console.error('❌ Immagine fronte mancante');
      return NextResponse.json({
        error: 'Immagine fronte obbligatoria'
      }, { status: 400 });
    }
    console.log('✅ Validazione completata');

    // Step 5: Validazione file
    console.log('🖼️ Step 5: Validazione file...');
    const maxSize = 10 * 1024 * 1024; // 10MB
    const tipiAccettati = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];

    if (imageFronte.size > maxSize) {
      console.error('❌ Immagine fronte troppo grande:', imageFronte.size);
      return NextResponse.json({
        error: 'Immagine fronte troppo grande (max 10MB)'
      }, { status: 400 });
    }

    if (!tipiAccettati.includes(imageFronte.type)) {
      console.error('❌ Formato immagine fronte non valido:', imageFronte.type);
      return NextResponse.json({
        error: 'Formato immagine fronte non valido (usa JPG, PNG, GIF, WEBP)'
      }, { status: 400 });
    }

    if (imageRetro && imageRetro.size > maxSize) {
      console.error('❌ Immagine retro troppo grande:', imageRetro.size);
      return NextResponse.json({
        error: 'Immagine retro troppo grande (max 10MB)'
      }, { status: 400 });
    }

    if (imageRetro && !tipiAccettati.includes(imageRetro.type)) {
      console.error('❌ Formato immagine retro non valido:', imageRetro.type);
      return NextResponse.json({
        error: 'Formato immagine retro non valido (usa JPG, PNG, GIF, WEBP)'
      }, { status: 400 });
    }
    console.log('✅ File validati');

    // Step 6: Conversione immagini in base64
    console.log('🔄 Step 6: Conversione immagini...');
    let imageFronteUrl: string | null = null;
    let imageRetroUrl: string | null = null;

    if (imageFronte) {
      console.log('Converting fronte...');
      const bufferFronte = await imageFronte.arrayBuffer();
      const base64Fronte = Buffer.from(bufferFronte).toString('base64');
      imageFronteUrl = `data:${imageFronte.type};base64,${base64Fronte}`;
      console.log('✅ Fronte convertita (length:', imageFronteUrl.length, ')');
    }

    if (imageRetro) {
      console.log('Converting retro...');
      const bufferRetro = await imageRetro.arrayBuffer();
      const base64Retro = Buffer.from(bufferRetro).toString('base64');
      imageRetroUrl = `data:${imageRetro.type};base64,${base64Retro}`;
      console.log('✅ Retro convertita (length:', imageRetroUrl.length, ')');
    }

    // Step 7: Salvataggio nel database
    console.log('💾 Step 7: Salvataggio database...');
    const nuovaEtichetta = await prisma.etichetteUfficiali.create({
      data: {
        nome,
        descrizione,
        denominazione,
        categoria,
        produttore,
        comune,
        regioneProduzione,
        tipoEtichetta: tipoEtichetta || 'etichetta',
        imageFronteUrl,
        imageRetroUrl,
        imageUrl: imageFronteUrl, // Compatibilità
        isAttiva: true
      }
    });

    console.log('✅ Etichetta salvata con ID:', nuovaEtichetta.id);

    return NextResponse.json({
      success: true,
      data: nuovaEtichetta,
      message: 'Etichetta caricata con successo'
    }, { status: 201 });

  } catch (error) {
    console.error('💥 ERRORE nel caricamento etichetta:', error);
    console.error('Stack trace:', error instanceof Error ? error.stack : 'N/A');
    return NextResponse.json({ 
      error: 'Errore durante il caricamento dell\'etichetta',
      details: error instanceof Error ? error.message : 'Errore sconosciuto'
    }, { status: 500 });
  }
}
