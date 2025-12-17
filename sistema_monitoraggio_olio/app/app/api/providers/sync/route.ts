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
      engine: 'google_news',
      q: keyword,
      api_key: apiKey,
      hl: 'it',
      gl: 'it'
    });

    const response = await fetch(`https://serpapi.com/search?${params}`);

    if (!response.ok) {
      throw new Error(`SerpAPI error: ${response.status}`);
    }

    const data = await response.json();

    // Log per debug
    console.log('🔍 SerpAPI response keys:', Object.keys(data));

    // Google News API può restituire news_results direttamente
    // oppure avere una struttura con stories nidificate
    const newsResults = data.news_results || [];

    console.log(`📰 Trovati ${newsResults.length} risultati per keyword: ${keyword}`);

    const results = [];
    for (const item of newsResults) {
      // Alcuni risultati hanno stories nidificate
      if (item.stories && Array.isArray(item.stories)) {
        for (const story of item.stories) {
          results.push({
            title: story.title || '',
            snippet: story.snippet || story.title || '',
            url: story.link || '',
            source: story.source?.name || story.source || 'Google News',
            date: story.date || new Date().toISOString()
          });
        }
      } else {
        // Risultato diretto
        results.push({
          title: item.title || '',
          snippet: item.snippet || item.title || '',
          url: item.link || '',
          source: item.source?.name || item.source || 'Google News',
          date: item.date || new Date().toISOString()
        });
      }
    }

    console.log(`✅ Mappati ${results.length} contenuti`);
    return results;

  } catch (error) {
    console.error('❌ Errore SerpAPI:', error);
    return [];
  }
}

/**
 * Parse date in modo sicuro
 */
function parseDate(dateString: string | undefined): Date {
  if (!dateString) {
    return new Date();
  }

  // Prova a parsare la data
  const parsed = new Date(dateString);
  
  // Se la data è valida, usala
  if (!isNaN(parsed.getTime())) {
    return parsed;
  }

  // Altrimenti usa data corrente
  console.warn(`⚠️ Data invalida: "${dateString}", uso data corrente`);
  return new Date();
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

              // Log per debug del contenuto da salvare
              console.log(`💾 Salvando: "${(result.title || '').substring(0, 50)}..." - Rilevanza: ${contentAnalysis.relevance}`);

              await prisma.contenutiMonitorati.create({
                data: {
                  fonte: result.source || 'Google News',
                  piattaforma: 'news',
                  testo: result.snippet || result.title || 'Contenuto non disponibile',
                  url: result.url || null,
                  sentiment: sentimentResult.sentiment || 'neutrale',
                  sentimentScore: typeof sentimentResult.score === 'number' ? sentimentResult.score : 0,
                  keywords: contentAnalysis.keywords || [],
                  dataPost: parseDate(result.date),
                  rilevanza: Math.round(contentAnalysis.relevance || 0), // Assicura che sia Int
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
