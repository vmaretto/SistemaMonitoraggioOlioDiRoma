import { NextRequest, NextResponse } from 'next/server';
import { createDefaultRegistry } from '@/src/integrations/registry';

/**
 * Test endpoint per provider con mock
 * Non richiede database
 */
export async function GET(request: NextRequest) {
  try {
    const registry = createDefaultRegistry();

    const results: any = {
      timestamp: new Date().toISOString(),
      providers: {},
    };

    // Test SerpAPI Google News
    try {
      const googleNews = registry.getProvider('serpapi_google_news');
      const searchResults = await googleNews.search('olio DOP Roma', { limit: 5 });
      results.providers.serpapi_google_news = {
        status: 'success',
        resultsCount: searchResults.length,
        sampleTitle: searchResults[0]?.title || 'N/A',
      };
    } catch (error: any) {
      results.providers.serpapi_google_news = {
        status: 'error',
        error: error.message,
      };
    }

    // Test SerpAPI Reddit
    try {
      const reddit = registry.getProvider('serpapi_reddit');
      const searchResults = await reddit.search('olive oil DOP', { limit: 5 });
      results.providers.serpapi_reddit = {
        status: 'success',
        resultsCount: searchResults.length,
        sampleTitle: searchResults[0]?.title || 'N/A',
      };
    } catch (error: any) {
      results.providers.serpapi_reddit = {
        status: 'error',
        error: error.message,
      };
    }

    // Test Webz.io
    try {
      const webzio = registry.getProvider('webzio');
      const searchResults = await webzio.search('olio extravergine', { limit: 5 });
      results.providers.webzio = {
        status: 'success',
        resultsCount: searchResults.length,
        sampleTitle: searchResults[0]?.title || 'N/A',
      };
    } catch (error: any) {
      results.providers.webzio = {
        status: 'error',
        error: error.message,
      };
    }

    return NextResponse.json(results, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      {
        error: 'Provider test failed',
        message: error.message,
        stack: error.stack,
      },
      { status: 500 }
    );
  }
}
