

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { awarioSync } from '@/lib/awario-sync';
import { awarioClient } from '@/lib/awario-client';

export const dynamic = 'force-dynamic';

/**
 * Sincronizzazione manuale dei dati Awario
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
    }

    console.log('🔄 Avvio sincronizzazione manuale Awario...');

    // Esegue la sincronizzazione
    const result = await awarioSync.syncAllMentions();

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: result.message,
        data: {
          newMentions: result.newMentions,
          updatedMentions: result.updatedMentions,
          errors: result.errors
        }
      });
    } else {
      return NextResponse.json({
        success: false,
        message: result.message,
        errors: result.errors
      }, { status: 500 });
    }

  } catch (error) {
    console.error('❌ Errore sincronizzazione Awario:', error);
    return NextResponse.json({ 
      error: 'Errore durante la sincronizzazione',
      details: String(error)
    }, { status: 500 });
  }
}

/**
 * Ottieni statistiche di sincronizzazione
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
    }

    // Test connessione Awario
    const connectionTest = await awarioClient.testConnection();
    
    // Statistiche database
    const stats = await awarioSync.getSyncStats();

    return NextResponse.json({
      connection: connectionTest,
      stats: stats,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Errore recupero statistiche Awario:', error);
    return NextResponse.json({ 
      error: 'Errore recupero statistiche',
      details: String(error)
    }, { status: 500 });
  }
}
