/**
 * API endpoint per testare la connessione di tutti i provider
 * GET /api/providers/test - testa connessioni provider multi-provider
 * POST /api/providers/test - testa provider specifici
 */

import { NextRequest, NextResponse } from 'next/server';
import { MultiProviderIngestionService } from '@/src/services/ingestion';

const ingestionService = new MultiProviderIngestionService();

export async function GET() {
  try {
    console.log('🔧 Test connessione tutti i provider...');
    
    const results = await ingestionService.testAllProviders();
    
    // Raggruppa i provider logici: Webz.io (1) + SerpAPI (1 = google_news + reddit)
    const webzioWorking = results.webzio || false;
    const serpapiWorking = (results.serpapi_google_news || results.serpapi_reddit) || false;
    
    const logicalProviders = [webzioWorking, serpapiWorking];
    const totalLogicalProviders = 2; // Webz.io + SerpAPI
    const workingLogicalProviders = logicalProviders.filter(Boolean).length;
    
    const response = {
      success: workingLogicalProviders > 0,
      message: `${workingLogicalProviders}/${totalLogicalProviders} provider funzionanti`,
      providers: results,
      details: {
        webzio: results.webzio ? 'Connesso' : 'Errore connessione',
        serpapi_google_news: results.serpapi_google_news ? 'Connesso' : 'Errore connessione', 
        serpapi_reddit: results.serpapi_reddit ? 'Connesso' : 'Errore connessione'
      }
    };
    
    console.log(`✅ Test completato: ${workingLogicalProviders}/${totalLogicalProviders} provider funzionanti`);
    
    return NextResponse.json(response);
    
  } catch (error) {
    console.error('❌ Errore test provider:', error);
    
    return NextResponse.json({
      success: false,
      message: 'Errore durante il test dei provider',
      error: error instanceof Error ? error.message : String(error),
      providers: {}
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { providers = [], mockMode = false } = body;
    
    console.log(`🔧 Test provider specifici: ${providers.join(', ')}`);
    
    if (!Array.isArray(providers) || providers.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'Specificare almeno un provider da testare',
        providers: []
      }, { status: 400 });
    }
    
    const results = await ingestionService.testAllProviders();
    
    // Filtra solo i provider richiesti
    const filteredResults = Object.keys(results)
      .filter(key => providers.includes(key))
      .reduce((obj, key) => {
        obj[key] = results[key];
        return obj;
      }, {} as Record<string, boolean>);
    
    const workingCount = Object.values(filteredResults).filter(Boolean).length;
    
    return NextResponse.json({
      success: workingCount > 0,
      message: `${workingCount}/${providers.length} provider richiesti funzionanti`,
      providers: filteredResults,
      mockMode,
      tested: providers
    });
    
  } catch (error) {
    console.error('❌ Errore test provider specifici:', error);
    
    return NextResponse.json({
      success: false,
      message: 'Errore durante il test dei provider',
      error: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}