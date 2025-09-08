
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
    }

    const { testo, keywords } = await request.json();

    if (!testo) {
      return NextResponse.json({ error: 'Testo richiesto per l\'analisi' }, { status: 400 });
    }

    // Chiamata al LLM API per sentiment analysis
    const response = await fetch('https://apps.abacus.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.ABACUSAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4.1-mini',
        messages: [{
          role: 'user',
          content: `Analizza il sentiment del seguente testo relativo all'olio d'oliva del Lazio/Roma e alle sue etichette.

Testo da analizzare: "${testo}"

Keywords di riferimento: ${keywords?.join(', ') || 'Olio Roma, Olio Lazio'}

Fornisci una risposta JSON con:
{
  "sentiment": "positivo|neutro|negativo",
  "sentimentScore": numero_tra_-1_e_1,
  "rilevanza": numero_0_100,
  "keywordsRilevate": ["keyword1", "keyword2"],
  "ragionamento": "spiegazione_breve"
}

Considera:
- Sentiment positivo: apprezzamento, qualità, tradizione
- Sentiment negativo: critiche, problemi, delusioni  
- Rilevanza alta: contenuti specifici su DOP/IGP, produttori del Lazio
- Rilevanza bassa: menzioni generiche o fuori contesto

Rispondi solo con JSON valido.`
        }],
        max_tokens: 1000,
        temperature: 0.3
      })
    });

    if (!response.ok) {
      throw new Error('Errore nella chiamata al LLM API');
    }

    const data = await response.json();
    const analysisText = data.choices?.[0]?.message?.content;

    if (!analysisText) {
      throw new Error('Risposta del LLM API non valida');
    }

    // Parse della risposta JSON
    let analysis;
    try {
      analysis = JSON.parse(analysisText);
    } catch (parseError) {
      console.error('Errore nel parsing della risposta LLM:', analysisText);
      // Fallback con analisi basica
      analysis = {
        sentiment: testo.toLowerCase().includes('buon') || testo.toLowerCase().includes('ottim') || 
                  testo.toLowerCase().includes('eccell') ? 'positivo' : 
                  testo.toLowerCase().includes('male') || testo.toLowerCase().includes('negat') || 
                  testo.toLowerCase().includes('deludent') ? 'negativo' : 'neutro',
        sentimentScore: 0,
        rilevanza: keywords?.some((k: string) => testo.toLowerCase().includes(k.toLowerCase())) ? 70 : 30,
        keywordsRilevate: keywords?.filter((k: string) => testo.toLowerCase().includes(k.toLowerCase())) || [],
        ragionamento: 'Analisi automatica di fallback'
      };
    }

    return NextResponse.json({
      success: true,
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
