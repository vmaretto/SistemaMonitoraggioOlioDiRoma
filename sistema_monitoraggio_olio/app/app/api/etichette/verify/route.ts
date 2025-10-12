
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { extractTextFromLabel, analyzeConformity, compareLabelsVisually, compareTextWithOfficialLabel } from '@/src/services/openai';

export const dynamic = 'force-dynamic';
export const maxDuration = 120; // Timeout 120 secondi per chiamate OpenAI Vision (OCR + confronti)

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json({ error: 'File immagine richiesto' }, { status: 400 });
    }

    // Converti immagine in base64
    const buffer = await file.arrayBuffer();
    const base64String = Buffer.from(buffer).toString('base64');
    
    // Crea data URL per salvare l'immagine
    const mimeType = file.type || 'image/jpeg';
    const dataUrl = `data:${mimeType};base64,${base64String}`;

    // 1. OCR con OpenAI Vision
    console.log('📸 Step 1: Estrazione testo con OCR...');
    const testoOcr = await extractTextFromLabel(base64String);
    console.log('✅ Testo estratto:', testoOcr.substring(0, 100) + '...');

    // 2. Analisi conformità testuale
    console.log('📋 Step 2: Analisi conformità DOP/IGP...');
    const conformity = await analyzeConformity(testoOcr);
    console.log('✅ Conformità:', conformity.risultato);

    // 3. Cerca etichetta ufficiale corrispondente nel repository
    const etichette = await prisma.etichetteUfficiali.findMany({
      where: { isAttiva: true },
      orderBy: { createdAt: 'desc' }
    });

    let bestMatch: any = null;
    let highestScore = 0;
    let visualComparison: any = null;

    // OTTIMIZZAZIONE: Prima confronto testuale su tutte, poi visual solo sulla migliore
    let textualComparison: any = null;
    
    // Fase 1: Confronto testuale veloce per pre-selezione
    console.log(`🔍 Step 3: Confronto testuale con ${etichette.length} etichette ufficiali...`);
    const textualScores: Array<{ etichetta: any; textComparison: any }> = [];
    
    for (const etichetta of etichette) {
      try {
        const textComparison = await compareTextWithOfficialLabel(testoOcr, {
          nome: etichetta.nome,
          produttore: etichetta.produttore,
          denominazione: etichetta.denominazione,
          regioneProduzione: etichetta.regioneProduzione
        });
        
        textualScores.push({ etichetta, textComparison });
      } catch (error) {
        console.error(`❌ Errore confronto testuale etichetta ${etichetta.id}:`, error);
        continue;
      }
    }

    // Ordina per score testuale e prendi SOLO la migliore candidata
    const topCandidates = textualScores
      .sort((a, b) => b.textComparison.matchScore - a.textComparison.matchScore)
      .slice(0, 1); // RIDOTTO DA 3 A 1 per massima velocità

    console.log(`✅ Migliore match testuale: ${topCandidates[0]?.etichetta.nome || 'Nessuna'} (${topCandidates[0]?.textComparison.matchScore || 0}%)`);
    console.log(`👁️ Step 4: Confronto visivo con la candidata migliore...`);

    // Fase 2: Confronto visivo solo sulle top candidate
    for (const { etichetta, textComparison } of topCandidates) {
      if (!etichetta.imageUrl) continue;

      try {
        // Scarica l'immagine di riferimento
        const refImageResponse = await fetch(etichetta.imageUrl);
        if (!refImageResponse.ok) continue;

        const refBuffer = await refImageResponse.arrayBuffer();
        const refBase64 = Buffer.from(refBuffer).toString('base64');

        // Confronto visivo con OpenAI Vision
        const visualComp = await compareLabelsVisually(base64String, refBase64);

        // Calcola score combinato: 50% testuale + 50% visivo
        const textualScore = textComparison.matchScore;
        const visualScore = visualComp.similarity;
        const combinedScore = (textualScore * 0.5) + (visualScore * 0.5);

        console.log(`✅ Analisi visiva completata: ${visualComp.verdict} (similarità ${visualScore}%)`);
        console.log(`📊 Score finale combinato: ${Math.round(combinedScore)}% (${textualScore}% testo + ${visualScore}% visivo)`);

        if (combinedScore > highestScore) {
          highestScore = combinedScore;
          bestMatch = etichetta;
          visualComparison = visualComp;
          textualComparison = textComparison;
        }
      } catch (error) {
        console.error(`❌ Errore confronto visivo etichetta ${etichetta.id}:`, error);
        continue;
      }
    }

    // Determina risultato finale basato su score combinato
    console.log('🎯 Step 5: Determinazione risultato finale...');
    let risultatoFinale: string;
    if (highestScore >= 80) {
      risultatoFinale = 'conforme';
    } else if (highestScore >= 50) {
      risultatoFinale = visualComparison?.verdict === 'contraffatta' ? 'non_conforme' : 'sospetta';
    } else {
      risultatoFinale = 'non_conforme';
    }

    // Combina violazioni da conformità DOP/IGP, differenze testuali e differenze visive
    const violazioniCombinate = [
      ...conformity.violazioni,
      ...(textualComparison?.differences || []),
      ...(visualComparison?.differences || [])
    ];

    // Salva la verifica nel database con data URL dell'immagine caricata
    console.log(`💾 Step 6: Salvataggio verifica (${risultatoFinale})...`);
    const verifica = await prisma.verificheEtichette.create({
      data: {
        imageUrl: dataUrl,
        testoOcr,
        risultatoMatching: risultatoFinale,
        percentualeMatch: Math.round(highestScore),
        violazioniRilevate: violazioniCombinate,
        note: `Analisi conformità DOP/IGP: ${conformity.note}\n\nConfronto testuale: ${textualComparison?.reasoning || 'Non disponibile'}\n\nAnalisi visiva: ${visualComparison?.explanation || 'Non disponibile'}`,
        stato: 'verificata',
        ...(bestMatch && { etichettaUfficialeId: bestMatch.id })
      }
    });

    // Crea alert se non conforme o sospetto
    if (risultatoFinale === 'non_conforme' || risultatoFinale === 'sospetta') {
      console.log(`🚨 Creazione alert per etichetta ${risultatoFinale}...`);
      await prisma.alert.create({
        data: {
          tipo: 'etichetta_sospetta',
          priorita: risultatoFinale === 'non_conforme' ? 'critico' : 'medio',
          titolo: `Etichetta ${risultatoFinale === 'non_conforme' ? 'non conforme' : 'sospetta'} rilevata`,
          descrizione: `Score combinato: ${Math.round(highestScore)}%. Violazioni: ${violazioniCombinate.slice(0, 3).join(', ')}${violazioniCombinate.length > 3 ? '...' : ''}`,
          fonte: verifica.id
        }
      });
    }

    console.log(`✅ Verifica completata con successo! Risultato: ${risultatoFinale} (${Math.round(highestScore)}%)`);

    return NextResponse.json({
      success: true,
      verifica: {
        id: verifica.id,
        imageUrl: verifica.imageUrl,
        testoOcr,
        risultatoMatching: risultatoFinale,
        percentualeMatch: Math.round(highestScore),
        violazioniRilevate: violazioniCombinate,
        note: verifica.note,
        etichettaUfficiale: bestMatch ? {
          nome: bestMatch.nome,
          imageUrl: bestMatch.imageUrl,
          produttore: bestMatch.produttore,
          denominazione: bestMatch.denominazione
        } : undefined,
        analisiTestuale: textualComparison ? {
          matchScore: textualComparison.matchScore,
          differences: textualComparison.differences,
          reasoning: textualComparison.reasoning,
          conformitaDOP: {
            risultato: conformity.risultato,
            score: conformity.percentualeMatch,
            violazioni: conformity.violazioni
          }
        } : {
          matchScore: conformity.percentualeMatch,
          differences: conformity.violazioni,
          reasoning: conformity.note,
          conformitaDOP: {
            risultato: conformity.risultato,
            score: conformity.percentualeMatch,
            violazioni: conformity.violazioni
          }
        },
        analisiVisiva: visualComparison ? {
          similarity: visualComparison.similarity,
          verdict: visualComparison.verdict,
          differences: visualComparison.differences
        } : undefined
      }
    });

  } catch (error) {
    console.error('Errore nella verifica etichetta:', error);
    return NextResponse.json({ 
      error: 'Errore nella verifica dell\'etichetta',
      details: error instanceof Error ? error.message : 'Errore sconosciuto'
    }, { status: 500 });
  }
}
