

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { awarioClient } from '@/lib/awario-client';

export const dynamic = 'force-dynamic';

/**
 * Test di connessione e recupero dati di esempio da Awario
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
    }

    console.log('🧪 Test connessione Awario...');

    // 1. Test connessione
    const connectionTest = await awarioClient.testConnection();
    console.log('🔗 Test connessione:', connectionTest);

    // 2. Test recupero menzioni (con keywords di esempio)
    const testKeywords = ['olio roma', 'DOP sabina', 'IGP lazio'];
    
    const mentions = await awarioClient.getMentions({
      keywords: testKeywords,
      limit: 10,
      languages: ['it']
    });

    console.log(`📥 Test recupero: ${mentions.length} menzioni`);

    // 3. Test conversione a formato interno
    const convertedMentions = mentions.slice(0, 3).map(mention => 
      awarioClient.convertToContento(mention, testKeywords)
    );

    return NextResponse.json({
      success: true,
      connection: connectionTest,
      testData: {
        keywords: testKeywords,
        mentionsCount: mentions.length,
        sampleMentions: mentions.slice(0, 3),
        convertedSamples: convertedMentions
      },
      message: connectionTest.success 
        ? 'Test completato con successo - API Awario funzionante'
        : 'Test completato - utilizzando dati simulati (API non configurata)',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Errore test Awario:', error);
    return NextResponse.json({ 
      success: false,
      error: 'Errore durante il test',
      details: String(error),
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

/**
 * Test di inserimento di una menzione di esempio nel database
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
    }

    const { text, platform, author } = await request.json();

    if (!text) {
      return NextResponse.json({ error: 'Testo richiesto' }, { status: 400 });
    }

    console.log('🧪 Test inserimento menzione simulata...');

    // Simula una menzione Awario
    const simulatedMention = {
      id: `test_${Date.now()}`,
      text: text,
      url: `https://example.com/post/${Date.now()}`,
      author: author || 'Test User',
      source: 'social',
      language: 'it',
      sentiment: Math.random() * 2 - 1, // Random tra -1 e 1
      reach: Math.floor(Math.random() * 10000),
      date: new Date().toISOString(),
      tags: ['test', 'simulato']
    };

    // Converte nel formato interno
    const testKeywords = ['olio roma', 'DOP sabina', 'IGP lazio'];
    const converted = awarioClient.convertToContento(simulatedMention, testKeywords);

    return NextResponse.json({
      success: true,
      message: 'Test inserimento completato',
      data: {
        original: simulatedMention,
        converted: converted,
        wouldMatch: converted.keywords.length > 0
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Errore test inserimento:', error);
    return NextResponse.json({ 
      success: false,
      error: 'Errore durante il test inserimento',
      details: String(error),
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
