

/**
 * Awario API Client
 * Documentazione: https://awario.com/api-docs
 */

interface AwarioConfig {
  apiKey: string;
  baseUrl: string;
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

export class AwarioClient {
  private config: AwarioConfig;

  constructor() {
    this.config = {
      apiKey: process.env.AWARIO_API_KEY || '',
      baseUrl: process.env.AWARIO_BASE_URL || 'https://api.awario.com/v1'
    };

    if (!this.config.apiKey) {
      console.warn('⚠️ AWARIO_API_KEY non configurata - usando modalità demo');
    }
  }

  /**
   * Recupera menzioni per keywords specifiche
   */
  async getMentions(params: AwarioSearchParams): Promise<AwarioMention[]> {
    if (!this.config.apiKey) {
      console.log('🔄 Modalità demo - restituisco dati simulati');
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
        id: 'mock_1',
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
        id: 'mock_2', 
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
        id: 'mock_3',
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
        id: 'mock_4',
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
        id: 'mock_5',
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
   */
  convertToContento(mention: AwarioMention, keywords: string[]): any {
    return {
      fonte: mention.source,
      piattaforma: this.inferPlatform(mention.url, mention.source),
      testo: mention.text,
      url: mention.url,
      autore: mention.author,
      sentiment: this.convertSentimentToCategory(mention.sentiment),
      sentimentScore: mention.sentiment,
      keywords: this.extractMatchingKeywords(mention.text, keywords),
      dataPost: new Date(mention.date),
      rilevanza: this.calculateRelevance(mention.text, mention.reach, keywords)
    };
  }

  /**
   * Inferisce la piattaforma dall'URL
   */
  private inferPlatform(url: string, source: string): string {
    if (!url) return source || 'unknown';
    
    const lowerUrl = url.toLowerCase();
    
    if (lowerUrl.includes('twitter.com') || lowerUrl.includes('x.com')) return 'twitter';
    if (lowerUrl.includes('facebook.com')) return 'facebook';
    if (lowerUrl.includes('instagram.com')) return 'instagram';
    if (lowerUrl.includes('youtube.com')) return 'youtube';
    if (lowerUrl.includes('linkedin.com')) return 'linkedin';
    if (lowerUrl.includes('tiktok.com')) return 'tiktok';
    if (lowerUrl.includes('amazon.')) return 'amazon';
    if (lowerUrl.includes('ebay.')) return 'ebay';
    if (lowerUrl.includes('tripadvisor.')) return 'tripadvisor';
    if (lowerUrl.includes('google.') || lowerUrl.includes('maps.google')) return 'google';
    if (lowerUrl.includes('yelp.com')) return 'yelp';
    if (lowerUrl.includes('reddit.com')) return 'reddit';
    
    return source || 'web';
  }

  /**
   * Converte il sentiment numerico in categoria
   */
  private convertSentimentToCategory(score: number): string {
    if (score > 0.2) return 'positivo';
    if (score < -0.2) return 'negativo';
    return 'neutro';
  }

  /**
   * Estrae le keywords che matchano nel testo
   */
  private extractMatchingKeywords(text: string, keywords: string[]): string[] {
    const lowerText = text.toLowerCase();
    return keywords.filter(keyword => 
      lowerText.includes(keyword.toLowerCase())
    );
  }

  /**
   * Calcola la rilevanza considerando reach e keyword matching
   */
  private calculateRelevance(text: string, reach: number, keywords: string[]): number {
    const matchingKeywords = this.extractMatchingKeywords(text, keywords);
    let score = matchingKeywords.length * 20; // 20 punti per keyword
    
    // Bonus per reach alto
    if (reach > 10000) score += 20;
    else if (reach > 1000) score += 10;
    else if (reach > 100) score += 5;
    
    // Bonus per keywords multiple
    if (matchingKeywords.length > 1) {
      score += matchingKeywords.length * 5;
    }
    
    return Math.min(100, score);
  }

  /**
   * Test della connessione API
   */
  async testConnection(): Promise<{ success: boolean; message: string }> {
    if (!this.config.apiKey) {
      return {
        success: false,
        message: 'AWARIO_API_KEY non configurata'
      };
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(`${this.config.baseUrl}/me`, {
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Accept': 'application/json'
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        return {
          success: true,
          message: 'Connessione Awario API funzionante'
        };
      } else {
        return {
          success: false,
          message: `Errore API: ${response.status} - ${response.statusText}`
        };
      }
    } catch (error) {
      return {
        success: false,
        message: `Errore connessione: ${error}`
      };
    }
  }
}

// Istanza singleton
export const awarioClient = new AwarioClient();
