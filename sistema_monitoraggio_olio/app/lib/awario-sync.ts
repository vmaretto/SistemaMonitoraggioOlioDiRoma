

/**
 * Servizio di sincronizzazione Awario
 * Gestisce il recupero e l'aggiornamento dei dati dal servizio Awario
 */

import { awarioClient } from './awario-client';
import { prisma } from './db';
import { processContentForMonitoring } from './keyword-matching';

interface SyncResult {
  success: boolean;
  newMentions: number;
  updatedMentions: number;
  errors: string[];
  message: string;
}

export class AwarioSyncService {
  
  /**
   * Sincronizza i dati da Awario per tutte le keywords attive
   */
  async syncAllMentions(): Promise<SyncResult> {
    const result: SyncResult = {
      success: false,
      newMentions: 0,
      updatedMentions: 0,
      errors: [],
      message: ''
    };

    try {
      console.log('🔄 Inizio sincronizzazione Awario...');

      // 1. Recupera le keywords attive
      const activeKeywords = await prisma.keywords.findMany({
        where: { isActive: true },
        select: { keyword: true }
      });

      if (activeKeywords.length === 0) {
        result.message = 'Nessuna keyword attiva trovata';
        return result;
      }

      const keywordList = activeKeywords.map(k => k.keyword);
      console.log(`📍 Keywords attive: ${keywordList.join(', ')}`);

      // 2. Recupera menzioni da Awario (ultimi 7 giorni)
      const dateFrom = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const dateTo = new Date().toISOString().split('T')[0];

      const mentions = await awarioClient.getMentions({
        keywords: keywordList,
        dateFrom,
        dateTo,
        limit: 100,
        languages: ['it', 'en']
      });

      console.log(`📥 Recuperate ${mentions.length} menzioni da Awario`);

      // 3. Processa ogni menzione
      for (const mention of mentions) {
        try {
          // Controlla se esiste già nel database
          const existingContent = await prisma.contenutiMonitorati.findFirst({
            where: {
              OR: [
                { url: mention.url },
                {
                  AND: [
                    { testo: mention.text },
                    { autore: mention.author },
                    { fonte: mention.source }
                  ]
                }
              ]
            }
          });

          if (existingContent) {
            // Aggiorna contenuto esistente se necessario
            const needsUpdate = this.shouldUpdateContent(existingContent, mention);
            
            if (needsUpdate) {
              await this.updateExistingContent(existingContent.id, mention, keywordList);
              result.updatedMentions++;
              console.log(`🔄 Aggiornato contenuto: ${mention.id}`);
            }
          } else {
            // Crea nuovo contenuto
            await this.createNewContent(mention, keywordList);
            result.newMentions++;
            console.log(`✅ Nuovo contenuto: ${mention.id}`);
          }
        } catch (error) {
          console.error(`❌ Errore processamento menzione ${mention.id}:`, error);
          result.errors.push(`Errore menzione ${mention.id}: ${error}`);
        }
      }

      result.success = true;
      result.message = `Sincronizzazione completata: ${result.newMentions} nuove menzioni, ${result.updatedMentions} aggiornate`;
      
      console.log(`✅ ${result.message}`);
      return result;

    } catch (error) {
      console.error('❌ Errore sincronizzazione Awario:', error);
      result.errors.push(`Errore generale: ${error}`);
      result.message = 'Errore durante la sincronizzazione';
      return result;
    }
  }

  /**
   * Determina se un contenuto esistente deve essere aggiornato
   */
  private shouldUpdateContent(existing: any, mention: any): boolean {
    // Aggiorna se il sentiment è cambiato significativamente
    const sentimentDiff = Math.abs(existing.sentimentScore - mention.sentiment);
    if (sentimentDiff > 0.2) return true;

    // Aggiorna se sono passati più di 24 ore dall'ultimo aggiornamento
    const lastUpdate = new Date(existing.updatedAt);
    const now = new Date();
    const hoursDiff = (now.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60);
    if (hoursDiff > 24) return true;

    return false;
  }

  /**
   * Aggiorna contenuto esistente nel database
   */
  private async updateExistingContent(contentId: string, mention: any, keywords: string[]) {
    const matchingKeywords = this.extractMatchingKeywords(mention.text, keywords);
    const relevance = this.calculateRelevance(mention.text, mention.reach, keywords);
    
    await prisma.contenutiMonitorati.update({
      where: { id: contentId },
      data: {
        sentimentScore: mention.sentiment,
        sentiment: this.convertSentimentToCategory(mention.sentiment),
        keywords: matchingKeywords,
        rilevanza: relevance,
        updatedAt: new Date()
      }
    });
  }

  /**
   * Crea nuovo contenuto nel database
   */
  private async createNewContent(mention: any, keywords: string[]) {
    const matchingKeywords = this.extractMatchingKeywords(mention.text, keywords);
    
    // Solo salva se ha almeno una keyword corrispondente
    if (matchingKeywords.length === 0) {
      console.log(`⏭️ Saltata menzione senza keywords: ${mention.id}`);
      return;
    }

    const relevance = this.calculateRelevance(mention.text, mention.reach, keywords);
    
    await prisma.contenutiMonitorati.create({
      data: {
        fonte: mention.source,
        piattaforma: this.inferPlatform(mention.url, mention.source),
        testo: mention.text,
        url: mention.url,
        autore: mention.author,
        sentiment: this.convertSentimentToCategory(mention.sentiment),
        sentimentScore: mention.sentiment,
        keywords: matchingKeywords,
        dataPost: new Date(mention.date),
        rilevanza: relevance
      }
    });

    // Crea alert se sentiment molto negativo e rilevanza alta
    if (mention.sentiment < -0.7 && relevance > 70) {
      await this.createCriticalAlert(mention, matchingKeywords);
    }
  }

  /**
   * Crea alert critico per contenuti molto negativi
   */
  private async createCriticalAlert(mention: any, keywords: string[]) {
    try {
      await prisma.alert.create({
        data: {
          titolo: `⚠️ Menzione negativa rilevata: ${keywords.join(', ')}`,
          descrizione: `Sentiment molto negativo (${mention.sentiment.toFixed(2)}) rilevato da ${mention.source}\n\nPiattaforma: ${this.inferPlatform(mention.url, mention.source)}\nAutore: ${mention.author}\nTesto: ${mention.text.substring(0, 200)}...\nURL: ${mention.url}`,
          tipo: 'sentiment_critico',
          priorita: 'critico',
          isRisolto: false,
          fonte: mention.url || mention.id
        }
      });
      console.log(`🚨 Alert critico creato per menzione: ${mention.id}`);
    } catch (error) {
      console.error('❌ Errore creazione alert:', error);
    }
  }

  /**
   * Utility functions
   */
  private extractMatchingKeywords(text: string, keywords: string[]): string[] {
    const lowerText = text.toLowerCase();
    return keywords.filter(keyword => 
      lowerText.includes(keyword.toLowerCase())
    );
  }

  private calculateRelevance(text: string, reach: number, keywords: string[]): number {
    const matchingKeywords = this.extractMatchingKeywords(text, keywords);
    let score = matchingKeywords.length * 20;
    
    if (reach > 10000) score += 20;
    else if (reach > 1000) score += 10;
    else if (reach > 100) score += 5;
    
    if (matchingKeywords.length > 1) {
      score += matchingKeywords.length * 5;
    }
    
    return Math.min(100, score);
  }

  private convertSentimentToCategory(score: number): string {
    if (score > 0.2) return 'positivo';
    if (score < -0.2) return 'negativo';
    return 'neutro';
  }

  private inferPlatform(url: string, source: string): string {
    if (!url) return source || 'unknown';
    
    const lowerUrl = url.toLowerCase();
    
    if (lowerUrl.includes('twitter.com') || lowerUrl.includes('x.com')) return 'Twitter';
    if (lowerUrl.includes('facebook.com')) return 'Facebook';
    if (lowerUrl.includes('instagram.com')) return 'Instagram';
    if (lowerUrl.includes('youtube.com')) return 'YouTube';
    if (lowerUrl.includes('linkedin.com')) return 'LinkedIn';
    if (lowerUrl.includes('tiktok.com')) return 'TikTok';
    if (lowerUrl.includes('amazon.')) return 'Amazon';
    if (lowerUrl.includes('ebay.')) return 'eBay';
    if (lowerUrl.includes('tripadvisor.')) return 'TripAdvisor';
    if (lowerUrl.includes('google.') || lowerUrl.includes('maps.google')) return 'Google';
    if (lowerUrl.includes('reddit.com')) return 'Reddit';
    
    return source || 'Web';
  }

  /**
   * Pulisce i dati vecchi (oltre 90 giorni)
   */
  async cleanOldData(): Promise<number> {
    try {
      const cutoffDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
      
      const result = await prisma.contenutiMonitorati.deleteMany({
        where: {
          dataPost: {
            lt: cutoffDate
          }
        }
      });

      console.log(`🗑️ Eliminati ${result.count} contenuti vecchi`);
      return result.count;
    } catch (error) {
      console.error('❌ Errore pulizia dati vecchi:', error);
      return 0;
    }
  }

  /**
   * Statistiche sincronizzazione
   */
  async getSyncStats(): Promise<any> {
    try {
      const [
        totalContents,
        recentContents,
        positiveContents,
        negativeContents,
        averageSentiment
      ] = await Promise.all([
        prisma.contenutiMonitorati.count(),
        prisma.contenutiMonitorati.count({
          where: {
            createdAt: {
              gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
            }
          }
        }),
        prisma.contenutiMonitorati.count({
          where: { sentiment: 'positivo' }
        }),
        prisma.contenutiMonitorati.count({
          where: { sentiment: 'negativo' }
        }),
        prisma.contenutiMonitorati.aggregate({
          _avg: {
            sentimentScore: true
          }
        })
      ]);

      return {
        totalContents,
        recentContents,
        positiveContents,
        negativeContents,
        averageSentiment: averageSentiment._avg.sentimentScore || 0,
        neutralContents: totalContents - positiveContents - negativeContents
      };
    } catch (error) {
      console.error('❌ Errore recupero statistiche:', error);
      return null;
    }
  }
}

// Istanza singleton
export const awarioSync = new AwarioSyncService();
