import OpenAI from "openai";

// the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
// This is using OpenAI's API, which points to OpenAI's API servers and requires your own API key.
const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY,
  timeout: 30000, // 30 secondi timeout per chiamata
  maxRetries: 2,  // Retry automatico
});

/**
 * Helper per chiamate OpenAI con timeout personalizzato
 */
async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  operationName: string
): Promise<T> {
  const timeoutPromise = new Promise<T>((_, reject) => {
    setTimeout(() => {
      reject(new Error(`${operationName} timeout dopo ${timeoutMs}ms`));
    }, timeoutMs);
  });

  return Promise.race([promise, timeoutPromise]);
}

/**
 * Analizza il sentiment di un testo usando GPT-5
 */
export async function analyzeSentiment(text: string): Promise<{
  sentiment: 'positivo' | 'neutrale' | 'negativo';
  score: number;
  confidence: number;
}> {
  const startTime = Date.now();
  console.log('🔍 [Sentiment] Inizio analisi...');
  
  try {
    const response = await withTimeout(
      openai.chat.completions.create({
        model: "gpt-5",
        messages: [
          {
            role: "system",
            content: `Sei un esperto di analisi del sentiment. Analizza il sentiment del testo fornito e rispondi in JSON con questo formato:
{
  "sentiment": "positivo" | "neutrale" | "negativo",
  "score": number (da -1 a 1, dove -1 è molto negativo, 0 neutrale, 1 molto positivo),
  "confidence": number (da 0 a 1, indica la confidenza nell'analisi)
}`,
          },
          {
            role: "user",
            content: text,
          },
        ],
        response_format: { type: "json_object" },
        max_completion_tokens: 500,
      }),
      20000, // 20 secondi timeout
      'Sentiment Analysis'
    );

    const result = JSON.parse(response.choices[0].message.content || '{}');
    const duration = Date.now() - startTime;
    console.log(`✅ [Sentiment] Completato in ${duration}ms: ${result.sentiment}`);

    return {
      sentiment: result.sentiment || 'neutrale',
      score: Math.max(-1, Math.min(1, result.score || 0)),
      confidence: Math.max(0, Math.min(1, result.confidence || 0)),
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`❌ [Sentiment] Errore dopo ${duration}ms:`, error);
    throw new Error("Failed to analyze sentiment: " + (error instanceof Error ? error.message : 'Unknown error'));
  }
}

/**
 * Estrae testo da un'immagine di etichetta usando GPT-5 Vision
 */
export async function extractTextFromLabel(base64Image: string): Promise<string> {
  const startTime = Date.now();
  console.log('📸 [OCR] Inizio estrazione testo...');
  
  try {
    const response = await withTimeout(
      openai.chat.completions.create({
        model: "gpt-5",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Estrai tutto il testo visibile da questa etichetta di olio d'oliva. Concentrati su: nome prodotto, produttore, denominazione (DOP/IGP), zona geografica, volume, anno di raccolta, e qualsiasi altro testo presente. Fornisci solo il testo estratto, senza commenti aggiuntivi."
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:image/jpeg;base64,${base64Image}`
                }
              }
            ],
          },
        ],
        max_completion_tokens: 1000,
      }),
      30000, // 30 secondi timeout per OCR
      'OCR Extraction'
    );

    const extractedText = response.choices[0].message.content || '';
    const duration = Date.now() - startTime;
    console.log(`✅ [OCR] Completato in ${duration}ms, estratti ${extractedText.length} caratteri`);
    console.log(`📄 [OCR] Testo estratto: ${extractedText.substring(0, 200)}...`);

    return extractedText;
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`❌ [OCR] Errore dopo ${duration}ms:`, error);
    throw new Error("Failed to extract text from label: " + (error instanceof Error ? error.message : 'Unknown error'));
  }
}

/**
 * Analizza la conformità dell'etichetta rispetto alle regole DOP/IGP
 */
export async function analyzeConformity(testoOcr: string): Promise<{
  risultato: 'conforme' | 'non_conforme' | 'sospetto';
  percentualeMatch: number;
  violazioni: string[];
  note: string;
}> {
  const startTime = Date.now();
  console.log('📋 [Conformità] Inizio analisi...');
  
  try {
    const response = await withTimeout(
      openai.chat.completions.create({
        model: "gpt-5",
        messages: [
          {
            role: "system",
            content: `Sei un esperto di normative DOP/IGP per oli d'oliva. Analizza il testo dell'etichetta e verifica la conformità alle seguenti regole:
1. La denominazione DOP o IGP deve essere presente e corretta
2. Non deve esserci uso improprio di simboli romani (SPQR, aquila, ecc.) senza autorizzazione
3. Le indicazioni geografiche devono essere precise
4. Le informazioni obbligatorie devono essere presenti (produttore, volume, denominazione)

Rispondi in JSON con questo formato:
{
  "risultato": "conforme" | "non_conforme" | "sospetto",
  "percentualeMatch": number (0-100, percentuale di conformità),
  "violazioni": ["lista di violazioni rilevate"],
  "note": "note aggiuntive sull'analisi"
}`,
          },
          {
            role: "user",
            content: `Analizza questa etichetta:\n\n${testoOcr}`,
          },
        ],
        response_format: { type: "json_object" },
        max_completion_tokens: 1500,
      }),
      25000, // 25 secondi timeout
      'Conformity Analysis'
    );

    const content = response.choices[0].message.content;
    const duration = Date.now() - startTime;
    
    console.log(`   📄 Raw conformity response: ${content}`);
    
    let result: any;
    try {
      result = JSON.parse(content || '{}');
      console.log(`   ✅ JSON parsed:`, JSON.stringify(result, null, 2));
    } catch (parseError) {
      console.error(`   ❌ Errore parsing JSON conformità:`, parseError);
      result = {
        risultato: 'sospetto',
        percentualeMatch: 0,
        violazioni: ['Errore parsing risposta AI'],
        note: `Raw: ${content?.substring(0, 200)}`
      };
    }
    
    console.log(`✅ [Conformità] Completato in ${duration}ms: ${result.risultato} (${result.percentualeMatch}%)`);

    return {
      risultato: result.risultato || 'sospetto',
      percentualeMatch: Math.max(0, Math.min(100, result.percentualeMatch || 0)),
      violazioni: Array.isArray(result.violazioni) ? result.violazioni : [],
      note: result.note || '',
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`❌ [Conformità] Errore dopo ${duration}ms:`, error);
    throw new Error("Failed to analyze conformity: " + (error instanceof Error ? error.message : 'Unknown error'));
  }
}

/**
 * Confronta il testo OCR con i dati di un'etichetta ufficiale
 */
export async function compareTextWithOfficialLabel(
  testoOcr: string,
  officialData: {
    nome: string;
    produttore?: string | null;
    denominazione: string;
    regioneProduzione: string;
    comune?: string | null;
    tipoEtichetta?: string | null;
  }
): Promise<{
  matchScore: number;
  differences: string[];
  reasoning: string;
}> {
  const startTime = Date.now();
  console.log(`🔍 [Confronto Testo] Confronto con: ${officialData.nome}`);
  console.log(`   Testo OCR (primi 100 char): ${testoOcr.substring(0, 100)}...`);
  console.log(`   Dati ufficiali: nome="${officialData.nome}", denominazione="${officialData.denominazione}"`);
  
  try {
    const response = await withTimeout(
      openai.chat.completions.create({
        model: "gpt-5",
        messages: [
          {
            role: "system",
            content: `Sei un esperto di verifica etichette. Confronta il testo estratto con i dati dell'etichetta ufficiale e calcola una percentuale di match. 

IMPORTANTE: Se il testo OCR contiene il nome del prodotto o elementi della denominazione, il matchScore deve essere almeno 30%. Solo se non trovi NESSUNA corrispondenza usa 0%.

Rispondi in JSON:
{
  "matchScore": number (0-100, percentuale di match testuale),
  "differences": ["lista delle differenze testuali rilevate"],
  "reasoning": "spiegazione dettagliata del confronto con esempi"
}`,
          },
          {
            role: "user",
            content: `Testo estratto dall'etichetta:
${testoOcr}

Etichetta ufficiale di riferimento:
- Nome: ${officialData.nome}
- Produttore: ${officialData.produttore || 'N/A'}
- Denominazione: ${officialData.denominazione}
- Regione: ${officialData.regioneProduzione}
- Comune: ${officialData.comune || 'N/A'}
- Tipo: ${officialData.tipoEtichetta || 'N/A'}

Confronta nome prodotto, produttore, denominazione, regione e comune. Calcola il match score basandoti su quante informazioni corrispondono.`,
          },
        ],
        response_format: { type: "json_object" },
        max_completion_tokens: 1000,
      }),
      20000, // 20 secondi timeout
      `Text Comparison with ${officialData.nome}`
    );

    const content = response.choices[0].message.content;
    const duration = Date.now() - startTime;
    
    console.log(`   📄 Raw response COMPLETA: ${content}`);
    
    let result: any;
    try {
      result = JSON.parse(content || '{}');
      console.log(`   ✅ JSON parsed successfully:`, JSON.stringify(result, null, 2));
    } catch (parseError) {
      console.error(`   ❌ Errore parsing JSON:`, parseError);
      console.log(`   📄 Contenuto che ha causato errore: ${content}`);
      
      // Fallback: prova a estrarre numeri dal testo
      const scoreMatch = content?.match(/matchScore["\s:]+(\d+)/i);
      const extractedScore = scoreMatch ? parseInt(scoreMatch[1]) : 0;
      
      result = {
        matchScore: extractedScore,
        differences: ['Impossibile parsare risposta AI'],
        reasoning: `Raw response: ${content?.substring(0, 200)}`
      };
    }
    
    console.log(`✅ [Confronto Testo] Completato in ${duration}ms`);
    console.log(`   Match Score: ${result.matchScore}%`);
    console.log(`   Reasoning: ${result.reasoning?.substring(0, 100)}...`);

    // Validazione risultato
    if (typeof result.matchScore !== 'number' || isNaN(result.matchScore)) {
      console.warn(`⚠️ [Confronto Testo] matchScore non valido, uso 0: ${result.matchScore}`);
      result.matchScore = 0;
    }

    return {
      matchScore: Math.max(0, Math.min(100, result.matchScore || 0)),
      differences: Array.isArray(result.differences) ? result.differences : [],
      reasoning: result.reasoning || 'No reasoning provided',
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`❌ [Confronto Testo] Errore dopo ${duration}ms con ${officialData.nome}:`, error);
    
    // In caso di errore, restituisci un match score basso invece di fallire
    return {
      matchScore: 0,
      differences: ['Errore durante il confronto testuale'],
      reasoning: `Errore: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

/**
 * Confronta visivamente due etichette e determina la similarity
 */
export async function compareLabelsVisually(
  uploadedImageBase64: string,
  referenceImageBase64: string
): Promise<{
  similarity: number;
  differences: string[];
  verdict: 'identica' | 'simile' | 'diversa' | 'contraffatta';
  explanation: string;
}> {
  const startTime = Date.now();
  console.log('👁️ [Confronto Visivo] Inizio analisi...');
  
  try {
    const response = await withTimeout(
      openai.chat.completions.create({
        model: "gpt-5",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `Confronta queste due etichette di olio d'oliva. La prima immagine è quella caricata dall'utente, la seconda è l'etichetta ufficiale di riferimento dal repository.

Analizza:
1. Design e layout generale
2. Logo e simboli grafici
3. Font e tipografia
4. Colori dominanti
5. Elementi distintivi
6. Segni di contraffazione o differenze sospette

Rispondi in JSON con questo formato:
{
  "similarity": number (0-100, percentuale di similarità visiva),
  "differences": ["lista delle differenze principali rilevate"],
  "verdict": "identica" | "simile" | "diversa" | "contraffatta",
  "explanation": "spiegazione dettagliata del confronto e del verdetto"
}`
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:image/jpeg;base64,${uploadedImageBase64}`,
                  detail: "high"
                }
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:image/jpeg;base64,${referenceImageBase64}`,
                  detail: "high"
                }
              }
            ],
          },
        ],
        response_format: { type: "json_object" },
        max_completion_tokens: 2048,
      }),
      40000, // 40 secondi timeout per confronto visivo (più complesso)
      'Visual Comparison'
    );

    const result = JSON.parse(response.choices[0].message.content || '{}');
    const duration = Date.now() - startTime;
    console.log(`✅ [Confronto Visivo] Completato in ${duration}ms: ${result.verdict} (${result.similarity}%)`);

    return {
      similarity: Math.max(0, Math.min(100, result.similarity || 0)),
      differences: Array.isArray(result.differences) ? result.differences : [],
      verdict: result.verdict || 'diversa',
      explanation: result.explanation || '',
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`❌ [Confronto Visivo] Errore dopo ${duration}ms:`, error);
    throw new Error("Failed to compare labels visually: " + (error instanceof Error ? error.message : 'Unknown error'));
  }
}

export default openai;
