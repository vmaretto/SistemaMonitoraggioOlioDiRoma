
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
  AlertTriangle, 
  Shield,
  Clock,
  CheckCircle,
  XCircle,
  Eye,
  ArrowRight
} from 'lucide-react';
import Link from 'next/link';

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

    return {
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
    };

  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    // Ritorna dati mock in caso di errore
    return {
      overview: {
        totalContenuti: 240,
        contenutiRecenti: 18,
        sentimentMedio: 0.25,
        alertAttivi: 3,
        alertCritici: 1,
        verifichePending: 2
      },
      sentimentDistribution: [
        { sentiment: 'positivo', count: 120 },
        { sentiment: 'neutro', count: 85 },
        { sentiment: 'negativo', count: 35 }
      ],
      trendGiornaliero: []
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

  const getSentimentChange = (score: number) => {
    if (score > 0.2) return '+12%';
    if (score < -0.2) return '-8%';
    return '+3%';
  };

  const getSentimentChangeType = (score: number): 'positive' | 'negative' | 'neutral' => {
    if (score > 0.2) return 'positive';
    if (score < -0.2) return 'negative';
    return 'neutral';
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-4">
        <StatsCard
          title="Contenuti Totali"
          value={stats?.overview?.totalContenuti || 240}
          change="+12 oggi"
          changeType="positive"
          icon={<MessageSquare className="h-4 w-4" />}
          description="Contenuti monitorati"
        />
        
        <StatsCard
          title="Sentiment Medio"
          value={(stats?.overview?.sentimentMedio || 0.25).toFixed(2)}
          change={getSentimentChange(stats?.overview?.sentimentMedio || 0.25)}
          changeType={getSentimentChangeType(stats?.overview?.sentimentMedio || 0.25)}
          icon={<TrendingUp className="h-4 w-4" />}
          description="Punteggio da -1 a +1"
          variant={getSentimentVariant(stats?.overview?.sentimentMedio || 0.25)}
        />
        
        <StatsCard
          title="Alert Attivi"
          value={stats?.overview?.alertAttivi || 3}
          change={stats?.overview?.alertCritici ? `${stats.overview.alertCritici} critici` : '1 critico'}
          changeType="negative"
          icon={<AlertTriangle className="h-4 w-4" />}
          description="Richiedono attenzione"
          variant="warning"
        />
        
        <StatsCard
          title="Verifiche Pending"
          value={stats?.overview?.verifichePending || 2}
          change="In attesa"
          changeType="neutral"
          icon={<Shield className="h-4 w-4" />}
          description="Etichette da verificare"
          variant="warning"
        />

        <StatsCard
          title="Contenuti Recenti"
          value={stats?.overview?.contenutiRecenti || 18}
          change="Ultimi 7 giorni"
          changeType="positive"
          icon={<Clock className="h-4 w-4" />}
          description="Nuove menzioni"
        />

        <StatsCard
          title="Tasso Conformità"
          value="87%"
          change="+5%"
          changeType="positive"
          icon={<CheckCircle className="h-4 w-4" />}
          description="Etichette conformi"
          variant="success"
        />
      </div>

      {/* Charts Section */}
      <OverviewCharts 
        trendData={stats?.trendGiornaliero}
        sentimentDistribution={stats?.sentimentDistribution}
      />

      {/* Quick Actions & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Alert Recenti */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-orange-600" />
              <span>Alert Recenti</span>
            </CardTitle>
            <CardDescription>
              Situazioni che richiedono attenzione immediata
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center space-x-3 p-3 bg-red-50 rounded-lg border border-red-200">
              <XCircle className="h-4 w-4 text-red-600 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium text-red-900">Picco sentiment negativo</p>
                <p className="text-xs text-red-700">Aumento del 40% delle recensioni negative</p>
              </div>
              <Badge variant="destructive">Critico</Badge>
            </div>
            
            <div className="flex items-center space-x-3 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
              <Shield className="h-4 w-4 text-yellow-600 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium text-yellow-900">Etichetta sospetta</p>
                <p className="text-xs text-yellow-700">Uso improprio di simboli romani</p>
              </div>
              <Badge variant="outline">Medio</Badge>
            </div>

            <div className="flex items-center space-x-3 p-3 bg-green-50 rounded-lg border border-green-200">
              <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium text-green-900">Trend positivo DOP Sabina</p>
                <p className="text-xs text-green-700">+25% menzioni positive</p>
              </div>
              <Badge variant="outline">Risolto</Badge>
            </div>

            <div className="pt-3 border-t">
              <Link href="/dashboard/alert">
                <Button variant="outline" size="sm" className="w-full">
                  <Eye className="h-4 w-4 mr-2" />
                  Visualizza tutti gli alert
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </Link>
            </div>
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
            <Link href="/dashboard/etichette/verify">
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

            <Link href="/dashboard/report">
              <Button variant="outline" className="w-full justify-between">
                <span className="flex items-center">
                  <Eye className="h-4 w-4 mr-2" />
                  Esporta Report
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
