import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { analyzeSentiment as analyzeSentimentOpenAI } from '@/src/services/openai';
import { analyzeSentimentBase } from '@/lib/keyword-matching';

export const dynamic = 'force-dynamic';

// Max contenuti per batch per evitare timeout Vercel (60s)
const MAX_BATCH_SIZE = 30;

/**
 * Ri-analizza i contenuti con OpenAI per sentiment più accurato
 * Processa solo contenuti senza analisi AI esistente
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
    }

    const startTime = Date.now();

    // Recupera contenuti senza analisi AI nel metadata
    // Prisma non supporta query JSON profonde su tutti i DB, quindi filtriamo in memoria
    const allContenuti = await prisma.contenutiMonitorati.findMany({
      orderBy: { createdAt: 'desc' }
    });

    // Filtra contenuti che non hanno analisi AI
    const contenutiDaAnalizzare = allContenuti.filter(c => {
      const metadata = c.metadata as any;
      return !metadata?.sentimentAnalysis?.ai;
    });

    const totalCount = allContenuti.length;
    const pendingCount = contenutiDaAnalizzare.length;
    const alreadyAnalyzedCount = totalCount - pendingCount;

    // Se non ci sono contenuti da analizzare
    if (pendingCount === 0) {
      return NextResponse.json({
        success: true,
        message: 'Tutti i contenuti sono già stati analizzati con AI',
        total: totalCount,
        analyzed: 0,
        skipped: alreadyAnalyzedCount,
        errors: 0,
        remaining: 0,
        duration: `${Date.now() - startTime}ms`
      });
    }

    // Prendi solo un batch per evitare timeout
    const batch = contenutiDaAnalizzare.slice(0, MAX_BATCH_SIZE);

    let analyzedCount = 0;
    let errorCount = 0;

    // Processa ogni contenuto
    for (const contenuto of batch) {
      try {
        // Analisi AI con OpenAI
        const aiResult = await analyzeSentimentOpenAI(contenuto.testo);

        // Analisi BASE per confronto
        const baseResult = analyzeSentimentBase(contenuto.testo);

        // Prepara metadata aggiornato
        const existingMetadata = (contenuto.metadata as any) || {};
        const updatedMetadata = {
          ...existingMetadata,
          sentimentAnalysis: {
            base: {
              sentiment: baseResult.sentiment,
              score: baseResult.score,
              confidence: baseResult.confidence,
              method: baseResult.method
            },
            ai: {
              sentiment: aiResult.sentiment,
              score: aiResult.score,
              confidence: aiResult.confidence,
              method: 'openai-gpt-4-turbo',
              analyzedAt: new Date().toISOString()
            }
          }
        };

        // Aggiorna il contenuto con i nuovi dati
        await prisma.contenutiMonitorati.update({
          where: { id: contenuto.id },
          data: {
            // Usa il sentiment AI come primario
            sentiment: aiResult.sentiment,
            sentimentScore: aiResult.score,
            metadata: updatedMetadata
          }
        });

        analyzedCount++;
        console.log(`✅ Contenuto ${contenuto.id} analizzato: ${aiResult.sentiment} (score: ${aiResult.score})`);

      } catch (error) {
        errorCount++;
        console.error(`❌ Errore analisi contenuto ${contenuto.id}:`, error instanceof Error ? error.message : 'Unknown');
      }
    }

    const remainingCount = pendingCount - analyzedCount;
    const duration = Date.now() - startTime;

    return NextResponse.json({
      success: true,
      message: remainingCount > 0
        ? `Batch completato. Rimangono ${remainingCount} contenuti da analizzare.`
        : 'Tutti i contenuti sono stati analizzati!',
      total: totalCount,
      analyzed: analyzedCount,
      skipped: alreadyAnalyzedCount,
      errors: errorCount,
      remaining: remainingCount,
      batchSize: MAX_BATCH_SIZE,
      duration: `${duration}ms`
    });

  } catch (error) {
    console.error('Errore nella ri-analisi AI:', error);
    return NextResponse.json({
      error: 'Errore interno del server',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * GET - Stato dell'analisi AI
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
    }

    const allContenuti = await prisma.contenutiMonitorati.findMany({
      select: { id: true, metadata: true }
    });

    let withAI = 0;
    let withoutAI = 0;

    allContenuti.forEach(c => {
      const metadata = c.metadata as any;
      if (metadata?.sentimentAnalysis?.ai) {
        withAI++;
      } else {
        withoutAI++;
      }
    });

    return NextResponse.json({
      total: allContenuti.length,
      analyzedWithAI: withAI,
      pendingAIAnalysis: withoutAI,
      percentComplete: allContenuti.length > 0
        ? Math.round((withAI / allContenuti.length) * 100)
        : 100
    });

  } catch (error) {
    console.error('Errore nel recupero stato analisi:', error);
    return NextResponse.json({ error: 'Errore interno del server' }, { status: 500 });
  }
}
