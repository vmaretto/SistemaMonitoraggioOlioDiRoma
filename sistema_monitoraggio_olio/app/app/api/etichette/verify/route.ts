
import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { extractTextFromLabel, analyzeConformity, compareLabelsVisually, compareTextWithOfficialLabel } from '@/src/services/openai';

export const dynamic = 'force-dynamic';
export const maxDuration = 120; // Timeout 120 secondi per chiamate OpenAI Vision (OCR + confronti)

// Helper per inviare eventi SSE
function sendSSE(controller: ReadableStreamDefaultController, event: { type: string; message: string; data?: any; progress?: number }) {
  const encoder = new TextEncoder();
  const message = `data: ${JSON.stringify(event)}\n\n`;
  controller.enqueue(encoder.encode(message));
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  
  if (!session) {
    return new Response(JSON.stringify({ error: 'Non autorizzato' }), { 
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const formData = await request.formData();
        const file = formData.get('file') as File;
        
        if (!file) {
          sendSSE(controller, { type: 'error', message: 'File immagine richiesto' });
          controller.close();
          return;
        }

        sendSSE(controller, { type: 'progress', message: '📸 Estrazione testo dall\'immagine con OCR...', progress: 10 });

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

        sendSSE(controller, { type: 'progress', message: '📋 Analisi conformità DOP/IGP...', progress: 25, data: { testoOcr: testoOcr.substring(0, 200) } });

        // 2. Analisi conformità testuale
        console.log('📋 Step 2: Analisi conformità DOP/IGP...');
        const conformity = await analyzeConformity(testoOcr);
        console.log('✅ Conformità:', conformity.risultato);

        sendSSE(controller, { type: 'progress', message: '⚡ Confronto testuale parallelo con etichette ufficiali...', progress: 40 });

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
        
        // Fase 1: Confronto testuale veloce per pre-selezione (PARALLELIZZATO)
        console.log(`🔍 Step 3: Confronto testuale PARALLELO con ${etichette.length} etichette ufficiali...`);
        
        // Parallelizza tutti i confronti testuali con Promise.all
        const textualScoresPromises = etichette.map(async (etichetta) => {
          try {
            const textComparison = await compareTextWithOfficialLabel(testoOcr, {
              nome: etichetta.nome,
              produttore: etichetta.produttore,
              denominazione: etichetta.denominazione,
              regioneProduzione: etichetta.regioneProduzione
            });
            
            return { etichetta, textComparison };
          } catch (error) {
            console.error(`❌ Errore confronto testuale etichetta ${etichetta.id}:`, error);
            return null;
          }
        });
        
        // Attendi tutti i confronti in parallelo e filtra i null
        const textualScoresRaw = await Promise.all(textualScoresPromises);
        const textualScores = textualScoresRaw.filter((score): score is { etichetta: any; textComparison: any } => score !== null);

        // Ordina per score testuale e prendi SOLO la migliore candidata
        const topCandidates = textualScores
          .sort((a, b) => b.textComparison.matchScore - a.textComparison.matchScore)
          .slice(0, 1); // RIDOTTO DA 3 A 1 per massima velocità

        const bestTextMatch = topCandidates[0];
        console.log(`✅ Migliore match testuale: ${bestTextMatch?.etichetta.nome || 'Nessuna'} (${bestTextMatch?.textComparison.matchScore || 0}%)`);
        
        sendSSE(controller, { 
          type: 'progress', 
          message: `👁️ Confronto visivo con etichetta migliore...`, 
          progress: 65,
          data: { bestMatch: bestTextMatch?.etichetta.nome }
        });

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

        sendSSE(controller, { type: 'progress', message: '💾 Salvataggio verifica e creazione alert...', progress: 85 });

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
            ...(bestMatch && { etichettaRiferimento: bestMatch.id })
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

        // Invia evento di completamento con risultato finale
        sendSSE(controller, {
          type: 'complete',
          message: '✅ Verifica completata!',
          progress: 100,
          data: {
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
              analisiTestuale: {
                risultato: conformity.risultato,
                score: textualComparison?.matchScore || conformity.percentualeMatch,
                violazioni: violazioniCombinate
              },
              analisiVisiva: visualComparison ? {
                similarity: visualComparison.similarity,
                verdict: visualComparison.verdict,
                differences: visualComparison.differences
              } : undefined
            }
          }
        });

        controller.close();

      } catch (error) {
        console.error('Errore nella verifica etichetta:', error);
        sendSSE(controller, { 
          type: 'error', 
          message: error instanceof Error ? error.message : 'Errore sconosciuto' 
        });
        controller.close();
      }
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
