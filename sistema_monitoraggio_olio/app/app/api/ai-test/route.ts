
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { aiClient } from '@/lib/ai-client';
import { analyzeSentiment, processContentForMonitoring, processContentForMonitoringAI } from '@/lib/keyword-matching';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * Endpoint per testare e confrontare AI vs logica simulata
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
    }

    const { 
      testo, 
      testType = 'completo' // 'sentiment', 'keywords', 'classification', 'completo'
    } = await request.json();

    if (!testo) {
      return NextResponse.json({ error: 'Testo richiesto per il test' }, { status: 400 });
    }

    // Recupera keywords attive per il test
    const activeKeywords = await prisma.keywords.findMany({
      where: { isActive: true },
      select: { keyword: true }
    });
    const keywordList = activeKeywords.map(k => k.keyword);

    const results: any = {
      input: {
        testo: testo.substring(0, 200) + (testo.length > 200 ? '...' : ''),
        activeKeywords: keywordList,
        testType
      },
      timestamp: new Date().toISOString()
    };

    // Test Sentiment Analysis
    if (testType === 'sentiment' || testType === 'completo') {
      const startTime = Date.now();
      
      try {
        // AI Analysis
        const aiSentiment = await aiClient.analyzeSentiment(testo, 'olio extravergine');
        const aiTime = Date.now() - startTime;

        // Confronto con logica simulata
        const simulatedStart = Date.now();
        const simulatedSentiment = await analyzeSentiment(testo);
        const simulatedTime = Date.now() - simulatedStart;

        results.sentimentAnalysis = {
          ai: {
            result: aiSentiment,
            processingTime: `${aiTime}ms`,
            method: 'AI Intelligente'
          },
          simulated: {
            result: simulatedSentiment,
            processingTime: `${simulatedTime}ms`,
            method: 'Logica Base'
          },
          comparison: {
            sentimentMatch: aiSentiment.sentiment === simulatedSentiment.sentiment,
            scoreDifference: Math.abs(aiSentiment.score - simulatedSentiment.score),
            aiAdvantages: [
              'Comprende contesto e sfumature',
              'Riconosce sarcasmo e ironia', 
              'Fornisce ragionamento',
              'Confidence score accurato'
            ]
          }
        };
      } catch (error) {
        results.sentimentAnalysis = {
          error: `AI non disponibile: ${error instanceof Error ? error.message : 'Errore sconosciuto'}`,
          fallback: await analyzeSentiment(testo)
        };
      }
    }

    // Test Keyword Extraction & Processing
    if (testType === 'keywords' || testType === 'completo') {
      const startTime = Date.now();
      
      try {
        // AI Processing
        const aiResult = await processContentForMonitoringAI(testo, keywordList);
        const aiTime = Date.now() - startTime;

        // Confronto con logica base
        const simulatedStart = Date.now();
        const simulatedResult = processContentForMonitoring(testo, keywordList);
        const simulatedTime = Date.now() - simulatedStart;

        results.keywordProcessing = {
          ai: {
            result: aiResult,
            processingTime: `${aiTime}ms`,
            method: 'AI + Analisi Semantica'
          },
          simulated: {
            result: simulatedResult,
            processingTime: `${simulatedTime}ms`,
            method: 'Regex Pattern Matching'
          },
          comparison: {
            keywordCountDifference: aiResult.keywords.length - simulatedResult.keywords.length,
            relevanceScoreDifference: aiResult.relevance - simulatedResult.relevance,
            additionalKeywords: aiResult.keywords.filter(k => !simulatedResult.keywords.includes(k)),
            aiAdvantages: [
              'Trova sinonimi e varianti',
              'Comprende contesto semantico',
              'Identifica termini correlati',
              'Calcolo rilevanza intelligente'
            ]
          }
        };
      } catch (error) {
        results.keywordProcessing = {
          error: `AI non disponibile: ${error instanceof Error ? error.message : 'Errore sconosciuto'}`,
          fallback: processContentForMonitoring(testo, keywordList)
        };
      }
    }

    // Test Classification
    if (testType === 'classification' || testType === 'completo') {
      try {
        const classification = await aiClient.classifyContent(testo, keywordList);
        results.contentClassification = {
          ai: {
            result: classification,
            method: 'AI Content Classification',
            capabilities: [
              'Identifica tipo di contenuto',
              'Calcola priorità automaticamente',
              'Valuta rischio reputazionale',
              'Suggerisce azioni necessarie'
            ]
          },
          simulated: {
            available: false,
            note: 'Classificazione automatica disponibile solo con AI'
          }
        };
      } catch (error) {
        results.contentClassification = {
          error: `AI Classification non disponibile: ${error instanceof Error ? error.message : 'Errore sconosciuto'}`
        };
      }
    }

    // Summary
    results.summary = {
      aiAvailable: process.env.ABACUSAI_API_KEY ? true : false,
      aiModel: 'gpt-4o-mini',
      recommendations: [
        'AI fornisce analisi più accurate e contestuali',
        'Fallback automatico garantisce sempre funzionalità base',
        'Processo ibrido: AI quando disponibile, simulato come backup',
        'Metadata AI salvati per analisi avanzate future'
      ]
    };

    return NextResponse.json({
      success: true,
      testResults: results,
      message: `Test ${testType} completato con successo`
    });

  } catch (error) {
    console.error('Errore nel test AI:', error);
    return NextResponse.json({ 
      error: 'Errore durante il test AI',
      details: error instanceof Error ? error.message : 'Errore sconosciuto'
    }, { status: 500 });
  }
}

/**
 * Test rapido per verificare disponibilità AI
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
    }

    const hasApiKey = !!process.env.ABACUSAI_API_KEY;
    
    let aiStatus = 'non_configurata';
    let testResult = null;

    if (hasApiKey) {
      try {
        // Test rapido AI
        const testSentiment = await aiClient.analyzeSentiment(
          'Test rapido: questo olio è fantastico e di ottima qualità!', 
          'test'
        );
        aiStatus = 'funzionante';
        testResult = testSentiment;
      } catch (error) {
        aiStatus = 'errore';
        testResult = error instanceof Error ? error.message : 'Errore sconosciuto';
      }
    }

    return NextResponse.json({
      aiStatus,
      hasApiKey,
      testResult,
      capabilities: {
        sentimentAnalysis: hasApiKey ? 'AI Avanzata' : 'Simulata',
        keywordExtraction: hasApiKey ? 'AI Semantica' : 'Regex Base',
        contentClassification: hasApiKey ? 'AI Intelligente' : 'Non Disponibile',
        fallbackMode: 'Sempre Attivo'
      },
      configuration: {
        apiKeyConfigured: hasApiKey,
        model: 'gpt-4o-mini',
        endpoint: 'https://api.abacus.ai/chatllm/v1'
      }
    });

  } catch (error) {
    console.error('Errore verifica AI:', error);
    return NextResponse.json({ 
      error: 'Errore nella verifica AI',
      details: error instanceof Error ? error.message : 'Errore sconosciuto'
    }, { status: 500 });
  }
}
