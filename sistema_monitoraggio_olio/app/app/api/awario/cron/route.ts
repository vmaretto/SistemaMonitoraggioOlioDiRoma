

import { NextRequest, NextResponse } from 'next/server';
import { awarioSync } from '@/lib/awario-sync';

export const dynamic = 'force-dynamic';

/**
 * Endpoint per sincronizzazione automatica via cron job
 * Verifica token segreto per sicurezza
 */
export async function POST(request: NextRequest) {
  try {
    // Verifica token segreto per cron jobs
    const cronSecret = process.env.CRON_SECRET || 'default-secret';
    const providedSecret = request.headers.get('x-cron-secret') || 
                          request.headers.get('authorization')?.replace('Bearer ', '');

    if (providedSecret !== cronSecret) {
      console.log('❌ Tentativo accesso cron non autorizzato');
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
    }

    console.log('⏰ Avvio sincronizzazione automatica Awario...');

    // Esegue la sincronizzazione
    const result = await awarioSync.syncAllMentions();
    
    // Pulizia dati vecchi (opzionale)
    const cleanedCount = await awarioSync.cleanOldData();
    
    // Log risultati
    console.log(`✅ Sincronizzazione automatica completata:`);
    console.log(`   - Nuove menzioni: ${result.newMentions}`);
    console.log(`   - Menzioni aggiornate: ${result.updatedMentions}`);
    console.log(`   - Contenuti vecchi eliminati: ${cleanedCount}`);
    console.log(`   - Errori: ${result.errors.length}`);

    return NextResponse.json({
      success: result.success,
      message: result.message,
      data: {
        newMentions: result.newMentions,
        updatedMentions: result.updatedMentions,
        cleanedCount,
        errors: result.errors
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Errore sincronizzazione automatica Awario:', error);
    
    return NextResponse.json({ 
      success: false,
      error: 'Errore durante la sincronizzazione automatica',
      details: String(error),
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

/**
 * Health check per il servizio di sincronizzazione
 */
export async function GET(request: NextRequest) {
  try {
    const stats = await awarioSync.getSyncStats();
    
    return NextResponse.json({
      status: 'healthy',
      service: 'awario-sync',
      stats,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    return NextResponse.json({ 
      status: 'unhealthy',
      error: String(error),
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
