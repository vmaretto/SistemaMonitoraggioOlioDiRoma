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
    
    // Filtro categoria (DOP, IGP, Biologici)
    if (categoria && categoria !== 'all' && categoria !== 'Tutte le categorie') {
      where.categoria = categoria;
    }
    
    // Filtro denominazione
    if (denominazione && denominazione !== 'all' && denominazione !== 'Tutte le denominazioni') {
      where.denominazione = denominazione;
    }
    
    // Filtro attiva/inattiva
    if (isAttiva === 'true') where.isAttiva = true;
    if (isAttiva === 'false') where.isAttiva = false;
    
    // Ricerca testuale
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
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
    }

    // Verifica ruolo (solo admin e direttore possono caricare etichette ufficiali)
    if (session.user.role !== 'direttore' && session.user.role !== 'admin') {
      return NextResponse.json({ 
        error: 'Non hai i permessi per caricare etichette ufficiali' 
      }, { status: 403 });
    }

    const formData = await request.formData();
    
    // Estrai i campi dal form
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

    // Validazione campi obbligatori
    if (!nome || !denominazione || !categoria || !regioneProduzione) {
      return NextResponse.json({
        error: 'Campi obbligatori mancanti',
        required: ['nome', 'denominazione', 'categoria', 'regioneProduzione']
      }, { status: 400 });
    }

    // Validazione categoria
    const categorieValide = ['DOP', 'IGP', 'Biologici', 'ufficiale'];
    if (!categorieValide.includes(categoria)) {
      return NextResponse.json({
        error: 'Categoria non valida',
        validCategories: categorieValide
      }, { status: 400 });
    }

    // Validazione tipo etichetta
    const tipiValidi = ['etichetta', 'contenitore'];
    if (tipoEtichetta && !tipiValidi.includes(tipoEtichetta)) {
      return NextResponse.json({
        error: 'Tipo etichetta non valido',
        validTypes: tipiValidi
      }, { status: 400 });
    }

    // Validazione file immagini
    if (!imageFronte) {
      return NextResponse.json({
        error: 'Immagine fronte obbligatoria'
      }, { status: 400 });
    }

    // Validazione dimensione file (max 10MB per file)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (imageFronte && imageFronte.size > maxSize) {
      return NextResponse.json({
        error: 'Immagine fronte troppo grande (max 10MB)'
      }, { status: 400 });
    }
    if (imageRetro && imageRetro.size > maxSize) {
      return NextResponse.json({
        error: 'Immagine retro troppo grande (max 10MB)'
      }, { status: 400 });
    }

    // Validazione tipo MIME
    const tipiAccettati = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (imageFronte && !tipiAccettati.includes(imageFronte.type)) {
      return NextResponse.json({
        error: 'Formato immagine fronte non valido (usa JPG, PNG, GIF, WEBP)'
      }, { status: 400 });
    }
    if (imageRetro && !tipiAccettati.includes(imageRetro.type)) {
      return NextResponse.json({
        error: 'Formato immagine retro non valido (usa JPG, PNG, GIF, WEBP)'
      }, { status: 400 });
    }

    // Converti immagini in base64 Data URLs
    let imageFronteUrl: string | null = null;
    let imageRetroUrl: string | null = null;

    if (imageFronte) {
      const bufferFronte = await imageFronte.arrayBuffer();
      const base64Fronte = Buffer.from(bufferFronte).toString('base64');
      imageFronteUrl = `data:${imageFronte.type};base64,${base64Fronte}`;
    }

    if (imageRetro) {
      const bufferRetro = await imageRetro.arrayBuffer();
      const base64Retro = Buffer.from(bufferRetro).toString('base64');
      imageRetroUrl = `data:${imageRetro.type};base64,${base64Retro}`;
    }

    // Crea l'etichetta nel database
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
        imageUrl: imageFronteUrl, // Mantieni compatibilità con campo deprecato
        isAttiva: true
      }
    });

    return NextResponse.json({
      success: true,
      data: nuovaEtichetta,
      message: 'Etichetta caricata con successo'
    }, { status: 201 });

  } catch (error) {
    console.error('Errore nel caricamento etichetta:', error);
    return NextResponse.json({ 
      error: 'Errore durante il caricamento dell\'etichetta',
      details: error instanceof Error ? error.message : 'Errore sconosciuto'
    }, { status: 500 });
  }
}
