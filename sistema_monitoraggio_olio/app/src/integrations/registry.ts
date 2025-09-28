/**
 * Registry provider per istanziazione dinamica e gestione centralizzata
 * Factory pattern per creare provider da codici stringa con configurazione
 */

import { Provider } from './types';
import { AwarioProvider } from './awarioProvider';
import { WebzioProvider } from './webzioProvider';
import { 
  SerpApiGoogleNewsProvider, 
  SerpApiRedditProvider 
} from './serpapiProviders';

/**
 * Configurazione per ogni provider
 */
export interface ProviderConfig {
  // Chiavi API
  apiKey?: string;
  baseUrl?: string;
  
  // Configurazione mock
  mockMode: boolean;
  
  // Limiti e rate limiting
  rateLimit?: {
    requestsPerMinute: number;
    requestsPerHour: number;
  };
  
  // Timeout configuration
  timeout?: number;
  
  // Provider-specific options
  options?: Record<string, any>;
}

/**
 * Configurazione completa del sistema multi-provider
 */
export interface MultiProviderConfig {
  awario: ProviderConfig;
  webzio: ProviderConfig;
  serpapi_google_news: ProviderConfig;
  serpapi_reddit: ProviderConfig;
}

/**
 * Codici provider supportati
 */
export type ProviderCode = keyof MultiProviderConfig;

/**
 * Provider registry - punto centrale per istanziazione provider
 */
export class ProviderRegistry {
  private providers: Map<ProviderCode, Provider> = new Map();
  private config: MultiProviderConfig;

  constructor(config: MultiProviderConfig) {
    this.config = config;
  }

  /**
   * Ottiene un provider dal registry (lazy instantiation)
   */
  getProvider(code: ProviderCode): Provider {
    if (!this.providers.has(code)) {
      const provider = this.createProvider(code);
      this.providers.set(code, provider);
    }
    
    return this.providers.get(code)!;
  }

  /**
   * Ottiene tutti i provider attivi
   */
  getAllProviders(): Provider[] {
    const codes: ProviderCode[] = ['awario', 'webzio', 'serpapi_google_news', 'serpapi_reddit'];
    return codes.map(code => this.getProvider(code));
  }

  /**
   * Ottiene provider specifici per una lista di codici
   */
  getProviders(codes: ProviderCode[]): Provider[] {
    return codes.map(code => this.getProvider(code));
  }

  /**
   * Valida la configurazione del provider
   */
  validateConfig(code: ProviderCode): { valid: boolean; errors: string[] } {
    const config = this.config[code];
    const errors: string[] = [];

    if (!config) {
      errors.push(`Configuration missing for provider: ${code}`);
      return { valid: false, errors };
    }

    // Validazione API keys (solo se non in mock mode)
    if (!config.mockMode) {
      switch (code) {
        case 'awario':
          if (!config.apiKey || !config.baseUrl) {
            errors.push('Awario requires apiKey and baseUrl');
          }
          break;
        
        case 'webzio':
          if (!config.apiKey) {
            errors.push('Webz.io requires apiKey');
          }
          break;
        
        case 'serpapi_google_news':
        case 'serpapi_reddit':
          if (!config.apiKey) {
            errors.push(`SerpApi ${code} requires apiKey`);
          }
          break;
      }
    }

    return { valid: errors.length === 0, errors };
  }

  /**
   * Valida configurazione completa del registry
   */
  validateAllConfigs(): { valid: boolean; providerErrors: Record<string, string[]> } {
    const providerErrors: Record<string, string[]> = {};
    let allValid = true;

    for (const code of Object.keys(this.config) as ProviderCode[]) {
      const validation = this.validateConfig(code);
      if (!validation.valid) {
        allValid = false;
        providerErrors[code] = validation.errors;
      }
    }

    return { valid: allValid, providerErrors };
  }

  /**
   * Test connessione per tutti i provider
   */
  async testAllConnections(): Promise<Record<ProviderCode, boolean>> {
    const results: Record<ProviderCode, boolean> = {} as any;
    
    const providers: ProviderCode[] = ['awario', 'webzio', 'serpapi_google_news', 'serpapi_reddit'];
    
    for (const code of providers) {
      try {
        const provider = this.getProvider(code);
        // Test con query minimale
        await provider.search({ q: 'test', size: 1 });
        results[code] = true;
      } catch (error) {
        console.warn(`Connection test failed for ${code}:`, error);
        results[code] = false;
      }
    }

    return results;
  }

  /**
   * Ricrea un provider (forza reinstanziazione)
   */
  recreateProvider(code: ProviderCode): Provider {
    this.providers.delete(code);
    return this.getProvider(code);
  }

  /**
   * Clear provider cache
   */
  clearCache(): void {
    this.providers.clear();
  }

  /**
   * Factory method per creare provider
   */
  private createProvider(code: ProviderCode): Provider {
    const config = this.config[code];
    
    if (!config) {
      throw new Error(`No configuration found for provider: ${code}`);
    }

    switch (code) {
      case 'awario':
        return new AwarioProvider({
          apiKey: config.apiKey || '',
          baseUrl: config.baseUrl || '',
          mockMode: config.mockMode,
          timeout: config.timeout
        });

      case 'webzio':
        return new WebzioProvider({
          apiKey: config.apiKey || '',
          baseUrl: config.baseUrl,
          mockMode: config.mockMode,
          timeout: config.timeout
        });

      case 'serpapi_google_news':
        return new SerpApiGoogleNewsProvider({
          apiKey: config.apiKey || '',
          baseUrl: config.baseUrl,
          mockMode: config.mockMode,
          timeout: config.timeout
        });

      case 'serpapi_reddit':
        return new SerpApiRedditProvider({
          apiKey: config.apiKey || '',
          baseUrl: config.baseUrl,
          mockMode: config.mockMode,
          timeout: config.timeout
        });

      default:
        throw new Error(`Unknown provider code: ${code}`);
    }
  }
}

/**
 * Builds provider configuration from environment variables
 */
export function buildProviderConfigFromEnv(): MultiProviderConfig {
  return {
    awario: {
      apiKey: process.env.AWARIO_API_KEY,
      baseUrl: process.env.AWARIO_BASE_URL,
      mockMode: process.env.AWARIO_MOCK_MODE === 'true',
      timeout: parseInt(process.env.AWARIO_TIMEOUT || '30000'),
      rateLimit: {
        requestsPerMinute: 60,
        requestsPerHour: 1000
      }
    },
    
    webzio: {
      apiKey: process.env.WEBZIO_TOKEN,
      baseUrl: process.env.WEBZIO_BASE_URL,
      mockMode: process.env.WEBZIO_MOCK_MODE === 'true',
      timeout: parseInt(process.env.WEBZIO_TIMEOUT || '30000'),
      rateLimit: {
        requestsPerMinute: 100,
        requestsPerHour: 5000
      }
    },
    
    serpapi_google_news: {
      apiKey: process.env.SERPAPI_KEY,
      baseUrl: process.env.SERPAPI_BASE_URL,
      mockMode: process.env.SERPAPI_MOCK_MODE === 'true',
      timeout: parseInt(process.env.SERPAPI_TIMEOUT || '30000'),
      rateLimit: {
        requestsPerMinute: 100,
        requestsPerHour: 10000
      }
    },
    
    serpapi_reddit: {
      apiKey: process.env.SERPAPI_KEY,
      baseUrl: process.env.SERPAPI_BASE_URL,
      mockMode: process.env.SERPAPI_MOCK_MODE === 'true',
      timeout: parseInt(process.env.SERPAPI_TIMEOUT || '30000'),
      rateLimit: {
        requestsPerMinute: 100,
        requestsPerHour: 10000
      }
    }
  };
}

/**
 * Crea registry pre-configurato da environment variables
 */
export function createDefaultRegistry(): ProviderRegistry {
  const config = buildProviderConfigFromEnv();
  return new ProviderRegistry(config);
}

/**
 * Utility per ottenere provider singolo rapidamente
 */
export function getProvider(code: ProviderCode, config?: MultiProviderConfig): Provider {
  const registry = new ProviderRegistry(config || buildProviderConfigFromEnv());
  return registry.getProvider(code);
}

/**
 * Utility per ottenere tutti i provider configurati
 */
export function getAllProviders(config?: MultiProviderConfig): Provider[] {
  const registry = new ProviderRegistry(config || buildProviderConfigFromEnv());
  return registry.getAllProviders();
}

/**
 * Provider codes disponibili per validazione
 */
export const AVAILABLE_PROVIDER_CODES: ProviderCode[] = [
  'awario',
  'webzio', 
  'serpapi_google_news',
  'serpapi_reddit'
];

/**
 * Check se un codice provider è valido
 */
export function isValidProviderCode(code: string): code is ProviderCode {
  return AVAILABLE_PROVIDER_CODES.includes(code as ProviderCode);
}

/**
 * Logging per debugging registry
 */
export function logRegistryStatus(registry: ProviderRegistry): void {
  console.log('🔧 Provider Registry Status:');
  
  const validation = registry.validateAllConfigs();
  
  if (validation.valid) {
    console.log('✅ All provider configurations are valid');
  } else {
    console.log('❌ Configuration errors found:');
    Object.entries(validation.providerErrors).forEach(([provider, errors]) => {
      console.log(`  - ${provider}: ${errors.join(', ')}`);
    });
  }
}