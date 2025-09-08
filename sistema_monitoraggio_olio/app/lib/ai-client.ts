
/**
 * Client AI per analisi intelligente usando ABACUSAI_API_KEY
 */

interface AIResponse {
  choices: {
    message: {
      content: string;
    }
  }[];
}

interface SentimentResult {
  sentiment: 'positivo' | 'negativo' | 'neutro';
  score: number;
  confidence: number;
  emotions: string[];
  reasoning: string;
}

interface KeywordExtractionResult {
  keywords: string[];
  semanticKeywords: string[];
  topics: string[];
  relevanceScore: number;
  category: 'primarie' | 'secondarie' | 'competitor' | 'generale';
}

interface ContentClassificationResult {
  category: string;
  priority: 'alta' | 'media' | 'bassa';
  urgency: number;
  topics: string[];
  riskLevel: 'alto' | 'medio' | 'basso';
  shouldAlert: boolean;
  reasoning: string;
}

class AIClient {
  private apiKey: string;
  private baseUrl: string = 'https://api.abacus.ai/chatllm/v1';

  constructor() {
    this.apiKey = process.env.ABACUSAI_API_KEY || '';
    if (!this.apiKey) {
      console.warn('⚠️ ABACUSAI_API_KEY non configurata - le funzioni AI non funzioneranno');
    }
  }

  private async callAI(prompt: string, maxTokens: number = 1000): Promise<string> {
    if (!this.apiKey) {
      throw new Error('ABACUSAI_API_KEY non configurata');
    }

    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: 'Sei un esperto di analisi del sentiment e marketing per il settore alimentare italiano, specializzato in olio extravergine. Rispondi sempre in formato JSON valido.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          max_tokens: maxTokens,
          temperature: 0.1
        })
      });

      if (!response.ok) {
        throw new Error(`Errore API AI: ${response.status} ${response.statusText}`);
      }

      const data: AIResponse = await response.json();
      return data.choices[0]?.message?.content || '';
    } catch (error) {
      console.error('Errore chiamata AI:', error);
      throw error;
    }
  }

  /**
   * Analisi sentiment intelligente con AI
   */
  async analyzeSentiment(text: string, context: string = 'olio extravergine'): Promise<SentimentResult> {
    const prompt = `
Analizza il sentiment di questo testo nel contesto del settore "${context}":

TESTO: "${text}"

Restituisci un JSON con questa struttura:
{
  "sentiment": "positivo|negativo|neutro",
  "score": <numero da -1 a 1>,
  "confidence": <numero da 0 a 1>,
  "emotions": ["emozione1", "emozione2"],
  "reasoning": "spiegazione breve del perché"
}

Considera:
- Sarcasmo e ironia
- Contesto del settore alimentare
- Aspettative dei consumatori
- Linguaggio colloquiale italiano
`;

    try {
      const response = await this.callAI(prompt);
      const parsed = JSON.parse(response);
      return {
        sentiment: parsed.sentiment || 'neutro',
        score: parsed.score || 0,
        confidence: parsed.confidence || 0.5,
        emotions: parsed.emotions || [],
        reasoning: parsed.reasoning || 'Analisi automatica'
      };
    } catch (error) {
      console.error('Errore sentiment analysis:', error);
      // Fallback alla logica simulata
      return this.fallbackSentiment(text);
    }
  }

  /**
   * Estrazione keyword semantiche intelligenti
   */
  async extractKeywords(text: string, activeKeywords: string[]): Promise<KeywordExtractionResult> {
    const prompt = `
Estrai keyword semantiche da questo testo per il monitoraggio della reputazione online:

TESTO: "${text}"

KEYWORD ATTIVE DA MONITORARE: ${activeKeywords.join(', ')}

Restituisci JSON:
{
  "keywords": ["keyword presenti nel testo"],
  "semanticKeywords": ["sinonimi e termini correlati trovati"],
  "topics": ["argomenti principali"],
  "relevanceScore": <0-100>,
  "category": "primarie|secondarie|competitor|generale"
}

Trova:
- Keyword esatte dalle attive
- Sinonimi e varianti (es. "olio EVO", "extravergine")
- Termini correlati semanticamente
- Marchi e denominazioni (DOP, IGP, biologico)
`;

    try {
      const response = await this.callAI(prompt);
      const parsed = JSON.parse(response);
      return {
        keywords: parsed.keywords || [],
        semanticKeywords: parsed.semanticKeywords || [],
        topics: parsed.topics || [],
        relevanceScore: parsed.relevanceScore || 0,
        category: parsed.category || 'generale'
      };
    } catch (error) {
      console.error('Errore keyword extraction:', error);
      return this.fallbackKeywordExtraction(text, activeKeywords);
    }
  }

  /**
   * Classificazione intelligente contenuti
   */
  async classifyContent(text: string, keywords: string[]): Promise<ContentClassificationResult> {
    const prompt = `
Classifica questo contenuto per il sistema di monitoraggio reputazionale:

TESTO: "${text}"
KEYWORD ASSOCIATE: ${keywords.join(', ')}

Restituisci JSON:
{
  "category": "recensione|notizia|social_post|ecommerce|blog|forum",
  "priority": "alta|media|bassa",
  "urgency": <1-10>,
  "topics": ["argomenti"],
  "riskLevel": "alto|medio|basso",
  "shouldAlert": true/false,
  "reasoning": "motivazione classificazione"
}

Valuta:
- Tipo di contenuto e piattaforma
- Potenziale impatto reputazionale
- Necessità di risposta immediata
- Livello di rischio per il brand
- Sentiment e tono complessivo
`;

    try {
      const response = await this.callAI(prompt);
      const parsed = JSON.parse(response);
      return {
        category: parsed.category || 'generale',
        priority: parsed.priority || 'media',
        urgency: parsed.urgency || 5,
        topics: parsed.topics || [],
        riskLevel: parsed.riskLevel || 'medio',
        shouldAlert: parsed.shouldAlert || false,
        reasoning: parsed.reasoning || 'Classificazione automatica'
      };
    } catch (error) {
      console.error('Errore content classification:', error);
      return this.fallbackClassification(text, keywords);
    }
  }

  /**
   * Analisi completa contenuto con AI
   */
  async analyzeContent(text: string, activeKeywords: string[]): Promise<{
    sentiment: SentimentResult;
    keywords: KeywordExtractionResult;
    classification: ContentClassificationResult;
  }> {
    try {
      // Esegui tutte le analisi in parallelo per performance
      const [sentiment, keywordData, classification] = await Promise.all([
        this.analyzeSentiment(text),
        this.extractKeywords(text, activeKeywords),
        this.classifyContent(text, activeKeywords)
      ]);

      return { sentiment, keywords: keywordData, classification };
    } catch (error) {
      console.error('Errore analisi completa:', error);
      throw error;
    }
  }

  // Metodi di fallback per quando l'AI non è disponibile
  private fallbackSentiment(text: string): SentimentResult {
    const positiveWords = ['ottimo', 'eccellente', 'buono', 'fantastico', 'consiglio'];
    const negativeWords = ['pessimo', 'terribile', 'cattivo', 'sconsiglio', 'deludente'];

    let score = 0;
    const lowerText = text.toLowerCase();
    
    positiveWords.forEach(word => {
      if (lowerText.includes(word)) score += 0.2;
    });
    
    negativeWords.forEach(word => {
      if (lowerText.includes(word)) score -= 0.2;
    });

    let sentiment: 'positivo' | 'negativo' | 'neutro' = 'neutro';
    if (score > 0.1) sentiment = 'positivo';
    else if (score < -0.1) sentiment = 'negativo';

    return {
      sentiment,
      score: Math.max(-1, Math.min(1, score)),
      confidence: 0.3,
      emotions: [],
      reasoning: 'Analisi fallback (AI non disponibile)'
    };
  }

  private fallbackKeywordExtraction(text: string, activeKeywords: string[]): KeywordExtractionResult {
    const foundKeywords = activeKeywords.filter(keyword => 
      text.toLowerCase().includes(keyword.toLowerCase())
    );

    return {
      keywords: foundKeywords,
      semanticKeywords: [],
      topics: [],
      relevanceScore: foundKeywords.length > 0 ? 50 : 0,
      category: 'generale'
    };
  }

  private fallbackClassification(text: string, keywords: string[]): ContentClassificationResult {
    return {
      category: 'generale',
      priority: 'media',
      urgency: 5,
      topics: [],
      riskLevel: 'medio',
      shouldAlert: false,
      reasoning: 'Classificazione fallback (AI non disponibile)'
    };
  }
}

// Export singleton
export const aiClient = new AIClient();
export type { SentimentResult, KeywordExtractionResult, ContentClassificationResult };
