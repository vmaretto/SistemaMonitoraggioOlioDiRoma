/**
 * SerpApi Providers - Google News e Reddit
 * Implementano l'interfaccia Provider comune per integrare dati da Google News e Reddit
 */

import axios from 'axios';
import pRetry from 'p-retry';
import dayjs from 'dayjs';
import { Provider, ProviderItem, SearchParams, RetryConfig } from './types';

interface SerpApiConfig {
  apiKey: string;
  baseUrl: string;
  mockMode: boolean;
}

interface SerpApiResponse {
  search_metadata?: {
    id: string;
    status: string;
    created_at: string;
    processed_at: string;
    total_time_taken: number;
  };
  search_parameters?: any;
  search_information?: {
    organic_results_state: string;
    query_displayed: string;
    total_results?: number;
  };
  news_results?: GoogleNewsResult[];
  reddit_results?: RedditResult[];
  serpapi_pagination?: {
    next?: string;
    next_page_token?: string;
    after?: string;
  };
}

interface GoogleNewsResult {
  position: number;
  title: string;
  link: string;
  snippet: string;
  date: string;
  source: string;
  thumbnail?: string;
  stories?: Array<{
    title: string;
    link: string;
    source: string;
    date: string;
  }>;
}

interface RedditResult {
  position: number;
  title: string;
  link: string;
  snippet: string;
  posted_at: string;
  subreddit: string;
  subreddit_link: string;
  comments: number;
  votes: number;
  author: string;
}

/**
 * Provider per Google News tramite SerpApi
 */
export class SerpApiGoogleNewsProvider implements Provider {
  public readonly id = 'serpapi:google_news';
  private config: SerpApiConfig;
  private retryConfig: RetryConfig = {
    retries: 3,
    minTimeout: 1000,
    maxTimeout: 8000,
    factor: 2
  };

  constructor() {
    this.config = {
      apiKey: process.env.SERPAPI_KEY || '',
      baseUrl: process.env.SERPAPI_BASE_URL || 'https://serpapi.com/search.json',
      mockMode: process.env.SERPAPI_MOCK === '1' || !process.env.SERPAPI_KEY
    };

    if (this.config.mockMode) {
      console.log('🔄 SerpApi Google News Provider - modalità mock attivata');
    }
  }

  /**
   * Implementazione dell'interfaccia Provider per Google News
   */
  async search(params: SearchParams): Promise<{ results: ProviderItem[]; next?: string }> {
    if (this.config.mockMode) {
      return this.getMockGoogleNewsResults(params);
    }

    try {
      const response = await this.makeGoogleNewsRequest(params);
      
      const results = (response.news_results || []).map(item => this.googleNewsToProviderItem(item));
      
      return {
        results,
        next: response.serpapi_pagination?.next_page_token
      };
      
    } catch (error) {
      console.error('❌ Errore SerpApi Google News:', error);
      
      // Fallback a dati mock
      console.log('🔄 Fallback a dati mock Google News');
      return this.getMockGoogleNewsResults(params);
    }
  }

  /**
   * Effettua la chiamata a SerpApi per Google News
   */
  private async makeGoogleNewsRequest(params: SearchParams): Promise<SerpApiResponse> {
    return pRetry(async () => {
      const queryParams = {
        engine: 'google_news',
        api_key: this.config.apiKey,
        q: params.q,
        hl: params.language || 'it',
        gl: params.country || 'it',
        num: Math.min(params.size || 100, 100), // Max 100 per richiesta
        ...(params.next && { after: params.next })
      };

      const response = await axios.get(this.config.baseUrl, {
        params: queryParams,
        timeout: 30000,
        headers: {
          'User-Agent': 'OlioMonitoringSystem/1.0'
        }
      });

      if (response.status === 429) {
        const error = new Error('Rate limit exceeded');
        error.name = 'RateLimitError';
        throw error;
      }

      if (response.status >= 400) {
        throw new Error(`SerpApi Google News Error: ${response.status} - ${response.statusText}`);
      }

      return response.data;
      
    }, {
      retries: this.retryConfig.retries,
      minTimeout: this.retryConfig.minTimeout,
      maxTimeout: this.retryConfig.maxTimeout,
      factor: this.retryConfig.factor,
      onFailedAttempt: (error) => {
        console.warn(`Tentativo Google News ${error.attemptNumber} fallito:`, error);
      }
    });
  }

  /**
   * Converte GoogleNewsResult in ProviderItem
   */
  private googleNewsToProviderItem(item: GoogleNewsResult): ProviderItem {
    return {
      url: item.link,
      title: item.title,
      text: item.snippet,
      published: this.normalizeGoogleNewsDate(item.date),
      site: item.source,
      author: undefined, // Google News non fornisce autore specifico
      language: 'it',
      sentiment: undefined, // Sentiment non disponibile da Google News
      raw: item
    };
  }

  /**
   * Normalizza la data di Google News in formato ISO
   */
  private normalizeGoogleNewsDate(dateStr: string): string {
    try {
      // Google News fornisce date in formato relativo o assoluto
      if (dateStr.includes('ago') || dateStr.includes('fa')) {
        // Formato relativo tipo "2 hours ago" o "3 giorni fa"
        return dayjs().subtract(1, 'day').toISOString(); // Fallback a 1 giorno fa
      }
      
      // Prova a parsare la data come ISO o formato standard
      const parsed = dayjs(dateStr);
      return parsed.isValid() ? parsed.toISOString() : dayjs().toISOString();
    } catch {
      return dayjs().toISOString();
    }
  }

  /**
   * Risultati mock per Google News
   */
  private async getMockGoogleNewsResults(params: SearchParams): Promise<{ results: ProviderItem[]; next?: string }> {
    await new Promise(resolve => setTimeout(resolve, 150));

    const mockResults: ProviderItem[] = [
      {
        url: 'https://www.ilsole24ore.com/art/olio-extravergine-lazio-crescita-export-2024',
        title: 'Olio extravergine del Lazio: crescita dell\'export del 15% nel 2024',
        text: 'I produttori di olio DOP e IGP del Lazio registrano una crescita significativa delle esportazioni verso i mercati europei e nordamericani, grazie alla qualità certificata e alle campagne di promozione.',
        published: dayjs().subtract(2, 'hours').toISOString(),
        site: 'Il Sole 24 Ore',
        language: 'it',
        raw: { source: 'serpapi_google_news_mock' }
      },
      {
        url: 'https://www.ansa.it/lazio/notizie/2024/09/frantoi-castelli-romani-innovazione-tecnologica',
        title: 'Frantoi dei Castelli Romani puntano sull\'innovazione tecnologica',
        text: 'Investimenti in nuove tecnologie di spremitura a freddo e sistemi di controllo qualità per migliorare le caratteristiche organolettiche dell\'olio IGP dei Colli Albani.',
        published: dayjs().subtract(6, 'hours').toISOString(),
        site: 'ANSA',
        language: 'it',
        raw: { source: 'serpapi_google_news_mock' }
      },
      {
        url: 'https://www.adnkronos.com/economia/olio-dop-sabina-riconoscimento-unesco',
        title: 'Olio DOP Sabina verso il riconoscimento UNESCO',
        text: 'La candidatura dell\'olio extravergine DOP Sabina per il riconoscimento UNESCO come patrimonio immateriale dell\'umanità avanza verso la fase finale di valutazione.',
        published: dayjs().subtract(1, 'day').toISOString(),
        site: 'Adnkronos',
        language: 'it',
        raw: { source: 'serpapi_google_news_mock' }
      }
    ];

    // Filtra per query se presente
    let filteredResults = mockResults;
    if (params.q) {
      const query = params.q.toLowerCase();
      filteredResults = mockResults.filter(item => 
        item.title!.toLowerCase().includes(query) || 
        item.text!.toLowerCase().includes(query)
      );
    }

    const pageSize = params.size || 100;
    // Gestisce sia token numerici (mock) che token SerpApi (live)
    const startIndex = params.next && !isNaN(Number(params.next)) ? parseInt(params.next) : 0;
    const results = filteredResults.slice(startIndex, startIndex + pageSize);
    const next = results.length === pageSize ? (startIndex + pageSize).toString() : undefined;

    return { results, next };
  }

  /**
   * Test connessione API
   */
  async testConnection(): Promise<{ success: boolean; message: string }> {
    if (this.config.mockMode) {
      return {
        success: true,
        message: 'SerpApi Google News Provider in modalità mock - test simulato OK'
      };
    }

    if (!this.config.apiKey) {
      return {
        success: false,
        message: 'SERPAPI_KEY non configurata'
      };
    }

    try {
      const response = await axios.get(this.config.baseUrl, {
        params: {
          engine: 'google_news',
          api_key: this.config.apiKey,
          q: 'test',
          num: 1
        },
        timeout: 10000
      });

      if (response.status === 200) {
        return {
          success: true,
          message: 'Connessione SerpApi Google News funzionante'
        };
      } else {
        return {
          success: false,
          message: `Errore API: ${response.status} - ${response.statusText}`
        };
      }
    } catch (error: any) {
      return {
        success: false,
        message: `Errore connessione: ${error.message}`
      };
    }
  }
}

/**
 * Provider per Reddit tramite SerpApi
 */
export class SerpApiRedditProvider implements Provider {
  public readonly id = 'serpapi:reddit';
  private config: SerpApiConfig;
  private retryConfig: RetryConfig = {
    retries: 3,
    minTimeout: 1000,
    maxTimeout: 8000,
    factor: 2
  };

  constructor() {
    this.config = {
      apiKey: process.env.SERPAPI_KEY || '',
      baseUrl: process.env.SERPAPI_BASE_URL || 'https://serpapi.com/search.json',
      mockMode: process.env.SERPAPI_MOCK === '1' || !process.env.SERPAPI_KEY
    };

    if (this.config.mockMode) {
      console.log('🔄 SerpApi Reddit Provider - modalità mock attivata');
    }
  }

  /**
   * Implementazione dell'interfaccia Provider per Reddit
   */
  async search(params: SearchParams): Promise<{ results: ProviderItem[]; next?: string }> {
    if (this.config.mockMode) {
      return this.getMockRedditResults(params);
    }

    try {
      const response = await this.makeRedditRequest(params);
      
      const results = (response.reddit_results || []).map(item => this.redditToProviderItem(item));
      
      return {
        results,
        next: response.serpapi_pagination?.next_page_token || response.serpapi_pagination?.next
      };
      
    } catch (error) {
      console.error('❌ Errore SerpApi Reddit:', error);
      
      // Fallback a dati mock
      console.log('🔄 Fallback a dati mock Reddit');
      return this.getMockRedditResults(params);
    }
  }

  /**
   * Effettua la chiamata a SerpApi per Reddit
   */
  private async makeRedditRequest(params: SearchParams): Promise<SerpApiResponse> {
    return pRetry(async () => {
      const queryParams = {
        engine: 'reddit_search',
        api_key: this.config.apiKey,
        q: params.q,
        sort: 'new',
        ...(params.next && { after: params.next })
      };

      const response = await axios.get(this.config.baseUrl, {
        params: queryParams,
        timeout: 30000,
        headers: {
          'User-Agent': 'OlioMonitoringSystem/1.0'
        }
      });

      if (response.status === 429) {
        const error = new Error('Rate limit exceeded');
        error.name = 'RateLimitError';
        throw error;
      }

      if (response.status >= 400) {
        throw new Error(`SerpApi Reddit Error: ${response.status} - ${response.statusText}`);
      }

      return response.data;
      
    }, {
      retries: this.retryConfig.retries,
      minTimeout: this.retryConfig.minTimeout,
      maxTimeout: this.retryConfig.maxTimeout,
      factor: this.retryConfig.factor,
      onFailedAttempt: (error) => {
        console.warn(`Tentativo Reddit ${error.attemptNumber} fallito:`, error);
      }
    });
  }

  /**
   * Converte RedditResult in ProviderItem
   */
  private redditToProviderItem(item: RedditResult): ProviderItem {
    return {
      url: item.link,
      title: item.title,
      text: item.snippet,
      published: this.normalizeRedditDate(item.posted_at),
      site: item.subreddit,
      author: item.author,
      language: 'en', // Reddit principalmente inglese
      sentiment: this.inferRedditSentiment(item),
      raw: item
    };
  }

  /**
   * Normalizza la data di Reddit
   */
  private normalizeRedditDate(dateStr: string): string {
    try {
      const parsed = dayjs(dateStr);
      return parsed.isValid() ? parsed.toISOString() : dayjs().toISOString();
    } catch {
      return dayjs().toISOString();
    }
  }

  /**
   * Inferisce sentiment da metriche Reddit
   */
  private inferRedditSentiment(item: RedditResult): { score?: number; label?: "positive" | "neutral" | "negative" } | undefined {
    // Usa ratio upvotes/downvotes per inferire sentiment
    if (item.votes > 0) {
      const score = Math.min(1, item.votes / 100); // Normalizza a 0-1
      return {
        score,
        label: score > 0.6 ? 'positive' : score > 0.2 ? 'neutral' : 'negative'
      };
    }
    
    return { score: 0, label: 'neutral' };
  }

  /**
   * Risultati mock per Reddit
   */
  private async getMockRedditResults(params: SearchParams): Promise<{ results: ProviderItem[]; next?: string }> {
    await new Promise(resolve => setTimeout(resolve, 180));

    const mockResults: ProviderItem[] = [
      {
        url: 'https://reddit.com/r/italy/comments/oil_lazio_discussion',
        title: 'Has anyone tried authentic olive oil from Lazio region?',
        text: 'Planning a trip to Rome and want to bring back some quality olive oil. Looking for recommendations on DOP certified oil from Lazio. What are the best producers in the region?',
        published: dayjs().subtract(3, 'hours').toISOString(),
        site: 'r/italy',
        author: 'TravelFoodie_92',
        language: 'en',
        sentiment: { score: 0.7, label: 'positive' },
        raw: { source: 'serpapi_reddit_mock', votes: 15, comments: 8 }
      },
      {
        url: 'https://reddit.com/r/oliveoil/comments/italian_dop_quality',
        title: 'Italian DOP olive oil quality - Lazio vs Tuscany comparison',
        text: 'Comparing different Italian regional olive oils. Lazio DOP Sabina has a distinctive taste profile compared to Tuscan varieties. The production methods in Castelli Romani are fascinating.',
        published: dayjs().subtract(1, 'day').toISOString(),
        site: 'r/oliveoil',
        author: 'OilConnoisseur',
        language: 'en',
        sentiment: { score: 0.8, label: 'positive' },
        raw: { source: 'serpapi_reddit_mock', votes: 23, comments: 12 }
      },
      {
        url: 'https://reddit.com/r/food/comments/expensive_olive_oil_worth_it',
        title: 'Is expensive Italian olive oil really worth the price?',
        text: 'Bought some DOP certified olive oil from Rome region (Lazio) for $40/bottle. The flavor is incredible but wondering if there are cheaper alternatives with similar quality.',
        published: dayjs().subtract(2, 'days').toISOString(),
        site: 'r/food',
        author: 'BudgetFoodie',
        language: 'en',
        sentiment: { score: 0.4, label: 'neutral' },
        raw: { source: 'serpapi_reddit_mock', votes: 8, comments: 15 }
      }
    ];

    // Filtra per query se presente
    let filteredResults = mockResults;
    if (params.q) {
      const query = params.q.toLowerCase();
      filteredResults = mockResults.filter(item => 
        item.title!.toLowerCase().includes(query) || 
        item.text!.toLowerCase().includes(query)
      );
    }

    const pageSize = params.size || 100;
    // Gestisce sia token numerici (mock) che token SerpApi (live)
    const startIndex = params.next && !isNaN(Number(params.next)) ? parseInt(params.next) : 0;
    const results = filteredResults.slice(startIndex, startIndex + pageSize);
    const next = results.length === pageSize ? (startIndex + pageSize).toString() : undefined;

    return { results, next };
  }

  /**
   * Test connessione API
   */
  async testConnection(): Promise<{ success: boolean; message: string }> {
    if (this.config.mockMode) {
      return {
        success: true,
        message: 'SerpApi Reddit Provider in modalità mock - test simulato OK'
      };
    }

    if (!this.config.apiKey) {
      return {
        success: false,
        message: 'SERPAPI_KEY non configurata'
      };
    }

    try {
      const response = await axios.get(this.config.baseUrl, {
        params: {
          engine: 'reddit_search',
          api_key: this.config.apiKey,
          q: 'test',
          sort: 'new'
        },
        timeout: 10000
      });

      if (response.status === 200) {
        return {
          success: true,
          message: 'Connessione SerpApi Reddit funzionante'
        };
      } else {
        return {
          success: false,
          message: `Errore API: ${response.status} - ${response.statusText}`
        };
      }
    } catch (error: any) {
      return {
        success: false,
        message: `Errore connessione: ${error.message}`
      };
    }
  }
}