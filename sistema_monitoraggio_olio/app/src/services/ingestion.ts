/**
 * Servizio di ingestion multi-provider per contenuti monitorati
 * Gestisce la raccolta, normalizzazione e salvataggio di contenuti da provider multipli
 */

import { PrismaClient } from '@prisma/client';
import { ProviderRegistry, buildProviderConfigFromEnv } from '../integrations/registry';
import { Provider, ProviderItem, SearchParams } from '../integrations/types';
import { normalizeItem, NormalizedMention } from './normalize';
import { 
  getSearchProfile, 
  getAllSearchProfiles, 
  buildSearchParams, 
  SearchProfile,
  SearchQuery 
} from '../config/searchProfiles';

const prisma = new PrismaClient();

/**
 * Risultato di un'operazione di ingestion
 */
export interface IngestionResult {
  success: boolean;
  profileId: string;
  providersUsed: string[];
  totalItems: number;
  newItems: number;
  duplicatesSkipped: number;
  errors: IngestionError[];
  duration: number; // millisecondi
  nextTokens?: Record<string, string>; // per paginazione
}

/**
 * Errore durante l'ingestion
 */
export interface IngestionError {
  provider: string;
  query: string;
  error: string;
  retryable: boolean;
}

/**
 * Opzioni per l'ingestion
 */
export interface IngestionOptions {
  // Limiti di raccolta
  maxItemsPerProvider?: number;
  maxItemsTotal?: number;
  
  // Controllo temporale
  timeoutMs?: number;
  
  // Modalità di deduplicazione
  deduplicationStrategy?: 'url' | 'title' | 'url_and_title';
  
  // Salvataggio nel database
  saveToDatabase?: boolean;
  
  // Modalità dry-run per testing
  dryRun?: boolean;
  
  // Provider specifici da usare (override profilo)
  forceProviders?: string[];
  
  // Continuazione paginazione
  nextTokens?: Record<string, string>;
}

/**
 * Servizio principale per l'ingestion multi-provider
 */
export class MultiProviderIngestionService {
  private registry: ProviderRegistry;
  private defaultOptions: Required<IngestionOptions>;

  constructor() {
    const config = buildProviderConfigFromEnv();
    this.registry = new ProviderRegistry(config);
    
    this.defaultOptions = {
      maxItemsPerProvider: 100,
      maxItemsTotal: 500,
      timeoutMs: 300000, // 5 minuti
      deduplicationStrategy: 'url',
      saveToDatabase: true,
      dryRun: false,
      forceProviders: [],
      nextTokens: {}
    };
  }

  /**
   * Esegue ingestion per un singolo profilo di ricerca
   */
  async ingestByProfile(
    profileId: string, 
    options: IngestionOptions = {}
  ): Promise<IngestionResult> {
    const startTime = Date.now();
    const opts = { ...this.defaultOptions, ...options };
    
    const profile = getSearchProfile(profileId);
    if (!profile) {
      throw new Error(`Search profile '${profileId}' not found`);
    }

    console.log(`🔄 Avvio ingestion per profilo: ${profile.name}`);
    
    const result: IngestionResult = {
      success: false,
      profileId,
      providersUsed: [],
      totalItems: 0,
      newItems: 0,
      duplicatesSkipped: 0,
      errors: [],
      duration: 0,
      nextTokens: {}
    };

    try {
      // Determina provider da usare
      const providersToUse = opts.forceProviders.length > 0 
        ? opts.forceProviders 
        : profile.providers;
      
      // Raccolta dati da tutti i provider
      const providerResults = await this.collectFromProviders(
        profile, 
        providersToUse, 
        opts,
        result.errors,
        result.nextTokens || {}
      );
      
      // Normalizzazione e deduplicazione
      const normalizedItems = await this.normalizeAndDeduplicate(
        providerResults, 
        opts.deduplicationStrategy
      );
      
      result.totalItems = normalizedItems.length;
      result.providersUsed = Object.keys(providerResults);
      
      // Salvataggio nel database
      if (opts.saveToDatabase && !opts.dryRun) {
        const savedCount = await this.saveToDatabase(normalizedItems);
        result.newItems = savedCount;
        result.duplicatesSkipped = normalizedItems.length - savedCount;
      } else {
        result.newItems = normalizedItems.length;
      }
      
      // Determina successo: completo se nessun errore, parziale se alcuni provider falliti
      result.success = result.errors.length === 0;
      if (result.errors.length > 0 && result.totalItems > 0) {
        console.log(`⚠️ Ingestion parzialmente riuscita per ${profile.name}: ${result.errors.length} errori, ma ${result.totalItems} item raccolti`);
      } else if (result.errors.length === 0) {
        result.success = true;
      }
      
      console.log(`✅ Ingestion completata per ${profile.name}: ${result.newItems} nuovi item, ${result.duplicatesSkipped} duplicati`);
      
    } catch (error) {
      console.error(`❌ Errore durante ingestion per ${profile.name}:`, error);
      result.errors.push({
        provider: 'system',
        query: '',
        error: error instanceof Error ? error.message : String(error),
        retryable: false
      });
    }
    
    result.duration = Date.now() - startTime;
    return result;
  }

  /**
   * Esegue ingestion per tutti i profili ordinati per priorità
   */
  async ingestAllProfiles(options: IngestionOptions = {}): Promise<IngestionResult[]> {
    const profiles = getAllSearchProfiles();
    const results: IngestionResult[] = [];
    
    console.log(`🔄 Avvio ingestion per ${profiles.length} profili di ricerca`);
    
    for (const profile of profiles) {
      try {
        const result = await this.ingestByProfile(profile.id, options);
        results.push(result);
        
        // Verifica limiti globali
        const totalNew = results.reduce((sum, r) => sum + r.newItems, 0);
        if (options.maxItemsTotal && totalNew >= options.maxItemsTotal) {
          console.log(`⚠️ Raggiunto limite massimo di ${options.maxItemsTotal} item totali`);
          break;
        }
        
      } catch (error) {
        console.error(`❌ Errore durante ingestion profilo ${profile.id}:`, error);
        results.push({
          success: false,
          profileId: profile.id,
          providersUsed: [],
          totalItems: 0,
          newItems: 0,
          duplicatesSkipped: 0,
          errors: [{
            provider: 'system',
            query: '',
            error: error instanceof Error ? error.message : String(error),
            retryable: false
          }],
          duration: 0
        });
      }
    }
    
    const totalSuccess = results.filter(r => r.success).length;
    const totalItems = results.reduce((sum, r) => sum + r.newItems, 0);
    
    console.log(`🏁 Ingestion completata: ${totalSuccess}/${profiles.length} profili, ${totalItems} nuovi item totali`);
    
    return results;
  }

  /**
   * Raccoglie dati da provider multipli per un profilo
   */
  private async collectFromProviders(
    profile: SearchProfile,
    providerCodes: string[],
    options: IngestionOptions,
    errors: IngestionError[],
    nextTokens: Record<string, string>
  ): Promise<Record<string, ProviderItem[]>> {
    const results: Record<string, ProviderItem[]> = {};
    
    // Chiamate parallele ai provider
    const providerPromises = providerCodes.map(async (providerCode) => {
      try {
        const provider = this.registry.getProvider(providerCode as any);
        const { items, tokens } = await this.collectFromSingleProvider(
          provider, 
          profile, 
          options
        );
        
        return { providerCode, items, tokens, error: null };
        
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`❌ Errore provider ${providerCode}:`, error);
        
        errors.push({
          provider: providerCode,
          query: profile.queries.map(q => q.primary).join(', '),
          error: errorMessage,
          retryable: errorMessage.includes('timeout') || errorMessage.includes('network')
        });
        
        return { providerCode, items: [], tokens: {}, error: errorMessage };
      }
    });
    
    const providerResults = await Promise.allSettled(providerPromises);
    
    for (const result of providerResults) {
      if (result.status === 'fulfilled' && result.value) {
        const { providerCode, items, tokens } = result.value;
        results[providerCode] = items;
        
        // Salva next tokens per paginazione
        if (tokens && Object.keys(tokens).length > 0) {
          Object.assign(nextTokens, tokens);
        }
        
        console.log(`📊 Provider ${providerCode}: ${items.length} item raccolti`);
      } else if (result.status === 'rejected') {
        console.error(`❌ Provider promise rejected:`, result.reason);
        errors.push({
          provider: 'unknown',
          query: '',
          error: `Promise rejected: ${result.reason}`,
          retryable: false
        });
      }
    }
    
    return results;
  }

  /**
   * Raccoglie dati da un singolo provider
   */
  private async collectFromSingleProvider(
    provider: Provider,
    profile: SearchProfile,
    options: IngestionOptions
  ): Promise<{ items: ProviderItem[]; tokens: Record<string, string> }> {
    const allItems: ProviderItem[] = [];
    const maxItems = options.maxItemsPerProvider || 100;
    const collectedTokens: Record<string, string> = {};
    
    // Esegue ricerche per tutte le query del profilo
    for (const query of profile.queries) {
      if (allItems.length >= maxItems) break;
      
      try {
        const searchParams = buildSearchParams(profile, query, provider.id as any);
        const remainingItems = maxItems - allItems.length;
        
        // Limita la dimensione del batch
        if (searchParams.size && searchParams.size > remainingItems) {
          searchParams.size = remainingItems;
        }
        
        // Continuazione paginazione se disponibile
        if (options.nextTokens?.[provider.id]) {
          searchParams.next = options.nextTokens[provider.id];
        }
        
        console.log(`🔍 ${provider.id}: ricerca per "${query.primary}"`);
        
        const response = await provider.search(searchParams);
        
        if (response.results && response.results.length > 0) {
          allItems.push(...response.results);
          console.log(`   ✓ ${response.results.length} risultati trovati`);
          
          // Salva next token per paginazione futura
          if (response.next && allItems.length < maxItems) {
            collectedTokens[provider.id] = response.next;
          }
        }
        
      } catch (error) {
        console.error(`❌ Errore ricerca "${query.primary}" con ${provider.id}:`, error);
        throw error; // Re-throw per essere catturato dal livello superiore
      }
    }
    
    return { 
      items: allItems.slice(0, maxItems),
      tokens: collectedTokens
    };
  }

  /**
   * Normalizza i risultati e rimuove duplicati
   */
  private async normalizeAndDeduplicate(
    providerResults: Record<string, ProviderItem[]>,
    strategy: 'url' | 'title' | 'url_and_title'
  ): Promise<NormalizedMention[]> {
    const allItems: ProviderItem[] = [];
    
    // Combina tutti i risultati
    for (const [provider, items] of Object.entries(providerResults)) {
      for (const item of items) {
        // Aggiunge informazioni del provider nel raw object
        const enrichedItem = {
          ...item,
          raw: {
            ...item.raw,
            sourceProvider: provider,
            ingestionTimestamp: new Date().toISOString()
          }
        };
        allItems.push(enrichedItem);
      }
    }
    
    console.log(`🔄 Normalizzazione di ${allItems.length} item...`);
    
    // Normalizzazione
    const normalized = allItems
      .map(item => normalizeItem(item, 'multi_provider'))
      .filter((item): item is NormalizedMention => item !== null);
    
    console.log(`✓ ${normalized.length} item normalizzati`);
    
    // Deduplicazione
    const deduplicatedItems = this.deduplicateItems(normalized, strategy);
    
    console.log(`✓ ${deduplicatedItems.length} item dopo deduplicazione`);
    
    return deduplicatedItems;
  }

  /**
   * Rimuove duplicati basato sulla strategia specificata
   */
  private deduplicateItems(
    items: NormalizedMention[], 
    strategy: 'url' | 'title' | 'url_and_title'
  ): NormalizedMention[] {
    const seen = new Set<string>();
    const deduplicated: NormalizedMention[] = [];
    
    for (const item of items) {
      let key: string;
      
      switch (strategy) {
        case 'url':
          key = item.url || item.testo || '';
          break;
        case 'title':
          key = item.testo || '';
          break;
        case 'url_and_title':
          key = `${item.url || ''}:${item.testo || ''}`;
          break;
        default:
          key = item.url || item.testo || '';
      }
      
      if (!seen.has(key) && key.length > 0) {
        seen.add(key);
        deduplicated.push(item);
      }
    }
    
    return deduplicated;
  }

  /**
   * Salva i contenuti normalizzati nel database
   */
  private async saveToDatabase(items: NormalizedMention[]): Promise<number> {
    if (items.length === 0) return 0;
    
    let savedCount = 0;
    
    console.log(`💾 Salvataggio ${items.length} item nel database...`);
    
    for (const item of items) {
      try {
        // Verifica se esiste già nel database
        const existing = await prisma.contenutiMonitorati.findFirst({
          where: {
            OR: [
              { url: item.url },
              item.url ? {} : { 
                AND: [
                  { testo: { contains: item.testo.substring(0, 100) } },
                  { fonte: item.fonte }
                ]
              }
            ].filter(condition => Object.keys(condition).length > 0)
          }
        });
        
        if (!existing) {
          await prisma.contenutiMonitorati.create({
            data: {
              testo: item.testo,
              url: item.url,
              fonte: item.fonte,
              piattaforma: item.piattaforma,
              autore: item.autore,
              dataPost: item.dataPost,
              sentiment: item.sentiment,
              sentimentScore: item.sentimentScore,
              rilevanza: item.rilevanza,
              keywords: item.keywords || []
            }
          });
          
          savedCount++;
        }
        
      } catch (error) {
        console.error(`❌ Errore salvataggio item "${item.testo.substring(0, 50)}...":`, error);
      }
    }
    
    console.log(`✅ ${savedCount} nuovi item salvati nel database`);
    
    return savedCount;
  }

  /**
   * Testa la connessione di tutti i provider
   */
  async testAllProviders(): Promise<Record<string, boolean>> {
    const providerCodes = ['awario', 'webzio', 'serpapi_google_news', 'serpapi_reddit'];
    const results: Record<string, boolean> = {};
    
    console.log('🔧 Test connessione provider...');
    
    for (const code of providerCodes) {
      try {
        const provider = this.registry.getProvider(code as any);
        
        if ('testConnection' in provider && typeof provider.testConnection === 'function') {
          const connectionResult = await provider.testConnection();
          results[code] = connectionResult.success;
          console.log(`${connectionResult.success ? '✅' : '❌'} ${code}: ${connectionResult.message}`);
        } else {
          results[code] = true; // Assumi funzionante se non ha test
          console.log(`⚠️ ${code}: nessun test di connessione disponibile`);
        }
        
      } catch (error) {
        results[code] = false;
        console.error(`❌ ${code}: ${error instanceof Error ? error.message : error}`);
      }
    }
    
    return results;
  }

  /**
   * Ottiene statistiche di ingestion recente
   */
  async getIngestionStats(days: number = 7): Promise<{
    totalItems: number;
    itemsBySource: Record<string, number>;
    itemsByDay: Record<string, number>;
    sentimentDistribution: Record<string, number>;
  }> {
    const since = new Date();
    since.setDate(since.getDate() - days);
    
    const items = await prisma.contenutiMonitorati.findMany({
      where: {
        dataPost: {
          gte: since
        }
      },
      select: {
        fonte: true,
        dataPost: true,
        sentiment: true
      }
    });
    
    const stats = {
      totalItems: items.length,
      itemsBySource: {} as Record<string, number>,
      itemsByDay: {} as Record<string, number>,
      sentimentDistribution: {} as Record<string, number>
    };
    
    for (const item of items) {
      // Per fonte
      stats.itemsBySource[item.fonte] = (stats.itemsBySource[item.fonte] || 0) + 1;
      
      // Per giorno
      const day = item.dataPost.toISOString().split('T')[0];
      stats.itemsByDay[day] = (stats.itemsByDay[day] || 0) + 1;
      
      // Per sentiment
      stats.sentimentDistribution[item.sentiment] = (stats.sentimentDistribution[item.sentiment] || 0) + 1;
    }
    
    return stats;
  }
}

/**
 * Istanza singleton del servizio
 */
export const ingestionService = new MultiProviderIngestionService();

/**
 * Funzioni di utilità per l'ingestion
 */

/**
 * Esegue ingestion rapida per profilo ad alta priorità
 */
export async function quickIngest(profileId: string): Promise<IngestionResult> {
  return ingestionService.ingestByProfile(profileId, {
    maxItemsPerProvider: 50,
    maxItemsTotal: 200,
    timeoutMs: 120000 // 2 minuti
  });
}

/**
 * Esegue ingestion completa per tutti i profili
 */
export async function fullIngest(): Promise<IngestionResult[]> {
  return ingestionService.ingestAllProfiles({
    maxItemsPerProvider: 200,
    maxItemsTotal: 1000,
    timeoutMs: 600000 // 10 minuti
  });
}

/**
 * Esegue ingestion in modalità mock per testing
 */
export async function mockIngest(profileId?: string): Promise<IngestionResult | IngestionResult[]> {
  const options: IngestionOptions = {
    maxItemsPerProvider: 20,
    maxItemsTotal: 100,
    saveToDatabase: false,
    dryRun: true
  };
  
  if (profileId) {
    return ingestionService.ingestByProfile(profileId, options);
  } else {
    return ingestionService.ingestAllProfiles(options);
  }
}