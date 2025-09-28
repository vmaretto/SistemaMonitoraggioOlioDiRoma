/**
 * Profili di ricerca per il sistema multi-provider
 * Definisce quali provider usare per diversi tipi di monitoraggio
 */

import { ProviderCode } from '../integrations/registry';
import { SearchParams } from '../integrations/types';

/**
 * Profilo di ricerca con provider specifici e configurazione
 */
export interface SearchProfile {
  id: string;
  name: string;
  description: string;
  
  // Provider da utilizzare per questo profilo
  providers: ProviderCode[];
  
  // Query predefinite per questo profilo
  queries: SearchQuery[];
  
  // Configurazione di ricerca
  searchConfig: {
    // Parametri di base
    language: string;
    country: string;
    
    // Dimensioni batch per provider
    batchSize: number;
    
    // Filtri temporali
    timeRange?: {
      from?: string; // ISO date or relative like "7d"
      to?: string;
    };
    
    // Frequenza di aggiornamento (in minuti)
    updateFrequency: number;
    
    // Priorità del profilo (1-10)
    priority: number;
  };
  
  // Configurazione provider-specific
  providerSettings?: {
    [K in ProviderCode]?: Partial<SearchParams>;
  };
}

/**
 * Query di ricerca con varianti e sinonimi
 */
export interface SearchQuery {
  primary: string;           // Query principale
  variants?: string[];       // Varianti della query
  boost?: number;           // Moltiplicatore rilevanza (default 1.0)
  category?: string;        // Categoria della query
  negative?: string[];      // Termini da escludere
}

/**
 * Profilo Brand Monitoring - Protezione marchi DOP/IGP
 */
export const BRAND_MONITORING_PROFILE: SearchProfile = {
  id: 'brand_monitoring',
  name: 'Monitoraggio Marchi',
  description: 'Monitoraggio protezione marchi DOP/IGP del Lazio per identificare usi impropri e contraffazioni',
  
  providers: ['awario', 'webzio', 'serpapi_google_news'],
  
  queries: [
    {
      primary: 'olio DOP Sabina',
      variants: [
        'olio extravergine DOP Sabina',
        'DOP Sabina olive oil',
        'olio Sabina DOP'
      ],
      boost: 1.5,
      category: 'denominazione_ufficiale',
      negative: ['imitazione', 'tipo', 'stile']
    },
    {
      primary: 'olio IGP Colli Albani',
      variants: [
        'IGP Colli Albani',
        'olio extravergine IGP Colli Albani',
        'Colli Albani olive oil'
      ],
      boost: 1.3,
      category: 'denominazione_ufficiale'
    },
    {
      primary: 'olio DOP Roma',
      variants: [
        'olio extravergine DOP Roma',
        'DOP Roma olive oil'
      ],
      boost: 1.4,
      category: 'denominazione_ufficiale'
    },
    {
      primary: 'Consorzio Olio Roma',
      variants: [
        'Consorzio tutela olio Roma',
        'Consorzio DOP Roma'
      ],
      boost: 1.2,
      category: 'ente_controllo'
    }
  ],
  
  searchConfig: {
    language: 'it',
    country: 'it',
    batchSize: 50,
    timeRange: {
      from: '7d'
    },
    updateFrequency: 120, // 2 ore
    priority: 9
  },
  
  providerSettings: {
    awario: {
      language: 'it',
      country: 'it'
    },
    webzio: {
      language: 'it',
      country: 'it'
    },
    serpapi_google_news: {
      language: 'it',
      country: 'it'
    }
  }
};

/**
 * Profilo Evocazioni - Monitoraggio uso improprio denominazioni
 */
export const EVOCAZIONI_MONITORING_PROFILE: SearchProfile = {
  id: 'evocazioni_monitoring',
  name: 'Monitoraggio Evocazioni',
  description: 'Rilevamento uso improprio o evocativo di denominazioni DOP/IGP protette',
  
  providers: ['webzio', 'serpapi_reddit', 'awario'],
  
  queries: [
    {
      primary: 'olio tipo Sabina',
      variants: [
        'olio stile Sabina',
        'olio come Sabina',
        'alla maniera di Sabina'
      ],
      boost: 2.0,
      category: 'evocazione_diretta'
    },
    {
      primary: 'olio tradizione laziale',
      variants: [
        'olio tradizionale Lazio',
        'antico olio romano',
        'olio dei Castelli'
      ],
      boost: 1.7,
      category: 'evocazione_geografica'
    },
    {
      primary: 'frantoio Sabina',
      variants: [
        'molino Sabina',
        'oleificio Sabina'
      ],
      boost: 1.5,
      category: 'evocazione_processo'
    },
    {
      primary: 'olive Colli Albani',
      variants: [
        'varietà Colli Albani',
        'cultivar Colli Albani'
      ],
      boost: 1.6,
      category: 'evocazione_varietale'
    }
  ],
  
  searchConfig: {
    language: 'it',
    country: 'it',
    batchSize: 30,
    timeRange: {
      from: '14d'
    },
    updateFrequency: 180, // 3 ore
    priority: 8
  }
};

/**
 * Profilo Criticità - Monitoraggio problemi e controversie
 */
export const CRITICITA_MONITORING_PROFILE: SearchProfile = {
  id: 'criticita_monitoring',
  name: 'Monitoraggio Criticità',
  description: 'Rilevamento problemi qualità, controversie e criticità per oli DOP/IGP del Lazio',
  
  providers: ['serpapi_google_news', 'serpapi_reddit', 'webzio'],
  
  queries: [
    {
      primary: 'contraffazione olio DOP',
      variants: [
        'falso olio DOP',
        'truffa olio extravergine',
        'olio DOP sequestrato'
      ],
      boost: 2.5,
      category: 'contraffazione'
    },
    {
      primary: 'problemi qualità olio Lazio',
      variants: [
        'difetti olio extravergine Lazio',
        'richiamo olio Roma',
        'contaminazione olio'
      ],
      boost: 2.2,
      category: 'qualita'
    },
    {
      primary: 'controlli NAS olio',
      variants: [
        'carabinieri controlli oleifici',
        'sequestro frantoio',
        'sanzioni olio'
      ],
      boost: 2.8,
      category: 'controlli_autorità'
    },
    {
      primary: 'prezzi olio extravergine',
      variants: [
        'costo olio DOP',
        'aumento prezzo olio',
        'mercato olio Lazio'
      ],
      boost: 1.5,
      category: 'mercato'
    }
  ],
  
  searchConfig: {
    language: 'it',
    country: 'it',
    batchSize: 25,
    timeRange: {
      from: '3d'
    },
    updateFrequency: 60, // 1 ora
    priority: 10
  }
};

/**
 * Profilo Trend Mercato - Monitoraggio andamenti e opportunità
 */
export const TREND_MERCATO_PROFILE: SearchProfile = {
  id: 'trend_mercato',
  name: 'Trend Mercato',
  description: 'Monitoraggio tendenze mercato, innovazioni e opportunità commerciali',
  
  providers: ['serpapi_google_news', 'webzio', 'awario'],
  
  queries: [
    {
      primary: 'export olio italiano',
      variants: [
        'esportazioni olio extravergine',
        'mercati internazionali olio',
        'olio DOP estero'
      ],
      boost: 1.3,
      category: 'export'
    },
    {
      primary: 'sostenibilità olivicoltura',
      variants: [
        'olio biologico Lazio',
        'olivicoltura sostenibile',
        'certificazioni ambientali olio'
      ],
      boost: 1.4,
      category: 'sostenibilita'
    },
    {
      primary: 'innovazione frantoi',
      variants: [
        'tecnologia olearia',
        'modernizzazione frantoi',
        'nuove tecniche spremitura'
      ],
      boost: 1.2,
      category: 'innovazione'
    },
    {
      primary: 'turismo oleario Lazio',
      variants: [
        'agriturismi oli DOP',
        'visite frantoi',
        'degustazioni olio'
      ],
      boost: 1.1,
      category: 'turismo'
    }
  ],
  
  searchConfig: {
    language: 'it',
    country: 'it',
    batchSize: 40,
    timeRange: {
      from: '30d'
    },
    updateFrequency: 360, // 6 ore
    priority: 6
  }
};

/**
 * Profilo Internazionale - Monitoraggio mercati esteri
 */
export const INTERNATIONAL_MONITORING_PROFILE: SearchProfile = {
  id: 'international_monitoring',
  name: 'Monitoraggio Internazionale',
  description: 'Monitoraggio presenza oli DOP/IGP del Lazio sui mercati internazionali',
  
  providers: ['serpapi_reddit', 'webzio'],
  
  queries: [
    {
      primary: 'Italian olive oil DOP',
      variants: [
        'Italian extra virgin olive oil',
        'Lazio olive oil',
        'Roman olive oil DOP'
      ],
      boost: 1.0,
      category: 'presenza_internazionale'
    },
    {
      primary: 'Sabina olive oil',
      variants: [
        'DOP Sabina oil',
        'Sabina extra virgin'
      ],
      boost: 1.4,
      category: 'brand_specifico'
    },
    {
      primary: 'Italian olive oil price',
      variants: [
        'premium Italian olive oil',
        'authentic Italian EVOO',
        'certified Italian olive oil'
      ],
      boost: 1.1,
      category: 'posizionamento_mercato'
    }
  ],
  
  searchConfig: {
    language: 'en',
    country: 'us',
    batchSize: 35,
    timeRange: {
      from: '14d'
    },
    updateFrequency: 480, // 8 ore
    priority: 5
  },
  
  providerSettings: {
    serpapi_reddit: {
      language: 'en',
      country: 'us'
    },
    webzio: {
      language: 'en',
      country: 'us'
    }
  }
};

/**
 * Registry di tutti i profili disponibili
 */
export const SEARCH_PROFILES: Record<string, SearchProfile> = {
  brand_monitoring: BRAND_MONITORING_PROFILE,
  evocazioni_monitoring: EVOCAZIONI_MONITORING_PROFILE,
  criticita_monitoring: CRITICITA_MONITORING_PROFILE,
  trend_mercato: TREND_MERCATO_PROFILE,
  international_monitoring: INTERNATIONAL_MONITORING_PROFILE
};

/**
 * Ottiene un profilo per ID
 */
export function getSearchProfile(profileId: string): SearchProfile | null {
  return SEARCH_PROFILES[profileId] || null;
}

/**
 * Ottiene tutti i profili ordinati per priorità
 */
export function getAllSearchProfiles(): SearchProfile[] {
  return Object.values(SEARCH_PROFILES)
    .sort((a, b) => b.searchConfig.priority - a.searchConfig.priority);
}

/**
 * Ottiene profili per provider specifico
 */
export function getProfilesForProvider(provider: ProviderCode): SearchProfile[] {
  return Object.values(SEARCH_PROFILES)
    .filter(profile => profile.providers.includes(provider))
    .sort((a, b) => b.searchConfig.priority - a.searchConfig.priority);
}

/**
 * Genera SearchParams per un profilo e query specifica
 */
export function buildSearchParams(
  profile: SearchProfile, 
  query: SearchQuery,
  provider?: ProviderCode
): SearchParams {
  const baseParams: SearchParams = {
    q: query.primary,
    language: profile.searchConfig.language,
    country: profile.searchConfig.country,
    size: profile.searchConfig.batchSize
  };

  // Applica time range se specificato
  const { timeRange } = profile.searchConfig;
  if (timeRange?.from) {
    const fromValue = timeRange.from;
    
    if (fromValue.endsWith('d')) {
      const days = parseInt(fromValue.replace('d', ''));
      const fromDate = new Date();
      fromDate.setDate(fromDate.getDate() - days);
      baseParams.from = fromDate.toISOString().split('T')[0];
    } else {
      baseParams.from = fromValue;
    }
    
    if (timeRange.to) {
      baseParams.to = timeRange.to;
    }
  }

  // Applica provider-specific settings
  if (provider && profile.providerSettings?.[provider]) {
    Object.assign(baseParams, profile.providerSettings[provider]);
  }

  return baseParams;
}

/**
 * Espande le query di un profilo includendo le varianti
 */
export function expandProfileQueries(profile: SearchProfile): string[] {
  const allQueries: string[] = [];
  
  for (const query of profile.queries) {
    allQueries.push(query.primary);
    
    if (query.variants) {
      allQueries.push(...query.variants);
    }
  }
  
  return allQueries;
}

/**
 * Calcola il peso/boost totale per una query
 */
export function calculateQueryBoost(query: SearchQuery): number {
  return query.boost || 1.0;
}

/**
 * Filtra profili per priorità minima
 */
export function getHighPriorityProfiles(minPriority: number = 7): SearchProfile[] {
  return Object.values(SEARCH_PROFILES)
    .filter(profile => profile.searchConfig.priority >= minPriority)
    .sort((a, b) => b.searchConfig.priority - a.searchConfig.priority);
}

/**
 * Ottiene la configurazione di aggiornamento per un profilo
 */
export function getUpdateSchedule(profileId: string): { intervalMinutes: number; priority: number } | null {
  const profile = getSearchProfile(profileId);
  if (!profile) return null;
  
  return {
    intervalMinutes: profile.searchConfig.updateFrequency,
    priority: profile.searchConfig.priority
  };
}