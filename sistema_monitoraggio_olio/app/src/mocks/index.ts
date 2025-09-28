/**
 * Mock data centralizzato per tutti i provider
 * Gestisce il caricamento dei fixture JSON e la simulazione delle API
 */

import googleNewsFixture from './serpapi.google_news.fixture.json';
import redditFixture from './serpapi.reddit.fixture.json';
import webzioFixture from './webzio.fixture.json';

export type MockFixture = {
  [key: string]: any;
};

/**
 * Registry dei fixture mock per provider
 */
export const mockFixtures: Record<string, MockFixture> = {
  'serpapi:google_news': googleNewsFixture as MockFixture,
  'serpapi:reddit': redditFixture as MockFixture,
  'webzio': webzioFixture as MockFixture
};

/**
 * Simula latenza API con delay randomico
 */
export async function simulateApiDelay(minMs: number = 100, maxMs: number = 500): Promise<void> {
  const delay = Math.random() * (maxMs - minMs) + minMs;
  return new Promise(resolve => setTimeout(resolve, delay));
}

/**
 * Recupera dati mock per un provider specifico
 */
export function getMockData(providerId: string, page: string = 'page1'): any {
  const fixture = mockFixtures[providerId];
  if (!fixture || !fixture[page]) {
    console.warn(`Mock data not found for provider ${providerId}, page ${page}`);
    return null;
  }
  return fixture[page];
}

/**
 * Simula paginazione mock
 */
export function getMockPage(
  providerId: string, 
  currentPage: string = 'page1'
): { data: any; hasNext: boolean; nextPage?: string } {
  const data = getMockData(providerId, currentPage);
  
  if (!data) {
    return { data: null, hasNext: false };
  }

  // Determina se c'è una pagina successiva
  const pageNumber = parseInt(currentPage.replace('page', '')) || 1;
  const nextPageKey = `page${pageNumber + 1}`;
  const fixture = mockFixtures[providerId];
  const hasNext = fixture && fixture[nextPageKey] !== undefined;
  
  return {
    data,
    hasNext,
    nextPage: hasNext ? nextPageKey : undefined
  };
}

/**
 * Filtra risultati mock per query
 */
export function filterMockResults(results: any[], query?: string): any[] {
  if (!query || !results) return results;
  
  const lowerQuery = query.toLowerCase();
  
  return results.filter(item => {
    // Per Google News
    if (item.title && item.snippet) {
      return item.title.toLowerCase().includes(lowerQuery) || 
             item.snippet.toLowerCase().includes(lowerQuery);
    }
    
    // Per Reddit
    if (item.title && item.snippet) {
      return item.title.toLowerCase().includes(lowerQuery) || 
             item.snippet.toLowerCase().includes(lowerQuery);
    }
    
    // Per Webz.io
    if (item.title && item.text) {
      return item.title.toLowerCase().includes(lowerQuery) || 
             item.text.toLowerCase().includes(lowerQuery);
    }
    
    return false;
  });
}

/**
 * Simula errori API per test di resilienza
 */
export function simulateApiError(errorRate: number = 0.1): void {
  if (Math.random() < errorRate) {
    throw new Error('Simulated API error for testing');
  }
}

/**
 * Genera timestamp mock realistici
 */
export function generateMockTimestamp(daysAgo: number = 0, hoursAgo: number = 0): string {
  const now = new Date();
  const timestamp = new Date(
    now.getTime() - (daysAgo * 24 * 60 * 60 * 1000) - (hoursAgo * 60 * 60 * 1000)
  );
  return timestamp.toISOString();
}

/**
 * Utility per logging mock mode
 */
export function logMockMode(providerId: string, operation: string): void {
  console.log(`🔄 [MOCK MODE] ${providerId} - ${operation}`);
}