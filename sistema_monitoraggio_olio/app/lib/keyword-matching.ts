import { analyzeSentiment as analyzeSentimentOpenAI } from '@/src/services/openai';

/**
 * Utility functions for keyword matching and relevance calculation
 */

interface KeywordMatch {
  keyword: string;
  count: number;
  positions: number[];
}

/**
 * Trova tutte le keywords attive in un testo
 */
export function findMatchingKeywords(text: string, activeKeywords: string[]): KeywordMatch[] {
  const matches: KeywordMatch[] = [];
  const lowerText = text.toLowerCase();

  activeKeywords.forEach(keyword => {
    const lowerKeyword = keyword.toLowerCase();
    const regex = new RegExp(escapeRegex(lowerKeyword), 'gi');
    const keywordMatches = [...lowerText.matchAll(regex)];
    
    if (keywordMatches.length > 0) {
      matches.push({
        keyword,
        count: keywordMatches.length,
        positions: keywordMatches.map(match => match.index || 0)
      });
    }
  });

  return matches;
}

/**
 * Calcola il punteggio di rilevanza basato sui match delle keywords
 */
export function calculateRelevance(text: string, keywordMatches: KeywordMatch[]): number {
  if (keywordMatches.length === 0) return 0;

  let score = 0;
  const textLength = text.length;

  keywordMatches.forEach(match => {
    // Punti base per ogni keyword trovata
    score += 20;
    
    // Punti aggiuntivi per multiple occorrenze
    score += (match.count - 1) * 10;
    
    // Bonus se la keyword appare all'inizio del testo (primi 100 caratteri)
    const hasEarlyMatch = match.positions.some(pos => pos < 100);
    if (hasEarlyMatch) {
      score += 15;
    }
    
    // Bonus per densità di keyword nel testo
    const density = (match.keyword.length * match.count) / textLength;
    if (density > 0.02) { // Se la keyword rappresenta più del 2% del testo
      score += 10;
    }
  });

  // Bonus per numero di keywords diverse trovate
  if (keywordMatches.length > 1) {
    score += keywordMatches.length * 5;
  }

  // Limita il punteggio massimo a 100
  return Math.min(100, Math.round(score));
}

/**
 * Escape regex special characters
 */
function escapeRegex(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Processo un contenuto con AI e determina se deve essere monitorato
 * @deprecated Funzione legacy - AI analysis ora gestita direttamente dai servizi OpenAI
 */
export async function processContentForMonitoringAI(
  text: string, 
  activeKeywords: string[]
): Promise<{ shouldMonitor: boolean; keywords: string[]; relevance: number; aiInsights?: any }> {
  // Fallback automatico alla logica base
  console.warn('⚠️ processContentForMonitoringAI è deprecated, uso logica base');
  return processContentForMonitoring(text, activeKeywords);
}

/**
 * Processo un contenuto e determina se deve essere monitorato (versione base)
 */
export function processContentForMonitoring(
  text: string, 
  activeKeywords: string[]
): { shouldMonitor: boolean; keywords: string[]; relevance: number } {
  const matches = findMatchingKeywords(text, activeKeywords);
  const relevance = calculateRelevance(text, matches);
  
  return {
    shouldMonitor: matches.length > 0,
    keywords: matches.map(m => m.keyword),
    relevance
  };
}

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
    // Aggettivi positivi generali
    'ottimo', 'eccellente', 'buono', 'fantastico', 'delizioso', 'perfetto',
    'meraviglioso', 'stupendo', 'magnifico', 'straordinario', 'splendido',
    'incredibile', 'notevole', 'pregevole', 'raffinato', 'sublime',
    // Qualità prodotto
    'genuino', 'autentico', 'tradizionale', 'artigianale', 'pregiato',
    'qualità', 'premium', 'fresco', 'naturale', 'bio', 'biologico',
    'certificato', 'garantito', 'originale', 'puro', 'integro',
    // Gusto e aroma (olio)
    'fruttato', 'aromatico', 'profumato', 'saporito', 'gustoso',
    'delicato', 'equilibrato', 'intenso', 'fragrante', 'vellutato',
    // Raccomandazioni
    'consiglio', 'consigliato', 'raccomando', 'raccomandato', 'imperdibile',
    'da provare', 'vale la pena', 'soddisfatto', 'soddisfazione',
    // Successo e riconoscimenti
    'premiato', 'vincitore', 'riconoscimento', 'eccellenza', 'premio',
    'medaglia', 'primo posto', 'migliore', 'top', 'leader',
    // Positivi news/settore
    'crescita', 'sviluppo', 'innovazione', 'successo', 'traguardo',
    'investimento', 'opportunità', 'valorizzazione', 'tutela', 'promozione'
  ];

  const negativeWords = [
    // Aggettivi negativi generali
    'pessimo', 'terribile', 'cattivo', 'disgustoso', 'orribile',
    'scarso', 'mediocre', 'scadente', 'insufficiente', 'inadeguato',
    'deludente', 'insoddisfacente', 'inaccettabile', 'vergognoso',
    // Qualità prodotto negativa
    'amaro', 'rancido', 'scaduto', 'alterato', 'deteriorato',
    'contraffatto', 'adulterato', 'falsificato', 'imitazione', 'falso',
    'insapore', 'artificiale', 'industriale', 'chimico', 'sintetico',
    // Prezzi e valore
    'caro', 'costoso', 'esagerato', 'sopravvalutato', 'non vale',
    // Problemi e criticità
    'frode', 'truffa', 'inganno', 'scandalo', 'illecito', 'illegale',
    'sequestro', 'sequestrato', 'confisca', 'confiscato', 'multa',
    'sanzione', 'violazione', 'irregolarità', 'non conforme',
    // Raccomandazioni negative
    'non consiglio', 'evitate', 'evitare', 'sconsiglio', 'sconsigliato',
    'da evitare', 'non comprare', 'non acquistare', 'bocciato',
    // Negativi news/settore
    'crisi', 'calo', 'perdita', 'fallimento', 'chiusura', 'denuncia',
    'problema', 'difficoltà', 'rischio', 'allarme', 'emergenza'
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
