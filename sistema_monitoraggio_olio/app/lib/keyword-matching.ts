

/**
 * Utility functions for keyword matching and relevance calculation with AI integration
 */

import { aiClient } from './ai-client';

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
 */
export async function processContentForMonitoringAI(
  text: string, 
  activeKeywords: string[]
): Promise<{ shouldMonitor: boolean; keywords: string[]; relevance: number; aiInsights?: any }> {
  try {
    // Usa AI per analisi completa
    const aiAnalysis = await aiClient.analyzeContent(text, activeKeywords);
    
    // Combina keyword trovate + keyword semantiche
    const allKeywords = [
      ...aiAnalysis.keywords.keywords,
      ...aiAnalysis.keywords.semanticKeywords
    ];
    
    const shouldMonitor = allKeywords.length > 0 || aiAnalysis.classification.shouldAlert;
    const relevance = Math.max(
      aiAnalysis.keywords.relevanceScore,
      aiAnalysis.classification.urgency * 10
    );

    return {
      shouldMonitor,
      keywords: allKeywords,
      relevance: Math.min(100, relevance),
      aiInsights: {
        sentiment: aiAnalysis.sentiment,
        classification: aiAnalysis.classification,
        keywordData: aiAnalysis.keywords
      }
    };
  } catch (error) {
    console.warn('⚠️ AI processing fallito, uso logica base:', error instanceof Error ? error.message : 'Errore sconosciuto');
    // Fallback alla logica originale
    return processContentForMonitoring(text, activeKeywords);
  }
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
 * Analisi sentiment intelligente con AI (con fallback simulato)
 */
export async function analyzeSentiment(text: string): Promise<{ sentiment: string; score: number; confidence?: number; reasoning?: string }> {
  try {
    const aiResult = await aiClient.analyzeSentiment(text, 'olio extravergine');
    return {
      sentiment: aiResult.sentiment,
      score: aiResult.score,
      confidence: aiResult.confidence,
      reasoning: aiResult.reasoning
    };
  } catch (error) {
    console.warn('⚠️ AI sentiment analysis fallito, uso logica simulata:', error instanceof Error ? error.message : 'Errore sconosciuto');
    
    // Fallback alla logica simulata
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
}
