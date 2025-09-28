/**
 * API endpoint per eseguire ingestion multi-provider
 * POST /api/ingestion/run - avvia ingestion con profili e opzioni
 */

import { NextRequest, NextResponse } from 'next/server';
import { MultiProviderIngestionService } from '@/src/services/ingestion';

const ingestionService = new MultiProviderIngestionService();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      profile, 
      allProfiles = false,
      options = {}
    } = body;
    
    // Valida richiesta
    if (!allProfiles && !profile) {
      return NextResponse.json({
        success: false,
        message: 'Specificare un profile o impostare allProfiles=true'
      }, { status: 400 });
    }
    
    console.log(`🔄 Avvio ingestion ${allProfiles ? 'tutti i profili' : `profilo: ${profile}`}`);
    
    let results;
    
    if (allProfiles) {
      // Ingestion di tutti i profili
      results = await ingestionService.ingestAllProfiles(options);
      
      const totalNew = results.reduce((sum, r) => sum + r.newItems, 0);
      const totalErrors = results.reduce((sum, r) => sum + r.errors.length, 0);
      const successfulProfiles = results.filter(r => r.success).length;
      
      return NextResponse.json({
        success: totalNew > 0,
        message: `Ingestion completata: ${totalNew} nuovi item da ${successfulProfiles}/${results.length} profili`,
        data: {
          totalProfiles: results.length,
          successfulProfiles,
          totalNewItems: totalNew,
          totalErrors,
          results
        }
      });
      
    } else {
      // Ingestion di un singolo profilo
      const result = await ingestionService.ingestByProfile(profile, options);
      
      return NextResponse.json({
        success: result.success,
        message: result.success 
          ? `✅ ${result.newItems} nuovi item raccolti per ${profile}` 
          : `❌ Errore ingestion per ${profile}`,
        data: result
      });
    }
    
  } catch (error) {
    console.error('❌ Errore durante ingestion:', error);
    
    return NextResponse.json({
      success: false,
      message: 'Errore interno durante ingestion',
      error: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}

export async function GET() {
  try {
    // Ottiene statistiche ingestion recente
    const stats = await ingestionService.getIngestionStats(7);
    
    return NextResponse.json({
      success: true,
      message: 'Statistiche ingestion ultimi 7 giorni',
      data: stats
    });
    
  } catch (error) {
    console.error('❌ Errore recupero statistiche:', error);
    
    return NextResponse.json({
      success: false,
      message: 'Errore recupero statistiche ingestion',
      error: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}