/**
 * Interfacce comuni per il sistema multi-provider di monitoraggio
 * Supporta Awario, Webz.io, SerpApi (Google News + Reddit)
 */

export type ProviderItem = {
  url: string;
  title?: string;
  text?: string;
  published?: string;
  site?: string;
  author?: string;
  language?: string;
  sentiment?: { 
    score?: number; 
    label?: "positive" | "neutral" | "negative" 
  };
  raw?: any;
};

export type SearchParams = {
  q: string;
  from?: string;
  to?: string;
  language?: string;
  country?: string;
  size?: number;
  next?: string;
};

export interface Provider {
  search(params: SearchParams): Promise<{ 
    results: ProviderItem[]; 
    next?: string 
  }>;
  id: string; // es: "awario" | "webzio" | "serpapi:google_news" | "serpapi:reddit"
}

/**
 * Risultato di una chiamata API provider con metadati
 */
export type ProviderResponse = {
  results: ProviderItem[];
  next?: string;
  totalCount?: number;
  provider: string;
};

/**
 * Configurazione per retry logic
 */
export type RetryConfig = {
  retries: number;
  minTimeout: number;
  maxTimeout: number;
  factor: number;
};

/**
 * Stato di mock per testing
 */
export type MockMode = {
  enabled: boolean;
  provider: string;
  fixturePath?: string;
};