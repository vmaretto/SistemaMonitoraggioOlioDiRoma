

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { processContentForMonitoring, processContentForMonitoringAI, analyzeSentiment } from '@/lib/keyword-matching';

export const dynamic = 'force-dynamic';

/**
 * Aggiorna tutti i contenuti esistenti con matching keywords e rilevanza ricalcolata
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
    }

    // Recupera tutte le keywords attive
    const activeKeywords = await prisma.keywords.findMany({
      where: { isActive: true },
      select: { keyword: true }
    });

    const keywordList = activeKeywords.map(k => k.keyword);

    if (keywordList.length === 0) {
      return NextResponse.json({ 
        message: 'Nessuna keyword attiva trovata',
        updated: 0
      });
    }

    // Recupera tutti i contenuti
    const contenuti = await prisma.contenutiMonitorati.findMany();
    
    let updatedCount = 0;
    let processedCount = 0;

    // Processa ogni contenuto con AI (con fallback)
    for (const contenuto of contenuti) {
      try {
        // Prova prima con AI
        const aiResult = await processContentForMonitoringAI(contenuto.testo, keywordList);
        const sentimentResult = await analyzeSentiment(contenuto.testo);
        
        // Aggiorna solo se ci sono cambiamenti significativi
        const needsUpdate = 
          JSON.stringify(aiResult.keywords.sort()) !== JSON.stringify(contenuto.keywords.sort()) ||
          Math.abs(aiResult.relevance - contenuto.rilevanza) > 5 ||
          sentimentResult.sentiment !== contenuto.sentiment ||
          Math.abs(sentimentResult.score - contenuto.sentimentScore) > 0.1;

        if (needsUpdate) {
          const updateData: any = {
            keywords: aiResult.keywords,
            rilevanza: aiResult.relevance,
            sentiment: sentimentResult.sentiment,
            sentimentScore: sentimentResult.score
          };

          // Se AI ha fornito insights aggiuntivi, salvali come metadata
          if (aiResult.aiInsights) {
            updateData.metadata = {
              aiAnalysis: {
                confidence: aiResult.aiInsights.sentiment?.confidence,
                reasoning: aiResult.aiInsights.sentiment?.reasoning,
                classification: aiResult.aiInsights.classification,
                lastAiUpdate: new Date().toISOString()
              }
            };
          }

          await prisma.contenutiMonitorati.update({
            where: { id: contenuto.id },
            data: updateData
          });
          updatedCount++;
        }
        
      } catch (error) {
        console.warn(`⚠️ AI processing fallito per contenuto ${contenuto.id}, uso logica base:`, error instanceof Error ? error.message : 'Errore sconosciuto');
        
        // Fallback alla logica base
        const result = processContentForMonitoring(contenuto.testo, keywordList);
        const sentimentResult = await analyzeSentiment(contenuto.testo);
        
        const needsUpdate = 
          JSON.stringify(result.keywords.sort()) !== JSON.stringify(contenuto.keywords.sort()) ||
          Math.abs(result.relevance - contenuto.rilevanza) > 5 ||
          sentimentResult.sentiment !== contenuto.sentiment ||
          Math.abs(sentimentResult.score - contenuto.sentimentScore) > 0.1;

        if (needsUpdate) {
          await prisma.contenutiMonitorati.update({
            where: { id: contenuto.id },
            data: {
              keywords: result.keywords,
              rilevanza: result.relevance,
              sentiment: sentimentResult.sentiment,
              sentimentScore: sentimentResult.score
            }
          });
          updatedCount++;
        }
      }
      
      processedCount++;
    }

    return NextResponse.json({ 
      success: true,
      message: `Processati ${processedCount} contenuti, aggiornati ${updatedCount}`,
      processed: processedCount,
      updated: updatedCount,
      activeKeywords: keywordList.length
    });

  } catch (error) {
    console.error('Errore nell\'aggiornamento keywords:', error);
    return NextResponse.json({ error: 'Errore interno del server' }, { status: 500 });
  }
}

/**
 * Simula l'arrivo di un nuovo contenuto e lo processa
 */
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
    }

    const { 
      testo, 
      fonte, 
      piattaforma, 
      url, 
      autore 
    } = await request.json();

    if (!testo) {
      return NextResponse.json({ error: 'Testo richiesto' }, { status: 400 });
    }

    // Recupera keywords attive
    const activeKeywords = await prisma.keywords.findMany({
      where: { isActive: true },
      select: { keyword: true }
    });

    const keywordList = activeKeywords.map(k => k.keyword);
    
    try {
      // Prova prima con AI
      const aiResult = await processContentForMonitoringAI(testo, keywordList);
      const sentimentResult = await analyzeSentiment(testo);
      
      // Se non trova keywords rilevanti, non salvare
      if (!aiResult.shouldMonitor) {
        return NextResponse.json({ 
          message: 'Contenuto non rilevante per le keywords attive (analizzato con AI)',
          keywords: keywordList,
          aiInsights: aiResult.aiInsights,
          shouldMonitor: false
        });
      }

      // Prepara i dati del contenuto
      const contenutoData: any = {
        fonte: fonte || 'unknown',
        piattaforma: piattaforma || 'unknown',
        testo,
        url,
        autore,
        sentiment: sentimentResult.sentiment,
        sentimentScore: sentimentResult.score,
        keywords: aiResult.keywords,
        dataPost: new Date(),
        rilevanza: aiResult.relevance
      };

      // Aggiungi metadata AI se disponibili
      if (aiResult.aiInsights) {
        contenutoData.metadata = {
          aiAnalysis: {
            confidence: aiResult.aiInsights.sentiment?.confidence,
            reasoning: aiResult.aiInsights.sentiment?.reasoning,
            classification: aiResult.aiInsights.classification,
            createdWithAI: true,
            aiProcessingDate: new Date().toISOString()
          }
        };
      }

      // Crea il nuovo contenuto
      const nuovoContenuto = await prisma.contenutiMonitorati.create({
        data: contenutoData
      });

      return NextResponse.json({ 
        success: true,
        contenuto: nuovoContenuto,
        message: `Nuovo contenuto aggiunto con AI: ${aiResult.keywords.length} keywords trovate`,
        aiPowered: true,
        aiInsights: aiResult.aiInsights
      });

    } catch (error) {
      console.warn('⚠️ AI processing fallito per nuovo contenuto, uso logica base:', error instanceof Error ? error.message : 'Errore sconosciuto');
      
      // Fallback alla logica base
      const result = processContentForMonitoring(testo, keywordList);
      const sentimentResult = await analyzeSentiment(testo);
      
      // Se non trova keywords rilevanti, non salvare
      if (!result.shouldMonitor) {
        return NextResponse.json({ 
          message: 'Contenuto non rilevante per le keywords attive',
          keywords: keywordList,
          shouldMonitor: false
        });
      }

      // Crea il nuovo contenuto
      const nuovoContenuto = await prisma.contenutiMonitorati.create({
        data: {
          fonte: fonte || 'unknown',
          piattaforma: piattaforma || 'unknown',
          testo,
          url,
          autore,
          sentiment: sentimentResult.sentiment,
          sentimentScore: sentimentResult.score,
          keywords: result.keywords,
          dataPost: new Date(),
          rilevanza: result.relevance
        }
      });

      return NextResponse.json({ 
        success: true,
        contenuto: nuovoContenuto,
        message: `Nuovo contenuto aggiunto: ${result.keywords.length} keywords matchate`,
        aiPowered: false
      });
    }

  } catch (error) {
    console.error('Errore nella creazione contenuto:', error);
    return NextResponse.json({ error: 'Errore interno del server' }, { status: 500 });
  }
}
