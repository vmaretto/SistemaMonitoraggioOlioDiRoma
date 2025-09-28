/**
 * API endpoint per testare ricerca diretta sui provider
 * POST /api/providers/search - esegue ricerca su provider specifici
 */

import { NextRequest, NextResponse } from 'next/server';
import { ProviderRegistry, buildProviderConfigFromEnv } from '@/src/integrations/registry';
import { normalizeItem } from '@/src/services/normalize';

const config = buildProviderConfigFromEnv();
const registry = new ProviderRegistry(config);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      provider, 
      query, 
      mockMode = false,
      size = 5 
    } = body;
    
    if (!provider || !query) {
      return NextResponse.json({
        success: false,
        message: 'Parametri richiesti: provider, query'
      }, { status: 400 });
    }
    
    console.log(`🔍 Test ricerca: ${provider} - "${query}" (mock: ${mockMode})`);
    
    try {
      const providerInstance = registry.getProvider(provider);
      
      const searchParams = {
        q: query,
        size,
        language: 'it',
        country: 'it'
      };
      
      const response = await providerInstance.search(searchParams);
      
      // Normalizza i risultati per il database
      const normalizedResults = response.results
        .map(item => normalizeItem(item, provider))
        .filter(item => item !== null);
      
      return NextResponse.json({
        success: true,
        message: `${response.results.length} risultati trovati da ${provider}`,
        data: {
          provider,
          query,
          mockMode,
          raw: response.results,
          normalized: normalizedResults,
          hasMore: !!response.next,
          nextToken: response.next
        }
      });
      
    } catch (providerError) {
      console.error(`❌ Errore provider ${provider}:`, providerError);
      
      return NextResponse.json({
        success: false,
        message: `Errore provider ${provider}`,
        error: providerError instanceof Error ? providerError.message : String(providerError)
      }, { status: 422 });
    }
    
  } catch (error) {
    console.error('❌ Errore ricerca provider:', error);
    
    return NextResponse.json({
      success: false,
      message: 'Errore interno durante ricerca',
      error: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}