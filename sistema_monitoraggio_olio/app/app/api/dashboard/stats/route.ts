
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
    }

    // Calcola le statistiche principali
    const now = new Date();
    const last7Days = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000));
    const last30Days = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));

    // Total contenuti monitorati
    const totalContenuti = await prisma.contenutiMonitorati.count();
    
    // Contenuti ultimi 7 giorni
    const contenutiRecenti = await prisma.contenutiMonitorati.count({
      where: {
        dataPost: {
          gte: last7Days
        }
      }
    });

    // Sentiment medio
    const sentimentStats = await prisma.contenutiMonitorati.aggregate({
      _avg: {
        sentimentScore: true
      },
      where: {
        dataPost: {
          gte: last30Days
        }
      }
    });

    // Distribuzione sentiment
    const sentimentDistribution = await prisma.contenutiMonitorati.groupBy({
      by: ['sentiment'],
      _count: {
        sentiment: true
      },
      where: {
        dataPost: {
          gte: last30Days
        }
      }
    });

    // Alert attivi
    const alertAttivi = await prisma.alert.count({
      where: {
        isRisolto: false
      }
    });

    // Alert critici
    const alertCritici = await prisma.alert.count({
      where: {
        isRisolto: false,
        priorita: 'critico'
      }
    });

    // Verifiche etichette pending
    const verifichePending = await prisma.verificheEtichette.count({
      where: {
        stato: 'da_verificare'
      }
    });

    // Trend giornaliero ultimi 7 giorni
    const trendGiornaliero = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now.getTime() - (i * 24 * 60 * 60 * 1000));
      const nextDate = new Date(date.getTime() + (24 * 60 * 60 * 1000));
      
      const count = await prisma.contenutiMonitorati.count({
        where: {
          dataPost: {
            gte: date,
            lt: nextDate
          }
        }
      });

      const avgSentiment = await prisma.contenutiMonitorati.aggregate({
        _avg: {
          sentimentScore: true
        },
        where: {
          dataPost: {
            gte: date,
            lt: nextDate
          }
        }
      });

      trendGiornaliero.push({
        data: date.toISOString().split('T')[0],
        contenuti: count,
        sentimentScore: avgSentiment._avg?.sentimentScore || 0
      });
    }

    return NextResponse.json({
      overview: {
        totalContenuti,
        contenutiRecenti,
        sentimentMedio: sentimentStats._avg?.sentimentScore || 0,
        alertAttivi,
        alertCritici,
        verifichePending
      },
      sentimentDistribution: sentimentDistribution.map(item => ({
        sentiment: item.sentiment,
        count: item._count.sentiment
      })),
      trendGiornaliero
    });

  } catch (error) {
    console.error('Errore nel recupero statistiche:', error);
    return NextResponse.json({ error: 'Errore interno del server' }, { status: 500 });
  }
}
