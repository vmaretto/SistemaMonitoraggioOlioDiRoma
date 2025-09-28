/**
 * Awario Provider - implementa l'interfaccia Provider comune
 * Adapter per il sistema multi-provider che mantiene compatibilità con AwarioClient esistente
 */

import { Provider, ProviderItem, SearchParams } from './types';

interface AwarioConfig {
  apiKey: string;
  baseUrl: string;
  mockMode: boolean;
  timeout?: number;
}

interface AwarioMention {
  id: string;
  text: string;
  url: string;
  author: string;
  source: string;
  language: string;
  sentiment: number; // -1 to 1
  reach: number;
  date: string;
  location?: string;
  tags: string[];
}

interface AwarioSearchParams {
  keywords: string[];
  sources?: string[];
  languages?: string[];
  sentiment?: 'positive' | 'negative' | 'neutral' | 'all';
  dateFrom?: string;
  dateTo?: string;
  limit?: number;
  offset?: number;
}

export class AwarioProvider implements Provider {
  public readonly id = 'awario';
  private config: AwarioConfig;

  constructor(config: Partial<AwarioConfig> = {}) {
    this.config = {
      apiKey: config.apiKey || process.env.AWARIO_API_KEY || '',
      baseUrl: config.baseUrl || process.env.AWARIO_BASE_URL || 'https://api.awario.com/v1',
      mockMode: config.mockMode ?? (process.env.AWARIO_MOCK === '1' || !process.env.AWARIO_API_KEY),
      timeout: config.timeout || parseInt(process.env.AWARIO_TIMEOUT || '30000')
    };

    if (this.config.mockMode) {
      console.log('🔄 Awario Provider - modalità mock attivata');
    }
  }

  /**
   * Implementazione dell'interfaccia Provider
   */
  async search(params: SearchParams): Promise<{ results: ProviderItem[]; next?: string }> {
    // Mappa i parametri standard a quelli specifici di Awario
    const awarioParams: AwarioSearchParams = {
      keywords: [params.q],
      languages: params.language ? [params.language] : ['it'],
      dateFrom: params.from,
      dateTo: params.to,
      limit: params.size || 50,
      offset: this.parseOffset(params.next)
    };

    const mentions = await this.getMentions(awarioParams);
    
    // Converte AwarioMention[] in ProviderItem[]
    const results = mentions.map(mention => this.toProviderItem(mention));
    
    // Calcola next cursor se ci sono ancora dati
    const next = results.length === awarioParams.limit ? 
      ((awarioParams.offset || 0) + awarioParams.limit).toString() : 
      undefined;

    return { results, next };
  }

  /**
   * Metodo legacy per compatibilità con il codice esistente
   */
  async getMentions(params: AwarioSearchParams): Promise<AwarioMention[]> {
    if (this.config.mockMode) {
      console.log('🔄 Awario modalità mock - restituisco dati simulati');
      return this.getMockMentions(params);
    }

    try {
      const queryParams = new URLSearchParams({
        keywords: params.keywords.join(','),
        limit: (params.limit || 50).toString(),
        offset: (params.offset || 0).toString(),
        ...(params.sources && { sources: params.sources.join(',') }),
        ...(params.languages && { languages: params.languages.join(',') }),
        ...(params.sentiment && params.sentiment !== 'all' && { sentiment: params.sentiment }),
        ...(params.dateFrom && { date_from: params.dateFrom }),
        ...(params.dateTo && { date_to: params.dateTo })
      });

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);

      const response = await fetch(`${this.config.baseUrl}/mentions?${queryParams}`, {
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Awario API Error: ${response.status} - ${response.statusText}`);
      }

      const data = await response.json();
      return this.normalizeAwarioResponse(data);

    } catch (error) {
      console.error('❌ Errore Awario API:', error);
      
      // Fallback a dati simulati in caso di errore
      console.log('🔄 Fallback a dati simulati');
      return this.getMockMentions(params);
    }
  }

  /**
   * Converte AwarioMention in ProviderItem
   */
  private toProviderItem(mention: AwarioMention): ProviderItem {
    return {
      url: mention.url,
      title: this.extractTitle(mention.text),
      text: mention.text,
      published: mention.date,
      site: mention.source, // Usa source originale non mappato
      author: mention.author,
      language: mention.language,
      sentiment: {
        score: mention.sentiment,
        label: this.sentimentToLabel(mention.sentiment)
      },
      raw: mention
    };
  }

  /**
   * Estrae un titolo dal testo della menzione
   */
  private extractTitle(text: string): string {
    // Prende le prime 100 caratteri come titolo
    const title = text.slice(0, 100);
    return title.length < text.length ? title + '...' : title;
  }

  /**
   * Converte score numerico in label inglese (per Provider interface)
   */
  private sentimentToLabel(score: number): "positive" | "neutral" | "negative" {
    if (score > 0.2) return "positive";
    if (score < -0.2) return "negative";
    return "neutral";
  }

  /**
   * Converte score numerico in label italiana (per compatibilità database)
   */
  private sentimentToItalianLabel(score: number): string {
    if (score > 0.2) return "positivo";
    if (score < -0.2) return "negativo";
    return "neutro";
  }

  /**
   * Parse offset da stringa next
   */
  private parseOffset(next?: string): number {
    return next ? parseInt(next, 10) || 0 : 0;
  }

  /**
   * Normalizza la risposta di Awario nel formato interno
   */
  private normalizeAwarioResponse(awarioData: any): AwarioMention[] {
    if (!awarioData.mentions || !Array.isArray(awarioData.mentions)) {
      return [];
    }

    return awarioData.mentions.map((mention: any) => ({
      id: mention.id || `awario_${Date.now()}_${Math.random()}`,
      text: mention.text || mention.content || '',
      url: mention.url || '',
      author: mention.author?.name || mention.author || 'Autore sconosciuto',
      source: this.mapSource(mention.source),
      language: mention.language || 'it',
      sentiment: this.normalizeSentiment(mention.sentiment),
      reach: mention.reach || mention.followers || 0,
      date: mention.date || mention.created_at || new Date().toISOString(),
      location: mention.location,
      tags: mention.tags || []
    }));
  }

  /**
   * Mappa le fonti Awario alle nostre categorie
   */
  private mapSource(awarioSource: string): string {
    const sourceMapping: { [key: string]: string } = {
      'twitter': 'social',
      'facebook': 'social', 
      'instagram': 'social',
      'youtube': 'social',
      'tiktok': 'social',
      'linkedin': 'social',
      'amazon': 'ecommerce',
      'ebay': 'ecommerce',
      'etsy': 'ecommerce',
      'tripadvisor': 'review',
      'google': 'review',
      'yelp': 'review',
      'reddit': 'forum',
      'quora': 'forum',
      'news': 'news',
      'blog': 'blog',
      'forum': 'forum'
    };

    const lowerSource = awarioSource?.toLowerCase() || '';
    
    // Cerca match esatto
    if (sourceMapping[lowerSource]) {
      return sourceMapping[lowerSource];
    }

    // Cerca match parziale
    for (const [key, value] of Object.entries(sourceMapping)) {
      if (lowerSource.includes(key)) {
        return value;
      }
    }

    return 'other';
  }

  /**
   * Normalizza il sentiment da Awario (-1 to 1) al nostro formato
   */
  private normalizeSentiment(awarioSentiment: any): number {
    if (typeof awarioSentiment === 'number') {
      return Math.max(-1, Math.min(1, awarioSentiment));
    }
    
    if (typeof awarioSentiment === 'string') {
      switch (awarioSentiment.toLowerCase()) {
        case 'positive': return 0.7;
        case 'negative': return -0.7;
        case 'neutral': return 0;
        default: return 0;
      }
    }
    
    return 0;
  }

  /**
   * Dati simulati per testing/demo quando API non è disponibile
   */
  private async getMockMentions(params: AwarioSearchParams): Promise<AwarioMention[]> {
    const mockMentions: AwarioMention[] = [
      {
        id: 'mock_awario_1',
        text: 'Appena provato l\'olio extravergine del Lazio - fantastico! Sapore autentico e tradizionale. #OlioRoma #DOP',
        url: 'https://twitter.com/foodlover/status/123456',
        author: 'FoodLover_Roma',
        source: 'social',
        language: 'it',
        sentiment: 0.8,
        reach: 1500,
        date: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
        tags: params.keywords
      },
      {
        id: 'mock_awario_2', 
        text: 'Olio DOP Sabina ordinato su Amazon. Consegna veloce ma prezzo un po\' alto. Comunque buona qualità.',
        url: 'https://amazon.it/review/456789',
        author: 'Cliente Verificato',
        source: 'ecommerce',
        language: 'it',
        sentiment: 0.3,
        reach: 50,
        date: new Date(Date.now() - Math.random() * 14 * 24 * 60 * 60 * 1000).toISOString(),
        tags: ['DOP Sabina', 'Amazon']
      },
      {
        id: 'mock_awario_3',
        text: 'Delusione totale con questo olio del Lazio. Sapore amaro e prezzo esagerato. Non lo ricomprerò mai.',
        url: 'https://forum-cucina.it/thread/789012',
        author: 'Cuoco_Critico',
        source: 'forum',
        language: 'it', 
        sentiment: -0.9,
        reach: 200,
        date: new Date(Date.now() - Math.random() * 5 * 24 * 60 * 60 * 1000).toISOString(),
        tags: ['olio lazio']
      },
      {
        id: 'mock_awario_4',
        text: 'Il nuovo frantoio nei Castelli Romani produce un olio IGP di ottima qualità. Visitato ieri, esperienza bellissima!',
        url: 'https://gustoblog.it/articolo/frantoio-castelli',
        author: 'GustoBlog',
        source: 'blog',
        language: 'it',
        sentiment: 0.9,
        reach: 5000,
        date: new Date(Date.now() - Math.random() * 3 * 24 * 60 * 60 * 1000).toISOString(),
        tags: ['IGP Lazio', 'Castelli Romani']
      },
      {
        id: 'mock_awario_5',
        text: 'Prezzi dell\'olio extravergine in aumento secondo ISMEA. Il Lazio mantiene standard qualitativi elevati.',
        url: 'https://corriere.it/economia/olio-prezzi',
        author: 'Redazione Economia',
        source: 'news',
        language: 'it',
        sentiment: 0.1,
        reach: 10000,
        date: new Date(Date.now() - Math.random() * 1 * 24 * 60 * 60 * 1000).toISOString(),
        tags: ['olio lazio', 'ISMEA']
      }
    ];

    // Filtra per keywords se specificate
    if (params.keywords.length > 0) {
      const filteredMentions = mockMentions.filter(mention => 
        params.keywords.some(keyword => 
          mention.text.toLowerCase().includes(keyword.toLowerCase()) ||
          mention.tags.some(tag => tag.toLowerCase().includes(keyword.toLowerCase()))
        )
      );
      return filteredMentions.slice(params.offset || 0, (params.offset || 0) + (params.limit || 50));
    }

    return mockMentions.slice(params.offset || 0, (params.offset || 0) + (params.limit || 50));
  }

  /**
   * Converte una menzione Awario nel formato del nostro database
   * Metodo legacy per compatibilità
   */
  convertToContent(mention: AwarioMention, keywords: string[]): any {
    return {
      fonte: mention.source,
      piattaforma: this.inferPlatform(mention.url, mention.source),
      testo: mention.text,
      url: mention.url,
      autore: mention.author,
      sentiment: this.sentimentToItalianLabel(mention.sentiment), // Usa labels italiane per compatibilità
      sentimentScore: mention.sentiment,
      keywords: keywords.filter(keyword => 
        mention.text.toLowerCase().includes(keyword.toLowerCase())
      ),
      dataPost: new Date(mention.date),
      rilevanza: this.calculateRelevance(mention, keywords),
      isProcessed: true
    };
  }

  /**
   * Deduce la piattaforma dall'URL
   */
  private inferPlatform(url: string, source: string): string {
    const domain = this.extractDomain(url);
    
    const platformMapping: { [key: string]: string } = {
      'twitter.com': 'Twitter',
      'facebook.com': 'Facebook',
      'instagram.com': 'Instagram',
      'youtube.com': 'YouTube',
      'amazon.it': 'Amazon',
      'amazon.com': 'Amazon',
      'tripadvisor': 'TripAdvisor',
      'reddit.com': 'Reddit',
      'linkedin.com': 'LinkedIn'
    };

    for (const [key, platform] of Object.entries(platformMapping)) {
      if (domain.includes(key)) {
        return platform;
      }
    }

    return source || 'Web';
  }

  /**
   * Estrae il dominio da un URL
   */
  private extractDomain(url: string): string {
    try {
      return new URL(url).hostname.toLowerCase();
    } catch {
      return url.toLowerCase();
    }
  }

  /**
   * Calcola la rilevanza di una menzione
   */
  private calculateRelevance(mention: AwarioMention, keywords: string[]): number {
    let score = 0;
    
    // Punteggio base per keyword match
    const keywordMatches = keywords.filter(keyword => 
      mention.text.toLowerCase().includes(keyword.toLowerCase())
    ).length;
    score += keywordMatches * 20;
    
    // Bonus per reach/followers
    if (mention.reach > 10000) score += 20;
    else if (mention.reach > 1000) score += 10;
    else if (mention.reach > 100) score += 5;
    
    // Bonus per sentiment positivo
    if (mention.sentiment > 0.5) score += 15;
    else if (mention.sentiment < -0.5) score -= 10;
    
    // Bonus per fonte autorevole
    if (mention.source === 'news') score += 15;
    else if (mention.source === 'blog') score += 10;
    
    return Math.max(0, Math.min(100, score));
  }
}