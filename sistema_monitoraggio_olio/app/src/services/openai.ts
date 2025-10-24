import OpenAI from "openai";

// the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
// This is using OpenAI's API, which points to OpenAI's API servers and requires your own API key.
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/**
 * Analizza il sentiment di un testo usando GPT-5
 */
export async function analyzeSentiment(text: string): Promise<{
  sentiment: 'positivo' | 'neutrale' | 'negativo';
  score: number;
  confidence: number;
}> {
  try {
    const response = await openai.chat.completions.create({
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
    });

    const result = JSON.parse(response.choices[0].message.content || '{}');

    return {
      sentiment: result.sentiment || 'neutrale',
      score: Math.max(-1, Math.min(1, result.score || 0)),
      confidence: Math.max(0, Math.min(1, result.confidence || 0)),
    };
  } catch (error) {
    console.error("Errore analisi sentiment OpenAI:", error);
    throw new Error("Failed to analyze sentiment: " + (error instanceof Error ? error.message : 'Unknown error'));
  }
}

/**
 * Estrae testo da un'immagine di etichetta usando GPT-5 Vision
 */
export async function extractTextFromLabel(base64Image: string): Promise<string> {
  try {
    const response = await openai.chat.completions.create({
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
    });

    return response.choices[0].message.content || '';
  } catch (error) {
    console.error("Errore OCR OpenAI Vision:", error);
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
  try {
    const response = await openai.chat.completions.create({
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
    });

    const result = JSON.parse(response.choices[0].message.content || '{}');

    return {
      risultato: result.risultato || 'sospetto',
      percentualeMatch: Math.max(0, Math.min(100, result.percentualeMatch || 0)),
      violazioni: Array.isArray(result.violazioni) ? result.violazioni : [],
      note: result.note || '',
    };
  } catch (error) {
    console.error("Errore analisi conformità OpenAI:", error);
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
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-5",
      messages: [
        {
          role: "system",
          content: `Sei un esperto di verifica etichette. Confronta il testo estratto con i dati dell'etichetta ufficiale e calcola una percentuale di match. Rispondi in JSON:
{
  "matchScore": number (0-100, percentuale di match testuale),
  "differences": ["lista delle differenze testuali rilevate"],
  "reasoning": "spiegazione del confronto"
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

Confronta nome prodotto, produttore, denominazione, regione e comune. Calcola il match score.`,
        },
      ],
      response_format: { type: "json_object" },
      max_completion_tokens: 1000,
    });

    const result = JSON.parse(response.choices[0].message.content || '{}');

    return {
      matchScore: Math.max(0, Math.min(100, result.matchScore || 0)),
      differences: Array.isArray(result.differences) ? result.differences : [],
      reasoning: result.reasoning || '',
    };
  } catch (error) {
    console.error("Errore confronto testuale OpenAI:", error);
    throw new Error("Failed to compare text with official label: " + (error instanceof Error ? error.message : 'Unknown error'));
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
  try {
    const response = await openai.chat.completions.create({
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
    });

    const result = JSON.parse(response.choices[0].message.content || '{}');

    return {
      similarity: Math.max(0, Math.min(100, result.similarity || 0)),
      differences: Array.isArray(result.differences) ? result.differences : [],
      verdict: result.verdict || 'diversa',
      explanation: result.explanation || '',
    };
  } catch (error) {
    console.error("Errore confronto visivo OpenAI:", error);
    throw new Error("Failed to compare labels visually: " + (error instanceof Error ? error.message : 'Unknown error'));
  }
}

export default openai;
