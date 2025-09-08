
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { seedDemoData } from '@/lib/mock-data';

export const dynamic = 'force-dynamic';

/**
 * Carica i dati demo nel database
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
    }

    // Carica i dati demo
    const result = await seedDemoData(prisma);

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: 'Database popolato con dati demo completi di collegamenti keyword',
        details: {
          keywords: 6,
          contenuti: 8,
          collegamenti: 'Tutti i contenuti hanno keyword associate'
        }
      });
    } else {
      throw new Error(result.error);
    }

  } catch (error) {
    console.error('Errore nel caricamento dati demo:', error);
    return NextResponse.json({ 
      error: 'Errore nel caricamento dei dati demo',
      details: error instanceof Error ? error.message : 'Errore sconosciuto'
    }, { status: 500 });
  }
}

/**
 * Restituisce informazioni sui dati demo disponibili
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
    }

    // Conta i dati attuali nel database
    const [keywords, contenuti] = await Promise.all([
      prisma.keywords.count(),
      prisma.contenutiMonitorati.count()
    ]);

    return NextResponse.json({
      currentData: {
        keywords,
        contenuti
      },
      demoDataAvailable: {
        keywords: 6,
        contenuti: 8,
        features: [
          'Keywords categorizzate (primarie, secondarie, competitor)',
          'Contenuti con sentiment analysis',
          'Collegamenti automatici contenuti-keyword',
          'Dati da piattaforme reali (Instagram, Amazon, Facebook, etc.)',
          'Scores di rilevanza calcolati'
        ]
      }
    });

  } catch (error) {
    console.error('Errore nel recupero informazioni demo:', error);
    return NextResponse.json({ error: 'Errore interno del server' }, { status: 500 });
  }
}
