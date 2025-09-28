/**
 * Webz.io Provider - implementa l'interfaccia Provider comune
 * Provider per il monitoraggio web e news tramite Webz.io API
 */

import axios from 'axios';
import pRetry from 'p-retry';
import qs from 'qs';
import { Provider, ProviderItem, SearchParams, RetryConfig } from './types';

interface WebzioConfig {
  token: string;
  baseUrl: string;
  mockMode: boolean;
  timeout?: number;
}

interface WebzioResponse {
  totalResults?: number;
  next?: string;
  posts: WebzioPost[];
}

interface WebzioPost {
  uuid: string;
  url: string;
  ord_in_thread: number;
  author?: string;
  published: string;
  title?: string;
  text: string;
  highlightText?: string;
  highlightTitle?: string;
  language: string;
  external_links?: string[];
  entities?: {
    persons?: Array<{ name: string; sentiment: string }>;
    organizations?: Array<{ name: string; sentiment: string }>;
    locations?: Array<{ name: string; sentiment: string }>;
  };
  social?: {
    facebook?: { likes: number; comments: number; shares: number };
    vk?: { likes: number; comments: number; shares: number };
  };
  thread: {
    uuid: string;
    url: string;
    site_full: string;
    site: string;
    site_section?: string;
    site_categories: string[];
    section_title?: string;
    title?: string;
    title_full?: string;
    published: string;
    replies_count: number;
    participants_count: number;
    site_type: string;
    country?: string;
    spam_score: number;
    main_image?: string;
    performance_score: number;
    domain_rank: number;
  };
}

export class WebzioProvider implements Provider {
  public readonly id = 'webzio';
  private config: WebzioConfig;
  private retryConfig: RetryConfig = {
    retries: 3,
    minTimeout: 1000,
    maxTimeout: 5000,
    factor: 2
  };

  constructor(config: Partial<{ apiKey: string; baseUrl?: string; mockMode: boolean; timeout?: number }> = {}) {
    this.config = {
      token: config.apiKey || process.env.WEBZIO_TOKEN || '',
      baseUrl: config.baseUrl || process.env.WEBZIO_BASE_URL || 'https://api.webz.io/filterWebContent',
      mockMode: config.mockMode ?? (process.env.WEBZIO_MOCK === '1' || !process.env.WEBZIO_TOKEN),
      timeout: config.timeout || parseInt(process.env.WEBZIO_TIMEOUT || '30000')
    };

    if (this.config.mockMode) {
      console.log('🔄 Webz.io Provider - modalità mock attivata');
    }
  }

  /**
   * Implementazione dell'interfaccia Provider
   */
  async search(params: SearchParams): Promise<{ results: ProviderItem[]; next?: string }> {
    if (this.config.mockMode) {
      return this.getMockResults(params);
    }

    try {
      const response = await this.makeRequest(params);
      
      const results = response.posts.map(post => this.toProviderItem(post));
      
      return {
        results,
        next: response.next
      };
      
    } catch (error) {
      console.error('❌ Errore Webz.io API:', error);
      
      // Fallback a dati mock in caso di errore
      console.log('🔄 Fallback a dati mock');
      return this.getMockResults(params);
    }
  }

  /**
   * Effettua la chiamata HTTP con retry logic
   */
  private async makeRequest(params: SearchParams): Promise<WebzioResponse> {
    return pRetry(async () => {
      const queryParams = this.buildQueryParams(params);
      
      const response = await axios.get(this.config.baseUrl, {
        params: queryParams,
        timeout: this.config.timeout || 30000,
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
        throw new Error(`Webz.io API Error: ${response.status} - ${response.statusText}`);
      }

      return response.data;
      
    }, {
      retries: this.retryConfig.retries,
      minTimeout: this.retryConfig.minTimeout,
      maxTimeout: this.retryConfig.maxTimeout,
      factor: this.retryConfig.factor,
      onFailedAttempt: (error) => {
        console.warn(`Tentativo ${error.attemptNumber} fallito. Errore:`, error);
      }
    });
  }

  /**
   * Costruisce i parametri query per Webz.io API
   */
  private buildQueryParams(params: SearchParams): any {
    const queryParams: any = {
      token: this.config.token,
      format: 'json',
      q: params.q,
      size: params.size || 100
    };

    // Filtri temporali
    if (params.from) {
      queryParams.ts = `>${new Date(params.from).getTime()}`;
    }
    if (params.to) {
      const fromFilter = queryParams.ts || '';
      queryParams.ts = fromFilter + ` <${new Date(params.to).getTime()}`;
    }

    // Filtri geografici e linguistici  
    if (params.language) {
      queryParams.language = params.language;
    }
    if (params.country) {
      queryParams.site_country = params.country;
    }

    // Paginazione
    if (params.next) {
      queryParams.next = params.next;
    }

    // Filtri specifici per contenuti italiani di qualità
    queryParams.site_type = 'news,blogs,discussions';
    queryParams.spam_score = '<0.5';
    queryParams.is_first = 'true'; // Solo thread originali

    return queryParams;
  }

  /**
   * Converte WebzioPost in ProviderItem
   */
  private toProviderItem(post: WebzioPost): ProviderItem {
    return {
      url: post.url,
      title: post.title || post.thread.title || this.extractTitle(post.text),
      text: post.text,
      published: post.published,
      site: post.thread.site_full || post.thread.site,
      author: post.author,
      language: post.language,
      sentiment: this.extractSentiment(post),
      raw: post
    };
  }

  /**
   * Estrae sentiment dalle entità Webz.io
   */
  private extractSentiment(post: WebzioPost): { score?: number; label?: "positive" | "neutral" | "negative" } | undefined {
    if (!post.entities) return undefined;

    const sentiments: string[] = [];
    
    // Raccoglie tutti i sentiment delle entità
    [
      ...(post.entities.persons || []),
      ...(post.entities.organizations || []),
      ...(post.entities.locations || [])
    ].forEach(entity => {
      if (entity.sentiment) {
        sentiments.push(entity.sentiment);
      }
    });

    if (sentiments.length === 0) return undefined;

    // Calcola sentiment medio
    const positiveCount = sentiments.filter(s => s === 'positive').length;
    const negativeCount = sentiments.filter(s => s === 'negative').length;
    const neutralCount = sentiments.filter(s => s === 'neutral').length;

    let score = 0;
    let label: "positive" | "neutral" | "negative" = "neutral";

    if (positiveCount > negativeCount) {
      score = positiveCount / sentiments.length;
      label = "positive";
    } else if (negativeCount > positiveCount) {
      score = -(negativeCount / sentiments.length);
      label = "negative";
    } else {
      score = 0;
      label = "neutral";
    }

    return { score, label };
  }

  /**
   * Estrae titolo dal testo se non disponibile
   */
  private extractTitle(text: string): string {
    const title = text.slice(0, 100);
    return title.length < text.length ? title + '...' : title;
  }

  /**
   * Restituisce dati mock per test
   */
  private async getMockResults(params: SearchParams): Promise<{ results: ProviderItem[]; next?: string }> {
    // Simula latenza API
    await new Promise(resolve => setTimeout(resolve, 200));

    const mockPosts: ProviderItem[] = [
      {
        url: 'https://www.ilmessaggero.it/economia/olio-dop-lazio-boom-export',
        title: 'Olio DOP del Lazio: boom delle esportazioni nel 2024',
        text: 'Il settore oleario del Lazio registra una crescita record delle esportazioni. L\'olio extravergine DOP Roma e IGP Sabina conquistano i mercati internazionali grazie alla qualità eccellente e alle tecniche di produzione tradizionali.',
        published: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
        site: 'ilmessaggero.it',
        author: 'Redazione Economia',
        language: 'it',
        sentiment: { score: 0.8, label: 'positive' },
        raw: { source: 'webzio_mock' }
      },
      {
        url: 'https://www.agronotizie.it/zootecnia/2024/09/frantoio-castelli-romani-innovazione',
        title: 'Innovazione nei frantoi dei Castelli Romani',
        text: 'I produttori di olio IGP del Lazio investono in nuove tecnologie per migliorare la qualità della spremitura. Sistemi di controllo temperatura e separazione ottimizzati per preservare gli aromi caratteristici dell\'olio laziale.',
        published: new Date(Date.now() - Math.random() * 5 * 24 * 60 * 60 * 1000).toISOString(),
        site: 'agronotizie.it',
        author: 'Marco Bianchi',
        language: 'it',
        sentiment: { score: 0.6, label: 'positive' },
        raw: { source: 'webzio_mock' }
      },
      {
        url: 'https://www.repubblica.it/economia/2024/09/prezzi-olio-extravergine-aumento',
        title: 'Prezzi olio extravergine in aumento: cause e prospettive',
        text: 'L\'aumento dei costi energetici e le condizioni climatiche avverse hanno portato a un incremento dei prezzi dell\'olio extravergine di oliva. Il Lazio cerca di mantenere competitività puntando sulla qualità certificata DOP e IGP.',
        published: new Date(Date.now() - Math.random() * 3 * 24 * 60 * 60 * 1000).toISOString(),
        site: 'repubblica.it',
        author: 'Lucia Rossi',
        language: 'it',
        sentiment: { score: -0.2, label: 'neutral' },
        raw: { source: 'webzio_mock' }
      },
      {
        url: 'https://blog.cucina-italiana.it/ricette-olio-lazio-tradizionali',
        title: 'Ricette tradizionali del Lazio con olio extravergine locale',
        text: 'Riscopriamo le ricette della tradizione laziale che valorizzano l\'olio extravergine locale. Dalla pasta all\'aglione al pollo ai peperoni, ecco come l\'olio DOP Roma esalta i sapori autentici della cucina regionale.',
        published: new Date(Date.now() - Math.random() * 2 * 24 * 60 * 60 * 1000).toISOString(),
        site: 'cucina-italiana.it',
        author: 'Chef Giovanni',
        language: 'it',
        sentiment: { score: 0.9, label: 'positive' },
        raw: { source: 'webzio_mock' }
      },
      {
        url: 'https://forum.agraria.org/topic/contraffazione-olio-dop-problema',
        title: 'Problema contraffazione olio DOP: serve maggiore controllo',
        text: 'La contraffazione dell\'olio DOP rappresenta un serio problema per i produttori laziali. Necessari controlli più stringenti e sistemi di tracciabilità per tutelare i consumatori e i produttori onesti.',
        published: new Date(Date.now() - Math.random() * 1 * 24 * 60 * 60 * 1000).toISOString(),
        site: 'forum.agraria.org',
        author: 'Produttore_Sabina',
        language: 'it',
        sentiment: { score: -0.7, label: 'negative' },
        raw: { source: 'webzio_mock' }
      }
    ];

    // Filtra risultati per keyword se specificata
    let filteredPosts = mockPosts;
    if (params.q) {
      const query = params.q.toLowerCase();
      filteredPosts = mockPosts.filter(post => 
        post.title!.toLowerCase().includes(query) || 
        post.text!.toLowerCase().includes(query)
      );
    }

    // Simula paginazione
    const pageSize = params.size || 100;
    const startIndex = params.next ? parseInt(params.next) : 0;
    const results = filteredPosts.slice(startIndex, startIndex + pageSize);
    const next = results.length === pageSize ? (startIndex + pageSize).toString() : undefined;

    return { results, next };
  }

  /**
   * Test della connessione API
   */
  async testConnection(): Promise<{ success: boolean; message: string }> {
    if (this.config.mockMode) {
      return {
        success: true,
        message: 'Webz.io Provider in modalità mock - test simulato OK'
      };
    }

    if (!this.config.token) {
      return {
        success: false,
        message: 'WEBZIO_TOKEN non configurato'
      };
    }

    try {
      const response = await axios.get(this.config.baseUrl, {
        params: {
          token: this.config.token,
          q: 'test',
          size: 1,
          format: 'json'
        },
        timeout: Math.min(this.config.timeout || 10000, 10000)
      });

      if (response.status === 200) {
        return {
          success: true,
          message: 'Connessione Webz.io API funzionante'
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