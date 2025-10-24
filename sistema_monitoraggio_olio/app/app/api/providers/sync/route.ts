import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { processContentForMonitoring, analyzeSentiment } from '@/lib/keyword-matching';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * Fetch da SerpAPI
 */
async function fetchFromSerpAPI(keyword: string) {
  const apiKey = process.env.SERPAPI_KEY;
  
  if (!apiKey) {
    console.warn('⚠️ SERPAPI_KEY non configurata');
    return [];
  }

  try {
    const params = new URLSearchParams({
      engine: 'google',
      q: keyword,
      tbm: 'nws',
      api_key: apiKey,
      num: '10',
      hl: 'it',
      gl: 'it'
    });

    const response = await fetch(`https://serpapi.com/search?${params}`);
    
    if (!response.ok) {
      throw new Error(`SerpAPI error: ${response.status}`);
    }

    const data = await response.json();
    const newsResults = data.news_results || [];

    return newsResults.map((item: any) => ({
      title: item.title || '',
      snippet: item.snippet || item.title || '',
      url: item.link || '',
      source: item.source || 'Google News',
      date: item.date || new Date().toISOString()
    }));

  } catch (error) {
    console.error('❌ Errore SerpAPI:', error);
    return [];
  }
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
    }

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

    for (const keyword of keywordList) {
      try {
        const newsResults = await fetchFromSerpAPI(keyword);
        
        if (newsResults && newsResults.length > 0) {
          if (!providersUsed.includes('SerpAPI (Google News)')) {
            providersUsed.push('SerpAPI (Google News)');
          }
          
          for (const result of newsResults) {
            try {
              const existing = await prisma.contenutiMonitorati.findFirst({
                where: {
                  url: result.url,
                  testo: result.snippet || result.title
                }
              });

              if (existing) {
                continue;
              }

              const contentAnalysis = processContentForMonitoring(
                result.snippet || result.title,
                keywordList
              );

              if (!contentAnalysis.shouldMonitor) {
                continue;
              }

              const sentimentResult = await analyzeSentiment(result.snippet || result.title);

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
                  metadata: sentimentResult.base && sentimentResult.ai ? {
                    sentimentAnalysis: {
                      base: sentimentResult.base,
                      ai: sentimentResult.ai
                    }
                  } : undefined
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
