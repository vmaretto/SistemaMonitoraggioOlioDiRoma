import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import OpenAI from 'openai';
import { analyzeSentimentBase, compareAnalysisMethods } from '@/lib/keyword-matching';
import { prisma } from '@/lib/db';
import { format, startOfDay, endOfDay } from 'date-fns';

// the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export const dynamic = 'force-dynamic';

/**
 * GET - Recupera statistiche aggregate del sentiment dai contenuti monitorati
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const inizio = searchParams.get('inizio');
    const fine = searchParams.get('fine');
    const keyword = searchParams.get('keyword');
    const piattaforma = searchParams.get('piattaforma');

    // Query contenuti con filtri
    const whereClause: any = {};

    if (inizio || fine) {
      whereClause.dataPost = {};
      if (inizio) whereClause.dataPost.gte = new Date(inizio);
      if (fine) whereClause.dataPost.lte = new Date(fine);
    }

    if (piattaforma && piattaforma !== 'all') {
      whereClause.piattaforma = piattaforma;
    }

    const contenuti = await prisma.contenutiMonitorati.findMany({
      where: whereClause,
      orderBy: { dataPost: 'asc' }
    });

    // Filtra per keyword se specificata (Prisma non supporta has su array per tutti i DB)
    let filteredContenuti = contenuti;
    if (keyword && keyword !== 'all') {
      filteredContenuti = contenuti.filter(c =>
        c.keywords.some(k => k.toLowerCase().includes(keyword.toLowerCase()))
      );
    }

    // Aggrega per timeline (per giorno)
    const timelineMap = new Map<string, { positivi: number; neutri: number; negativi: number; scores: number[] }>();

    filteredContenuti.forEach(c => {
      const dateKey = format(new Date(c.dataPost), 'yyyy-MM-dd');

      if (!timelineMap.has(dateKey)) {
        timelineMap.set(dateKey, { positivi: 0, neutri: 0, negativi: 0, scores: [] });
      }

      const entry = timelineMap.get(dateKey)!;
      entry.scores.push(c.sentimentScore);

      if (c.sentiment === 'positivo') entry.positivi++;
      else if (c.sentiment === 'negativo') entry.negativi++;
      else entry.neutri++;
    });

    const timeline = Array.from(timelineMap.entries()).map(([date, data]) => ({
      date,
      positivi: data.positivi,
      neutri: data.neutri,
      negativi: data.negativi,
      media: data.scores.length > 0
        ? data.scores.reduce((a, b) => a + b, 0) / data.scores.length
        : 0
    }));

    // Aggrega per keyword
    const keywordMap = new Map<string, { positivi: number; neutri: number; negativi: number; scores: number[] }>();

    filteredContenuti.forEach(c => {
      c.keywords.forEach(kw => {
        if (!keywordMap.has(kw)) {
          keywordMap.set(kw, { positivi: 0, neutri: 0, negativi: 0, scores: [] });
        }

        const entry = keywordMap.get(kw)!;
        entry.scores.push(c.sentimentScore);

        if (c.sentiment === 'positivo') entry.positivi++;
        else if (c.sentiment === 'negativo') entry.negativi++;
        else entry.neutri++;
      });
    });

    const keywords = Array.from(keywordMap.entries()).map(([kw, data]) => ({
      keyword: kw,
      positivi: data.positivi,
      neutri: data.neutri,
      negativi: data.negativi,
      totali: data.positivi + data.neutri + data.negativi,
      media: data.scores.length > 0
        ? data.scores.reduce((a, b) => a + b, 0) / data.scores.length
        : 0
    })).sort((a, b) => b.totali - a.totali);

    // Aggrega per piattaforma
    const piattaformaMap = new Map<string, { positivi: number; neutri: number; negativi: number; scores: number[] }>();

    filteredContenuti.forEach(c => {
      const plat = c.piattaforma || 'unknown';

      if (!piattaformaMap.has(plat)) {
        piattaformaMap.set(plat, { positivi: 0, neutri: 0, negativi: 0, scores: [] });
      }

      const entry = piattaformaMap.get(plat)!;
      entry.scores.push(c.sentimentScore);

      if (c.sentiment === 'positivo') entry.positivi++;
      else if (c.sentiment === 'negativo') entry.negativi++;
      else entry.neutri++;
    });

    const piattaforme = Array.from(piattaformaMap.entries()).map(([plat, data]) => ({
      piattaforma: plat,
      positivi: data.positivi,
      neutri: data.neutri,
      negativi: data.negativi,
      totali: data.positivi + data.neutri + data.negativi,
      media: data.scores.length > 0
        ? data.scores.reduce((a, b) => a + b, 0) / data.scores.length
        : 0
    })).sort((a, b) => b.totali - a.totali);

    return NextResponse.json({
      timeline,
      keywords,
      piattaforme,
      totale: filteredContenuti.length
    });

  } catch (error) {
    console.error('Errore nel recupero statistiche sentiment:', error);
    return NextResponse.json({
      error: 'Errore nel recupero delle statistiche',
      details: error instanceof Error ? error.message : 'Errore sconosciuto'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
    }

    const { testo, keywords, compareMode } = await request.json();

    if (!testo) {
      return NextResponse.json({ error: 'Testo richiesto per l\'analisi' }, { status: 400 });
    }

    // Se è richiesta la modalità confronto (per il pulsante "Test AI")
    if (compareMode) {
      const comparison = await compareAnalysisMethods(testo);
      return NextResponse.json({
        success: true,
        mode: 'comparison',
        ...comparison
      });
    }

    // Modalità normale: solo AI (comportamento originale)
    
    // Chiamata a OpenAI per sentiment analysis
    const response = await openai.chat.completions.create({
      model: "gpt-5",
      messages: [
        {
          role: "system",
          content: `Sei un esperto di analisi del sentiment per contenuti relativi all'olio d'oliva del Lazio/Roma e alle sue etichette.
Rispondi sempre in JSON con questo formato:
{
  "sentiment": "positivo" | "neutro" | "negativo",
  "sentimentScore": number (da -1 a 1),
  "rilevanza": number (0-100),
  "keywordsRilevate": ["keyword1", "keyword2"],
  "ragionamento": "spiegazione breve"
}

Considera:
- Sentiment positivo: apprezzamento, qualità, tradizione
- Sentiment negativo: critiche, problemi, delusioni  
- Rilevanza alta: contenuti specifici su DOP/IGP, produttori del Lazio
- Rilevanza bassa: menzioni generiche o fuori contesto`
        },
        {
          role: "user",
          content: `Analizza il sentiment di questo testo:
"${testo}"

Keywords di riferimento: ${keywords?.join(', ') || 'Olio Roma, Olio Lazio'}`
        }
      ],
      response_format: { type: "json_object" },
      max_completion_tokens: 1000
    });

    const analysisText = response.choices?.[0]?.message?.content;
    
    if (!analysisText) {
      throw new Error('Risposta OpenAI non valida');
    }

    // Parse della risposta JSON
    let analysis;
    try {
      analysis = JSON.parse(analysisText);
    } catch (parseError) {
      console.error('Errore nel parsing della risposta OpenAI:', analysisText);
      
      // Fallback con analisi basica
      const baseAnalysis = analyzeSentimentBase(testo);
      analysis = {
        sentiment: baseAnalysis.sentiment,
        sentimentScore: baseAnalysis.score,
        rilevanza: keywords?.some((k: string) => testo.toLowerCase().includes(k.toLowerCase())) ? 70 : 30,
        keywordsRilevate: keywords?.filter((k: string) => testo.toLowerCase().includes(k.toLowerCase())) || [],
        ragionamento: 'Analisi automatica di fallback'
      };
    }

    return NextResponse.json({
      success: true,
      mode: 'ai-only',
      analysis
    });

  } catch (error) {
    console.error('Errore nell\'analisi del sentiment:', error);
    return NextResponse.json({ 
      error: 'Errore nell\'analisi del sentiment',
      details: error instanceof Error ? error.message : 'Errore sconosciuto'
    }, { status: 500 });
  }
}
