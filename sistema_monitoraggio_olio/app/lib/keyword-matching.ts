

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
 * Analisi sentiment intelligente (fallback logica base)
 * @note Per AI analysis completa usa il servizio OpenAI direttamente
 */
export async function analyzeSentiment(text: string): Promise<{ sentiment: string; score: number; confidence?: number; reasoning?: string }> {
  // Usa logica simulata come fallback
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
  let sentiment = 'neutro';
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
    reasoning: 'Analisi fallback (AI temporaneamente non disponibile)'
  };
}
