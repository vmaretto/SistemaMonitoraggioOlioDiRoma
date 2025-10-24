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
      const response = await googleNews.search({ q: 'olio DOP Roma', size: 5 });
      results.providers.serpapi_google_news = {
        status: 'success',
        resultsCount: response.results.length,
        sampleTitle: response.results[0]?.title || 'N/A',
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
      const response = await reddit.search({ q: 'olive oil DOP', size: 5 });
      results.providers.serpapi_reddit = {
        status: 'success',
        resultsCount: response.results.length,
        sampleTitle: response.results[0]?.title || 'N/A',
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
      const response = await webzio.search({ q: 'olio extravergine', size: 5 });
      results.providers.webzio = {
        status: 'success',
        resultsCount: response.results.length,
        sampleTitle: response.results[0]?.title || 'N/A',
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
