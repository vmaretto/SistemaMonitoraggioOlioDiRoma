
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { StatsCard } from '@/components/dashboard/stats-card';
import { OverviewCharts } from '@/components/dashboard/overview-charts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  TrendingUp,
  MessageSquare,
  Shield,
  Clock,
  CheckCircle,
  Eye,
  ArrowRight,
  FileText,
  ClipboardList
} from 'lucide-react';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { it } from 'date-fns/locale';

async function getDashboardStats() {
  try {
    const { prisma } = await import('@/lib/db');

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

    // Verifiche etichette pending
    const verifichePending = await prisma.verificheEtichette.count({
      where: {
        stato: 'da_verificare'
      }
    });

    // Verifiche totali e conformi per calcolo tasso conformità
    const verificheTotali = await prisma.verificheEtichette.count();
    const verificheConformi = await prisma.verificheEtichette.count({
      where: {
        risultatoMatching: 'conforme'
      }
    });
    const tassoConformita = verificheTotali > 0
      ? Math.round((verificheConformi / verificheTotali) * 100)
      : 0;

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

    // Keyword performance (dati reali)
    const allContenuti = await prisma.contenutiMonitorati.findMany({
      where: {
        dataPost: {
          gte: last30Days
        }
      },
      select: {
        keywords: true,
        sentimentScore: true
      }
    });

    const keywordStats = new Map<string, { menzioni: number; totalSentiment: number }>();
    allContenuti.forEach(c => {
      c.keywords.forEach(kw => {
        const existing = keywordStats.get(kw) || { menzioni: 0, totalSentiment: 0 };
        existing.menzioni++;
        existing.totalSentiment += c.sentimentScore;
        keywordStats.set(kw, existing);
      });
    });

    const keywordPerformance = Array.from(keywordStats.entries())
      .map(([keyword, stats]) => ({
        keyword,
        menzioni: stats.menzioni,
        sentiment: stats.menzioni > 0 ? stats.totalSentiment / stats.menzioni : 0
      }))
      .sort((a, b) => b.menzioni - a.menzioni)
      .slice(0, 5);

    // Attività recenti (ultimi action log dai report)
    const recentActivities = await prisma.actionLog.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: {
        report: {
          select: { title: true }
        }
      }
    });

    // Ottieni i nomi degli utenti per gli actorId
    const actorIds = [...new Set(recentActivities.map(a => a.actorId))];
    const actors = await prisma.user.findMany({
      where: { id: { in: actorIds } },
      select: { id: true, name: true }
    });
    const actorMap = new Map(actors.map(a => [a.id, a.name]));

    return {
      overview: {
        totalContenuti,
        contenutiRecenti,
        sentimentMedio: sentimentStats._avg?.sentimentScore || 0,
        verifichePending,
        tassoConformita
      },
      sentimentDistribution: sentimentDistribution.map(item => ({
        sentiment: item.sentiment,
        count: item._count.sentiment
      })),
      trendGiornaliero,
      keywordPerformance,
      recentActivities: recentActivities.map(a => ({
        id: a.id,
        type: a.type,
        message: a.message,
        reportTitle: a.report?.title || 'Report',
        actorName: actorMap.get(a.actorId) || 'Sistema',
        createdAt: a.createdAt
      }))
    };

  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    return {
      overview: {
        totalContenuti: 0,
        contenutiRecenti: 0,
        sentimentMedio: 0,
        verifichePending: 0,
        tassoConformita: 0
      },
      sentimentDistribution: [],
      trendGiornaliero: [],
      keywordPerformance: [],
      recentActivities: []
    };
  }
}

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  const stats = await getDashboardStats();

  const getSentimentVariant = (score: number) => {
    if (score > 0.2) return 'success';
    if (score < -0.2) return 'danger';
    return 'warning';
  };

  const getSentimentChangeType = (score: number): 'positive' | 'negative' | 'neutral' => {
    if (score > 0.2) return 'positive';
    if (score < -0.2) return 'negative';
    return 'neutral';
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'LAVORAZIONE_AVVIATA':
        return <FileText className="h-4 w-4 text-blue-600" />;
      case 'AVVIO_CONTROLLO':
        return <Eye className="h-4 w-4 text-orange-600" />;
      case 'SOPRALLUOGO_VERBALE':
        return <ClipboardList className="h-4 w-4 text-purple-600" />;
      case 'INVIO_A_ENTE':
        return <Shield className="h-4 w-4 text-red-600" />;
      case 'CHIUSURA':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      default:
        return <FileText className="h-4 w-4 text-gray-600" />;
    }
  };

  const getActivityBg = (type: string) => {
    switch (type) {
      case 'LAVORAZIONE_AVVIATA':
        return 'bg-blue-50 border-blue-200';
      case 'AVVIO_CONTROLLO':
        return 'bg-orange-50 border-orange-200';
      case 'SOPRALLUOGO_VERBALE':
        return 'bg-purple-50 border-purple-200';
      case 'INVIO_A_ENTE':
        return 'bg-red-50 border-red-200';
      case 'CHIUSURA':
        return 'bg-green-50 border-green-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="bg-gradient-to-r from-green-50 to-blue-50 p-6 rounded-lg border border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Benvenuto, {session?.user?.name}
            </h1>
            <p className="text-gray-600">
              Sistema di monitoraggio reputazionale per l'olio extravergine Roma-Lazio.
              Tieni sotto controllo la reputazione online e la conformità delle etichette.
            </p>
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-500">Ultimo aggiornamento</div>
            <div className="font-semibold text-gray-900">
              {new Date().toLocaleString('it-IT')}
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatsCard
          title="Contenuti Totali"
          value={stats?.overview?.totalContenuti || 0}
          change="Monitorati"
          changeType="neutral"
          icon={<MessageSquare className="h-4 w-4" />}
          description="Contenuti monitorati"
        />

        <StatsCard
          title="Sentiment Medio"
          value={(stats?.overview?.sentimentMedio || 0).toFixed(2)}
          change="Ultimi 30 giorni"
          changeType={getSentimentChangeType(stats?.overview?.sentimentMedio || 0)}
          icon={<TrendingUp className="h-4 w-4" />}
          description="Punteggio da -1 a +1"
          variant={getSentimentVariant(stats?.overview?.sentimentMedio || 0)}
        />

        <StatsCard
          title="Verifiche Pending"
          value={stats?.overview?.verifichePending || 0}
          change="In attesa"
          changeType="neutral"
          icon={<Shield className="h-4 w-4" />}
          description="Etichette da verificare"
          variant={stats?.overview?.verifichePending ? 'warning' : 'default'}
        />

        <StatsCard
          title="Contenuti Recenti"
          value={stats?.overview?.contenutiRecenti || 0}
          change="Ultimi 7 giorni"
          changeType="positive"
          icon={<Clock className="h-4 w-4" />}
          description="Nuove menzioni"
        />

        <StatsCard
          title="Tasso Conformità"
          value={`${stats?.overview?.tassoConformita || 0}%`}
          change="Etichette verificate"
          changeType="positive"
          icon={<CheckCircle className="h-4 w-4" />}
          description="Etichette conformi"
          variant={stats?.overview?.tassoConformita && stats.overview.tassoConformita > 70 ? 'success' : 'warning'}
        />
      </div>

      {/* Charts Section */}
      <OverviewCharts
        trendData={stats?.trendGiornaliero}
        sentimentDistribution={stats?.sentimentDistribution}
        keywordPerformance={stats?.keywordPerformance}
      />

      {/* Quick Actions & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Attività Recenti */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <ClipboardList className="h-5 w-5 text-blue-600" />
              <span>Attività Recenti</span>
            </CardTitle>
            <CardDescription>
              Ultime attività sui report di tracciabilità
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {stats?.recentActivities && stats.recentActivities.length > 0 ? (
              <>
                {stats.recentActivities.map((activity) => (
                  <div
                    key={activity.id}
                    className={`flex items-center space-x-3 p-3 rounded-lg border ${getActivityBg(activity.type)}`}
                  >
                    {getActivityIcon(activity.type)}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {activity.reportTitle}
                      </p>
                      <p className="text-xs text-gray-600 truncate">{activity.message}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-xs text-gray-500">
                        {formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true, locale: it })}
                      </p>
                      <p className="text-xs text-gray-400">{activity.actorName}</p>
                    </div>
                  </div>
                ))}
                <div className="pt-3 border-t">
                  <Link href="/dashboard/reports">
                    <Button variant="outline" size="sm" className="w-full">
                      <Eye className="h-4 w-4 mr-2" />
                      Visualizza tutti i report
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  </Link>
                </div>
              </>
            ) : (
              <div className="text-center py-6 text-gray-500">
                <ClipboardList className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                <p>Nessuna attività recente</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <TrendingUp className="h-5 w-5 text-blue-600" />
              <span>Azioni Rapide</span>
            </CardTitle>
            <CardDescription>
              Accesso rapido alle funzioni principali
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Link href="/dashboard/verifiche">
              <Button className="w-full justify-between bg-gradient-to-r from-blue-600 to-green-600 hover:from-blue-700 hover:to-green-700">
                <span className="flex items-center">
                  <Shield className="h-4 w-4 mr-2" />
                  Verifica Nuova Etichetta
                </span>
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>

            <Link href="/dashboard/contenuti">
              <Button variant="outline" className="w-full justify-between">
                <span className="flex items-center">
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Monitora Contenuti
                </span>
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>

            <Link href="/dashboard/sentiment">
              <Button variant="outline" className="w-full justify-between">
                <span className="flex items-center">
                  <TrendingUp className="h-4 w-4 mr-2" />
                  Analizza Sentiment
                </span>
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>

            <Link href="/dashboard/reports">
              <Button variant="outline" className="w-full justify-between">
                <span className="flex items-center">
                  <ClipboardList className="h-4 w-4 mr-2" />
                  Tracciabilità Ispettori
                </span>
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
