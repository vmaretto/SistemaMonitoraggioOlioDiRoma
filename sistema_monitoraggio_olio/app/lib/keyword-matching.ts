import { analyzeSentiment as analyzeSentimentOpenAI } from '@/src/services/openai';

/**
 * Analisi sentiment BASE (keyword-based)
 */
export function analyzeSentimentBase(text: string): { 
  sentiment: string; 
  score: number; 
  confidence: number;
  method: string;
} {
  const lowerText = text.toLowerCase();
  
  const positiveWords = [
    'ottimo', 'eccellente', 'buono', 'fantastico', 'delizioso', 'perfetto',
    'consiglio', 'meraviglioso', 'stupendo', 'genuino', 'autentico', 'tradizionale',
    'qualità', 'premium', 'fresco', 'naturale', 'bio', 'biologico'
  ];
  
  const negativeWords = [
    'pessimo', 'terribile', 'cattivo', 'disgustoso', 'amaro', 'rancido',
    'scaduto', 'caro', 'costoso', 'deludente', 'insapore', 'artificiale',
    'industriale', 'scarsa qualità', 'non consiglio', 'evitate'
  ];

  let positiveScore = 0;
  let negativeScore = 0;

  positiveWords.forEach(word => {
    const matches = (lowerText.match(new RegExp(escapeRegex(word), 'g')) || []).length;
    positiveScore += matches;
  });

  negativeWords.forEach(word => {
    const matches = (lowerText.match(new RegExp(escapeRegex(word), 'g')) || []).length;
    negativeScore += matches;
  });

  const totalScore = positiveScore - negativeScore;
  let sentiment = 'neutrale';
  let score = 0;

  if (totalScore > 0) {
    sentiment = 'positivo';
    score = Math.min(0.9, 0.1 + (totalScore * 0.2));
  } else if (totalScore < 0) {
    sentiment = 'negativo';
    score = Math.max(-0.9, -0.1 + (totalScore * 0.2));
  }

  return { 
    sentiment, 
    score,
    confidence: 0.3,
    method: 'keyword-matching'
  };
}

/**
 * Analisi sentiment con ENTRAMBI i metodi
 */
export async function analyzeSentiment(text: string): Promise<{ 
  sentiment: string; 
  score: number; 
  confidence?: number; 
  base?: any;
  ai?: any;
}> {
  // Analisi BASE (sempre disponibile)
  const baseAnalysis = analyzeSentimentBase(text);
  
  // Prova con OpenAI
  try {
    const aiAnalysis = await analyzeSentimentOpenAI(text);
    
    return {
      // Usa AI come primario
      sentiment: aiAnalysis.sentiment,
      score: aiAnalysis.score,
      confidence: aiAnalysis.confidence,
      // Salva entrambi
      base: baseAnalysis,
      ai: {
        ...aiAnalysis,
        method: 'openai-gpt-5'
      }
    };
  } catch (error) {
    console.warn('⚠️ OpenAI non disponibile, uso solo analisi base:', error instanceof Error ? error.message : 'Unknown error');
    
    // Fallback a base
    return {
      sentiment: baseAnalysis.sentiment,
      score: baseAnalysis.score,
      confidence: baseAnalysis.confidence,
      base: baseAnalysis,
      ai: null
    };
  }
}

/**
 * Confronta analisi Base vs AI
 */
export async function compareAnalysisMethods(text: string): Promise<{
  base: any;
  ai: any;
  agreement: number; // 0-100 quanto concordano
  recommendation: string;
}> {
  const baseAnalysis = analyzeSentimentBase(text);
  
  try {
    const aiAnalysis = await analyzeSentimentOpenAI(text);
    
    // Calcola concordanza
    const sentimentMatch = baseAnalysis.sentiment === aiAnalysis.sentiment ? 50 : 0;
    const scoreDiff = Math.abs(baseAnalysis.score - aiAnalysis.score);
    const scoreMatch = Math.max(0, 50 - (scoreDiff * 50));
    const agreement = Math.round(sentimentMatch + scoreMatch);
    
    let recommendation = '';
    if (agreement > 80) {
      recommendation = 'Entrambi i metodi concordano - alta affidabilità';
    } else if (agreement > 50) {
      recommendation = 'Concordanza parziale - consigliato verificare manualmente';
    } else {
      recommendation = 'Analisi discordanti - richiesta revisione umana';
    }
    
    return {
      base: { ...baseAnalysis, available: true },
      ai: { ...aiAnalysis, available: true, method: 'openai-gpt-5' },
      agreement,
      recommendation
    };
  } catch (error) {
    return {
      base: { ...baseAnalysis, available: true },
      ai: { error: error instanceof Error ? error.message : 'Unknown error', available: false },
      agreement: 0,
      recommendation: 'Solo analisi base disponibile - OpenAI non raggiungibile'
    };
  }
}
