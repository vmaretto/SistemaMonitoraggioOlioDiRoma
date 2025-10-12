/**
 * Sistema di normalizzazione per unificare dati di tutti i provider
 * Converte ProviderItem in formato compatibile con database ContenutiMonitorati
 */

import { ProviderItem } from '../integrations/types';
import { extractImageUrl } from '../utils/image-detection';

// Tipi sentiment compatibili con database
export type SentimentLabel = 'positivo' | 'neutro' | 'negativo';

// Schema normalizzato compatibile con database ContenutiMonitorati
export interface NormalizedMention {
  // Campi database ContenutiMonitorati
  fonte: string;        // social, blog, ecommerce, news
  piattaforma: string;  // webzio, google_news, reddit
  testo: string;        // contenuto del post/articolo
  url?: string;         // URL originale
  imageUrl?: string;    // URL immagine rilevata nel contenuto
  autore?: string;      // autore del contenuto
  sentiment: string;    // positivo, neutro, negativo
  sentimentScore: number; // -1 a +1
  keywords: string[];   // keyword trovate
  dataPost: Date;       // data pubblicazione
  rilevanza: number;    // 0-100
  metadata?: any;       // metadati aggiuntivi
  
  // Metadati aggiuntivi (non database)
  source: 'webzio' | 'serpapi_google_news' | 'serpapi_reddit';
  externalId?: string;
  socialMetrics?: {
    likes?: number;
    shares?: number;
    comments?: number;
    votes?: number;
  };
}

/**
 * Mappa sentiment labels tra provider e database italiano
 */
export const SENTIMENT_MAPPING: Record<string, SentimentLabel> = {
  // Provider inglesi -> italiano
  'positive': 'positivo',
  'negative': 'negativo', 
  'neutral': 'neutro',
  
  // Provider italiani (passthrough)
  'positivo': 'positivo',
  'negativo': 'negativo',
  'neutro': 'neutro',
  'neutrale': 'neutro',
  
  // Abbreviazioni
  'pos': 'positivo',
  'neg': 'negativo',
  'neu': 'neutro'
} as const;

/**
 * Mappa fonti per database ContenutiMonitorati
 */
export const SOURCE_MAPPING: Record<string, string> = {
  // Provider -> fonte database
  'webzio': 'blog', 
  'serpapi_google_news': 'news',
  'serpapi:google_news': 'news',
  'serpapi_reddit': 'social',
  'serpapi:reddit': 'social'
} as const;

/**
 * Mappa piattaforme per database con indicatori real/demo
 */
export const PLATFORM_MAPPING: Record<string, string> = {
  'webzio': 'webzio_demo',
  'serpapi_google_news': 'google_news_real',
  'serpapi:google_news': 'google_news_real',
  'serpapi_reddit': 'reddit_real',
  'serpapi:reddit': 'reddit_real'
} as const;

/**
 * Mappa nomi user-friendly delle piattaforme
 */
export const PLATFORM_DISPLAY_NAMES: Record<string, { name: string; type: 'real' | 'demo'; icon: string; color: string }> = {
  'webzio_demo': { name: 'Webz.io Demo', type: 'demo', icon: '⚠️', color: 'bg-orange-100 text-orange-800' },
  'google_news_real': { name: 'Google News', type: 'real', icon: '✅', color: 'bg-green-100 text-green-800' },
  'reddit_real': { name: 'Reddit', type: 'real', icon: '✅', color: 'bg-green-100 text-green-800' },
  'google_news': { name: 'Google News Demo', type: 'demo', icon: '⚠️', color: 'bg-orange-100 text-orange-800' },
  'reddit': { name: 'Reddit Demo', type: 'demo', icon: '⚠️', color: 'bg-orange-100 text-orange-800' },
  'webzio': { name: 'Webz.io Demo', type: 'demo', icon: '⚠️', color: 'bg-orange-100 text-orange-800' }
} as const;

/**
 * Normalizza un elemento da qualsiasi provider
 */
export function normalizeProviderItem(item: ProviderItem, sourceProvider: string): NormalizedMention {
  const publishedDate = parsePublishedDate(item.published);
  const sentimentLabel = normalizeSentiment(item.sentiment?.label);
  const sentimentScore = item.sentiment?.score || 0;
  
  // Determina piattaforma basata su sourceProvider
  let piattaforma = PLATFORM_MAPPING[sourceProvider] || sourceProvider;
  
  // Se è un mock/demo, forza suffisso demo
  if (item.raw?.__mock_data || sourceProvider === 'webzio') {
    piattaforma = piattaforma.replace('_real', '_demo');
  }
  
  // Estrai URL immagine dal contenuto
  const testoCompleto = item.text || item.title || '';
  const imageUrl = extractImageUrl(testoCompleto, item.url, item.raw);
  
  return {
    // Campi database ContenutiMonitorati
    fonte: SOURCE_MAPPING[sourceProvider] || 'blog',
    piattaforma,
    testo: testoCompleto,
    url: item.url,
    imageUrl: imageUrl || undefined,
    autore: item.author,
    sentiment: sentimentLabel,
    sentimentScore: sentimentScore,
    keywords: extractKeywords(item.text, item.title),
    dataPost: publishedDate,
    rilevanza: calculateRelevance(item, sourceProvider),
    metadata: item.raw || undefined,
    
    // Metadati aggiuntivi
    source: mapToSourceType(sourceProvider),
    externalId: generateExternalId(item.url, sourceProvider),
    socialMetrics: extractSocialMetrics(item, sourceProvider)
  };
}

/**
 * Funzione principale di normalizzazione (legacy wrapper)
 */
export function normalizeItem(item: ProviderItem, source: string): NormalizedMention {
  return normalizeProviderItem(item, source);
}




/**
 * Utility functions
 */

function generateExternalId(url: string, provider: string): string {
  const urlHash = Buffer.from(url).toString('base64').slice(0, 8);
  return `${provider}_${urlHash}`;
}

function normalizeSentiment(sentiment?: string): SentimentLabel {
  if (!sentiment) return 'neutro';
  const normalized = sentiment.toLowerCase();
  return SENTIMENT_MAPPING[normalized] || 'neutro';
}

function mapToSourceType(provider: string): NormalizedMention['source'] {
  switch (provider) {
    case 'webzio': return 'webzio';
    case 'serpapi:google_news':
    case 'serpapi_google_news': return 'serpapi_google_news';
    case 'serpapi:reddit':
    case 'serpapi_reddit': return 'serpapi_reddit';
    default: return 'webzio';
  }
}

function parsePublishedDate(published?: string): Date {
  if (!published) return new Date();
  
  // Prova prima con date relative (Google News)
  const relative = parseRelativeDate(published);
  if (relative) return relative;
  
  // Fallback per date ISO/assolute
  const parsed = new Date(published);
  return isNaN(parsed.getTime()) ? new Date() : parsed;
}

function parseRelativeDate(dateStr: string): Date | null {
  const now = new Date();
  const lower = dateStr.toLowerCase();
  
  // Pattern italiani: "2 ore fa", "1 giorno fa", "3 giorni fa"
  if (lower.includes('ore fa') || lower.includes('hour')) {
    const hours = parseInt(lower.match(/\d+/)?.[0] || '0');
    return new Date(now.getTime() - hours * 60 * 60 * 1000);
  }
  
  if (lower.includes('giorno fa') || lower.includes('day')) {
    const days = parseInt(lower.match(/\d+/)?.[0] || '0');
    return new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
  }
  
  if (lower.includes('minuti fa') || lower.includes('minute')) {
    const minutes = parseInt(lower.match(/\d+/)?.[0] || '0');
    return new Date(now.getTime() - minutes * 60 * 1000);
  }
  
  return null;
}

function extractKeywords(text?: string, title?: string): string[] {
  const content = `${title || ''} ${text || ''}`.toLowerCase();
  
  // Lista base di keyword olio/DOP/IGP per il Lazio
  const keywords = [
    'olio', 'extravergine', 'dop', 'igp', 'lazio', 'roma', 'sabina',
    'castelli romani', 'colli albani', 'frantoio', 'olive', 'oliveto'
  ];
  
  return keywords.filter(keyword => content.includes(keyword));
}

function calculateRelevance(item: ProviderItem, provider: string): number {
  // Calcolo basic relevance 0-100
  let score = 50; // base
  
  const text = `${item.title || ''} ${item.text || ''}`.toLowerCase();
  
  // Boost per keyword importanti
  if (text.includes('dop') || text.includes('igp')) score += 20;
  if (text.includes('lazio') || text.includes('roma')) score += 15;
  if (text.includes('olio extravergine')) score += 10;
  if (text.includes('sabina') || text.includes('castelli')) score += 10;
  
  // Boost per sentiment positivo
  if (item.sentiment?.label === 'positive') score += 5;
  if (item.sentiment?.label === 'negative') score -= 5;
  
  return Math.min(100, Math.max(0, score));
}

function extractSocialMetrics(item: ProviderItem, provider: string): NormalizedMention['socialMetrics'] {
  // Estrae metriche social da raw data se disponibili
  const raw = item.raw || {};
  
  switch (provider) {
    case 'serpapi:reddit':
    case 'serpapi_reddit':
      return {
        votes: raw.votes || raw.upvotes,
        comments: raw.comments
      };
    
    case 'webzio':
      return {
        likes: raw.facebook?.likes,
        shares: raw.facebook?.shares,
        comments: raw.facebook?.comments
      };
    
    default:
      return undefined;
  }
}