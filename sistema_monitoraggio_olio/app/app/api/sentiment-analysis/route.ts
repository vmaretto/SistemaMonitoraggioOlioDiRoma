import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import OpenAI from 'openai';
import { analyzeSentimentBase, compareAnalysisMethods } from '@/lib/keyword-matching';

// the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export const dynamic = 'force-dynamic';

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
