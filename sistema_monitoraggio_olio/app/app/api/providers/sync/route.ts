import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { searchWithSerpAPI } from '@/lib/serpapi';
import { processContentForMonitoring, analyzeSentiment } from '@/lib/keyword-matching';

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // Timeout 60 secondi per Vercel

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
    }

    // 1. Recupera keywords attive
    const activeKeywords = await prisma.keywords.findMany({
      where: { isActive: true },
      select: { keyword: true }
    });

    if (activeKeywords.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Nessuna keyword attiva',
        newContents: 0,
        providersUsed: 'N/A'
      });
    }

    const keywordList = activeKeywords.map(k => k.keyword);
    let totalNewContents = 0;
    const providersUsed: string[] = [];
    const errors: string[] = [];

    // 2. Per ogni keyword, cerca con SerpAPI
    for (const keyword of keywordList) {
      try {
        // Cerca su Google News
        const newsResults = await searchWithSerpAPI(keyword, 'google_news');
        
        if (newsResults && newsResults.length > 0) {
          providersUsed.push('SerpAPI (Google News)');
          
          // Salva i risultati
          for (const result of newsResults) {
            try {
              // Verifica se esiste già (per evitare duplicati)
              const existing = await prisma.contenutiMonitorati.findFirst({
                where: {
                  url: result.url,
                  testo: result.snippet || result.title
                }
              });

              if (existing) {
                continue; // Salta se esiste già
              }

              // Analizza rilevanza e sentiment
              const contentAnalysis = processContentForMonitoring(
                result.snippet || result.title,
                keywordList
              );

              if (!contentAnalysis.shouldMonitor) {
                continue; // Salta se non rilevante
              }

              const sentimentResult = await analyzeSentiment(result.snippet || result.title);

              // Crea nuovo contenuto
              await prisma.contenutiMonitorati.create({
                data: {
                  fonte: result.source || 'Google News',
                  piattaforma: 'news',
                  testo: result.snippet || result.title,
                  url: result.url,
                  sentiment: sentimentResult.sentiment,
                  sentimentScore: sentimentResult.score,
                  keywords: contentAnalysis.keywords,
                  dataPost: result.date ? new Date(result.date) : new Date(),
                  rilevanza: contentAnalysis.relevance,
                  metadata: {
                    sentimentAnalysis: {
                      base: sentimentResult.base,
                      ai: sentimentResult.ai
                    }
                  }
                }
              });

              totalNewContents++;
            } catch (itemError) {
              console.error('Errore salvando contenuto:', itemError);
            }
          }
        }
      } catch (providerError) {
        console.error(`Errore con keyword "${keyword}":`, providerError);
        errors.push(`${keyword}: ${providerError instanceof Error ? providerError.message : 'Errore sconosciuto'}`);
      }
    }

    const duration = `${((Date.now() - startTime) / 1000).toFixed(1)}s`;

    return NextResponse.json({
      success: true,
      newContents: totalNewContents,
      providersUsed: providersUsed.length > 0 ? providersUsed.join(', ') : 'Nessuno',
      duration,
      keywordsProcessed: keywordList.length,
      errors: errors.length > 0 ? errors : undefined
    });

  } catch (error) {
    console.error('Errore sync providers:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Errore nella sincronizzazione',
      details: 'Verifica le chiavi API in Vercel → Settings → Environment Variables'
    }, { status: 500 });
  }
}
