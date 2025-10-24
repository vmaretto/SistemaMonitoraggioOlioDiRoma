import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { extractTextFromLabel, analyzeConformity, compareLabelsVisually, compareTextWithOfficialLabel } from '@/src/services/openai';
import { lookup } from 'dns/promises';
import * as ipaddr from 'ipaddr.js';

export const dynamic = 'force-dynamic';
export const maxDuration = 300; // Aumentato a 5 minuti (300 secondi)

// Helper per inviare eventi SSE
function sendSSE(controller: ReadableStreamDefaultController, event: { type: string; message: string; data?: any; progress?: number }) {
  const encoder = new TextEncoder();
  const message = `data: ${JSON.stringify(event)}\n\n`;
  console.log('🔔 Invio evento SSE:', event.type, event.message, event.progress);
  controller.enqueue(encoder.encode(message));
}

// Helper per validare IP contro SSRF usando ipaddr.js (RFC compliant)
function isPrivateOrReservedIP(ip: string): boolean {
  try {
    const addr = ipaddr.process(ip);
    const range = addr.range();
    
    const dangerousRanges = [
      'private', 'loopback', 'linkLocal', 'broadcast', 'reserved', 'carrierGradeNat', 'uniqueLocal'
    ];
    
    return dangerousRanges.includes(range);
  } catch {
    return true;
  }
}

// Helper per validare URL e risolvere DNS
async function validateAndResolveURL(url: string): Promise<{ valid: boolean; error?: string }> {
  try {
    const urlObj = new URL(url);
    
    if (!['http:', 'https:'].includes(urlObj.protocol)) {
      return { valid: false, error: 'Solo protocolli HTTP/HTTPS permessi' };
    }
    
    if (urlObj.username || urlObj.password) {
      return { valid: false, error: 'URL con credenziali non permesso' };
    }
    
    if (/^\d+\.\d+\.\d+\.\d+$/.test(urlObj.hostname) || urlObj.hostname.includes(':')) {
      return { valid: false, error: 'URL deve usare nome dominio, non IP diretto' };
    }
    
    try {
      const addresses = await lookup(urlObj.hostname, { all: true });
      
      for (const addr of addresses) {
        if (isPrivateOrReservedIP(addr.address)) {
          return { valid: false, error: `URL risolve a indirizzo privato/riservato: ${addr.address}` };
        }
      }
    } catch (dnsError) {
      return { valid: false, error: 'Impossibile risolvere hostname' };
    }
    
    return { valid: true };
  } catch {
    return { valid: false, error: 'URL malformato' };
  }
}

export async function POST(request: NextRequest) {
  const globalStartTime = Date.now();
  console.log(`\n${'='.repeat(80)}`);
  console.log(`🚀 NUOVA VERIFICA ETICHETTA - ${new Date().toISOString()}`);
  console.log(`${'='.repeat(80)}\n`);
  
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
        const file = formData.get('file') as File | null;
        const contenutoMonitoratoId = formData.get('contenutoMonitoratoId') as string | null;
        
        let base64String: string;
        let dataUrl: string;
        let mimeType = 'image/jpeg';

        // SECURITY: Due modalità di verifica separate
        if (contenutoMonitoratoId) {
          // Modalità 1: Verifica da contenuto monitorato
          const contenuto = await prisma.contenutiMonitorati.findUnique({
            where: { id: contenutoMonitoratoId },
            select: { imageUrl: true }
          });

          if (!contenuto || !contenuto.imageUrl) {
            sendSSE(controller, { type: 'error', message: 'Contenuto non trovato o senza immagine' });
            controller.close();
            return;
          }

          const dbImageUrl = contenuto.imageUrl;
          console.log('✅ URL immagine verificato dal database:', dbImageUrl);

          const validation = await validateAndResolveURL(dbImageUrl);
          if (!validation.valid) {
            sendSSE(controller, { type: 'error', message: validation.error || 'URL non valido' });
            controller.close();
            return;
          }

          sendSSE(controller, { type: 'progress', message: '🌐 Download immagine da URL...', progress: 5 });
          
          const imageResponse = await fetch(dbImageUrl, { redirect: 'manual' });
          
          if (imageResponse.status >= 300 && imageResponse.status < 400) {
            sendSSE(controller, { type: 'error', message: 'URL con redirect non permesso' });
            controller.close();
            return;
          }
          
          if (!imageResponse.ok) {
            sendSSE(controller, { type: 'error', message: 'Impossibile scaricare l\'immagine' });
            controller.close();
            return;
          }

          const buffer = await imageResponse.arrayBuffer();
          
          if (buffer.byteLength > 10 * 1024 * 1024) {
            sendSSE(controller, { type: 'error', message: 'Immagine troppo grande (max 10MB)' });
            controller.close();
            return;
          }

          base64String = Buffer.from(buffer).toString('base64');
          mimeType = imageResponse.headers.get('content-type') || 'image/jpeg';
          dataUrl = `data:${mimeType};base64,${base64String}`;
          
          console.log('✅ Immagine scaricata, dimensione:', buffer.byteLength, 'bytes');
        } else if (file) {
          // Modalità 2: Verifica manuale con file upload
          const buffer = await file.arrayBuffer();
          base64String = Buffer.from(buffer).toString('base64');
          mimeType = file.type || 'image/jpeg';
          dataUrl = `data:${mimeType};base64,${base64String}`;
          console.log('✅ File caricato, dimensione:', buffer.byteLength, 'bytes');
        } else {
          sendSSE(controller, { type: 'error', message: 'File immagine richiesto' });
          controller.close();
          return;
        }

        // Check timeout rimanente
        const elapsedPreOCR = Date.now() - globalStartTime;
        console.log(`⏱️ Tempo trascorso prima OCR: ${elapsedPreOCR}ms`);
        
        if (elapsedPreOCR > 240000) { // 4 minuti
          console.error('⚠️ Timeout imminente prima di OCR, aborto');
          sendSSE(controller, { type: 'error', message: 'Timeout: preparazione immagine troppo lenta' });
          controller.close();
          return;
        }

        sendSSE(controller, { type: 'progress', message: '📸 Estrazione testo dall\'immagine con OCR...', progress: 10 });

        // 1. OCR con OpenAI Vision
        const ocrStart = Date.now();
        console.log('📸 Step 1: Estrazione testo con OCR...');
        const testoOcr = await extractTextFromLabel(base64String);
        const ocrDuration = Date.now() - ocrStart;
        console.log(`✅ Testo estratto in ${ocrDuration}ms:`, testoOcr.substring(0, 100) + '...');

        sendSSE(controller, { 
          type: 'progress', 
          message: '📋 Analisi conformità DOP/IGP...', 
          progress: 25, 
          data: { testoOcr: testoOcr.substring(0, 200), ocrDuration } 
        });

        // 2. Analisi conformità testuale
        const conformityStart = Date.now();
        console.log('📋 Step 2: Analisi conformità DOP/IGP...');
        const conformity = await analyzeConformity(testoOcr);
        const conformityDuration = Date.now() - conformityStart;
        console.log(`✅ Conformità in ${conformityDuration}ms:`, conformity.risultato);

        sendSSE(controller, { type: 'progress', message: '⚡ Confronto testuale parallelo con etichette ufficiali...', progress: 40 });

        // 3. Cerca etichetta ufficiale corrispondente
        const etichette = await prisma.etichetteUfficiali.findMany({
          where: { isAttiva: true },
          orderBy: { createdAt: 'desc' }
        });

        console.log(`📚 Trovate ${etichette.length} etichette ufficiali attive nel repository`);

        let bestMatch: any = null;
        let highestScore = 0;
        let visualComparison: any = null;
        let textualComparison: any = null;
        
        // Check timeout prima del confronto testuale
        const elapsedPreText = Date.now() - globalStartTime;
        console.log(`⏱️ Tempo trascorso prima confronto testuale: ${elapsedPreText}ms`);
        
        if (elapsedPreText > 250000) { // 4 min 10 sec
          console.error('⚠️ Timeout imminente prima confronto testuale, skip');
          sendSSE(controller, { type: 'error', message: 'Timeout: analisi preliminari troppo lente' });
          controller.close();
          return;
        }

        // Fase 1: Confronto testuale PARALLELO
        const textStart = Date.now();
        console.log(`🔍 Step 3: Confronto testuale PARALLELO con ${etichette.length} etichette...`);
        
        const textualScoresPromises = etichette.map(async (etichetta) => {
          try {
            const textComparison = await compareTextWithOfficialLabel(testoOcr, {
              nome: etichetta.nome,
              produttore: etichetta.produttore,
              denominazione: etichetta.denominazione,
              regioneProduzione: etichetta.regioneProduzione,
              comune: etichetta.comune,
              tipoEtichetta: etichetta.tipoEtichetta
            });
            
            return { etichetta, textComparison };
          } catch (error) {
            console.error(`❌ Errore confronto testuale etichetta ${etichetta.id}:`, error);
            return null;
          }
        });
        
        const textualScoresRaw = await Promise.all(textualScoresPromises);
        const textualScores = textualScoresRaw.filter((score): score is { etichetta: any; textComparison: any } => score !== null);
        const textDuration = Date.now() - textStart;

        console.log(`✅ Confronto testuale completato in ${textDuration}ms`);
        console.log(`   Risultati validi: ${textualScores.length}/${etichette.length}`);

        // Ordina per score testuale
        const topCandidates = textualScores
          .sort((a, b) => b.textComparison.matchScore - a.textComparison.matchScore)
          .slice(0, 3); // TOP 3 candidate per confronto visivo

        if (topCandidates.length === 0) {
          console.warn('⚠️ Nessuna candidata trovata nel confronto testuale');
          sendSSE(controller, { type: 'error', message: 'Nessuna etichetta corrispondente trovata' });
          controller.close();
          return;
        }

        const bestTextMatch = topCandidates[0];
        console.log(`✅ Migliore match testuale: ${bestTextMatch.etichetta.nome} (${bestTextMatch.textComparison.matchScore}%)`);
        console.log(`   Reasoning: ${bestTextMatch.textComparison.reasoning.substring(0, 100)}...`);
        
        sendSSE(controller, { 
          type: 'progress', 
          message: `👁️ Confronto visivo con ${topCandidates.length} candidate...`, 
          progress: 65,
          data: { 
            bestMatch: bestTextMatch.etichetta.nome,
            textScore: bestTextMatch.textComparison.matchScore,
            textDuration
          }
        });

        // Check timeout prima del confronto visivo
        const elapsedPreVisual = Date.now() - globalStartTime;
        console.log(`⏱️ Tempo trascorso prima confronto visivo: ${elapsedPreVisual}ms`);
        
        if (elapsedPreVisual > 260000) { // 4 min 20 sec
          console.warn('⚠️ Timeout imminente, uso solo risultato testuale');
          
          // Usa solo risultato testuale
          bestMatch = bestTextMatch.etichetta;
          textualComparison = bestTextMatch.textComparison;
          highestScore = textualComparison.matchScore;
          
          console.log(`📊 Score finale (solo testuale): ${highestScore}%`);
        } else {
          // Fase 2: Confronto visivo sulle top candidate
          const visualStart = Date.now();
          console.log(`👁️ Step 4: Confronto visivo con le ${topCandidates.length} migliori candidate...`);

          for (const { etichetta, textComparison } of topCandidates) {
            const imageToCompare = etichetta.imageFronteUrl || etichetta.imageUrl;
            if (!imageToCompare) {
              console.log(`   ⏭️ Skip ${etichetta.nome}: nessuna immagine disponibile`);
              continue;
            }

            try {
              console.log(`   🔍 Confronto visivo con: ${etichetta.nome}`);
              
              const refImageResponse = await fetch(imageToCompare);
              if (!refImageResponse.ok) {
                console.log(`   ❌ Impossibile scaricare immagine di riferimento`);
                continue;
              }

              const refBuffer = await refImageResponse.arrayBuffer();
              const refBase64 = Buffer.from(refBuffer).toString('base64');

              const visualComp = await compareLabelsVisually(base64String, refBase64);

              const textualScore = textComparison.matchScore;
              const visualScore = visualComp.similarity;
              const combinedScore = (textualScore * 0.5) + (visualScore * 0.5);

              console.log(`   ✅ Analisi visiva: ${visualComp.verdict} (${visualScore}%)`);
              console.log(`   📊 Score combinato: ${Math.round(combinedScore)}% (${textualScore}% testo + ${visualScore}% visivo)`);

              if (combinedScore > highestScore) {
                highestScore = combinedScore;
                bestMatch = etichetta;
                visualComparison = visualComp;
                textualComparison = textComparison;
              }
            } catch (error) {
              console.error(`   ❌ Errore confronto visivo ${etichetta.nome}:`, error);
              continue;
            }
            
            // Check timeout durante loop visivo
            const elapsedDuringVisual = Date.now() - globalStartTime;
            if (elapsedDuringVisual > 280000) { // 4 min 40 sec
              console.warn(`   ⚠️ Timeout imminente, interrompo confronti visivi`);
              break;
            }
          }

          const visualDuration = Date.now() - visualStart;
          console.log(`✅ Confronti visivi completati in ${visualDuration}ms`);
        }

        sendSSE(controller, { type: 'progress', message: '💾 Salvataggio verifica...', progress: 85 });

        // Determina risultato finale
        console.log('🎯 Step 5: Determinazione risultato finale...');
        let risultatoFinale: string;
        if (highestScore >= 80) {
          risultatoFinale = 'conforme';
        } else if (highestScore >= 50) {
          risultatoFinale = visualComparison?.verdict === 'contraffatta' ? 'non_conforme' : 'sospetta';
        } else {
          risultatoFinale = 'non_conforme';
        }

        const violazioniCombinate = [
          ...conformity.violazioni,
          ...(textualComparison?.differences || []),
          ...(visualComparison?.differences || [])
        ];

        // Salva verifica
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
            ...(bestMatch && { etichettaRiferimento: bestMatch.id }),
            ...(contenutoMonitoratoId && { contenutoMonitoratoId })
          }
        });

        // Crea alert se necessario
        if (risultatoFinale === 'non_conforme' || risultatoFinale === 'sospetta') {
          console.log(`🚨 Creazione alert per etichetta ${risultatoFinale}...`);
          await prisma.alert.create({
            data: {
              tipo: 'etichetta_sospetta',
              priorita: risultatoFinale === 'non_conforme' ? 'critico' : 'medio',
              titolo: `Etichetta ${risultatoFinale === 'non_conforme' ? 'non conforme' : 'sospetta'} rilevata`,
              descrizione: `Score: ${Math.round(highestScore)}%. Violazioni: ${violazioniCombinate.slice(0, 3).join(', ')}${violazioniCombinate.length > 3 ? '...' : ''}`,
              fonte: verifica.id
            }
          });
        }

        const totalDuration = Date.now() - globalStartTime;
        console.log(`\n✅ Verifica completata in ${totalDuration}ms! Risultato: ${risultatoFinale} (${Math.round(highestScore)}%)\n`);
        console.log(`${'='.repeat(80)}\n`);

        // Invia evento di completamento
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
              } : undefined,
              performance: {
                totalDuration,
                ocrDuration: ocrDuration,
                conformityDuration: conformityDuration,
                textDuration: textDuration || 0,
                visualDuration: visualComparison ? (Date.now() - globalStartTime - ocrDuration - conformityDuration - (textDuration || 0)) : 0
              }
            }
          }
        });

        controller.close();

      } catch (error) {
        const totalDuration = Date.now() - globalStartTime;
        console.error(`\n❌ Errore nella verifica dopo ${totalDuration}ms:`, error);
        console.error('Stack:', error instanceof Error ? error.stack : 'No stack');
        console.log(`${'='.repeat(80)}\n`);
        
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
