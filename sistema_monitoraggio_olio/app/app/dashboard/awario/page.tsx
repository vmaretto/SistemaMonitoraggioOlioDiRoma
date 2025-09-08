

'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  RefreshCw, 
  BarChart3, 
  TrendingUp, 
  TrendingDown, 
  Minus,
  Calendar,
  Globe,
  Zap
} from 'lucide-react';
import { useRouter } from 'next/navigation';

interface AwarioStats {
  connection: {
    success: boolean;
    message: string;
  };
  stats: {
    totalContents: number;
    recentContents: number;
    positiveContents: number;
    negativeContents: number;
    neutralContents: number;
    averageSentiment: number;
  };
}

export default function AwarioPage() {
  const [awarioStats, setAwarioStats] = useState<AwarioStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncLoading, setSyncLoading] = useState(false);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    fetchAwarioStats();
  }, []);

  const fetchAwarioStats = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/awario/sync');
      if (response.ok) {
        const data = await response.json();
        setAwarioStats(data);
        setLastSync(new Date().toLocaleString('it-IT'));
      }
    } catch (error) {
      console.error('Errore caricamento stats Awario:', error);
    } finally {
      setLoading(false);
    }
  };

  const syncAwario = async () => {
    try {
      setSyncLoading(true);
      const response = await fetch('/api/awario/sync', {
        method: 'POST'
      });
      const result = await response.json();
      
      if (response.ok && result.success) {
        await fetchAwarioStats();
        alert(`✅ ${result.message}`);
      } else {
        alert(`❌ Errore: ${result.message || result.error}`);
      }
    } catch (error) {
      console.error('Errore sincronizzazione Awario:', error);
      alert('❌ Errore durante la sincronizzazione Awario');
    } finally {
      setSyncLoading(false);
    }
  };

  const getConnectionStatus = () => {
    if (!awarioStats?.connection) return { icon: AlertCircle, color: 'text-gray-500', bg: 'bg-gray-100', text: 'Sconosciuto' };
    
    if (awarioStats.connection.success) {
      return { icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-100', text: 'Connesso' };
    } else {
      return { icon: XCircle, color: 'text-red-600', bg: 'bg-red-100', text: 'Disconnesso' };
    }
  };

  const getSentimentPercentage = (count: number, total: number): number => {
    return total > 0 ? Math.round((count / total) * 100) : 0;
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-64 mb-6"></div>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const connectionStatus = getConnectionStatus();
  const stats = awarioStats?.stats;
  const totalContents = stats?.totalContents || 0;

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Integrazione Awario</h1>
          <p className="text-muted-foreground">
            Monitoraggio social media e web tramite API Awario
          </p>
        </div>
        <div className="space-x-2">
          <Button 
            onClick={syncAwario}
            disabled={syncLoading}
            variant="default"
          >
            {syncLoading ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Sincronizzazione...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4 mr-2" />
                Sincronizza Ora
              </>
            )}
          </Button>
          <Button onClick={() => router.push('/dashboard/contenuti')} variant="outline">
            Vai ai Contenuti →
          </Button>
        </div>
      </div>

      {/* Stato Connessione */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <connectionStatus.icon className={`h-5 w-5 ${connectionStatus.color}`} />
            <span>Stato Connessione</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className={`p-3 rounded-full ${connectionStatus.bg}`}>
                <Globe className={`h-6 w-6 ${connectionStatus.color}`} />
              </div>
              <div>
                <p className="font-semibold">{connectionStatus.text}</p>
                <p className="text-sm text-muted-foreground">
                  {awarioStats?.connection?.message || 'Stato sconosciuto'}
                </p>
                {lastSync && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Ultimo controllo: {lastSync}
                  </p>
                )}
              </div>
            </div>
            <Badge 
              variant={awarioStats?.connection?.success ? "default" : "destructive"}
            >
              {awarioStats?.connection?.success ? "Attivo" : "Inattivo"}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Alert configurazione */}
      {!awarioStats?.connection?.success && (
        <Alert className="mb-6 border-orange-200 bg-orange-50">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-orange-800">
            <strong>Configurazione richiesta:</strong> Per utilizzare Awario, è necessario configurare le credenziali API.
            Contattare l'amministratore di sistema per inserire <code>AWARIO_API_KEY</code> nelle variabili d'ambiente.
            <br />
            <span className="text-sm mt-2 block">
              Nel frattempo, il sistema utilizza dati simulati per la dimostrazione.
            </span>
          </AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="stats" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="stats">Statistiche</TabsTrigger>
          <TabsTrigger value="sentiment">Sentiment Analysis</TabsTrigger>
          <TabsTrigger value="config">Configurazione</TabsTrigger>
        </TabsList>

        {/* Tab Statistiche */}
        <TabsContent value="stats" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <BarChart3 className="h-4 w-4 text-blue-600" />
                  <div className="ml-2">
                    <p className="text-sm font-medium text-muted-foreground">Contenuti Totali</p>
                    <p className="text-2xl font-bold">{stats?.totalContents || 0}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <Calendar className="h-4 w-4 text-green-600" />
                  <div className="ml-2">
                    <p className="text-sm font-medium text-muted-foreground">Ultimi 24h</p>
                    <p className="text-2xl font-bold">{stats?.recentContents || 0}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <TrendingUp className="h-4 w-4 text-green-600" />
                  <div className="ml-2">
                    <p className="text-sm font-medium text-muted-foreground">Positivi</p>
                    <p className="text-2xl font-bold">{stats?.positiveContents || 0}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <TrendingDown className="h-4 w-4 text-red-600" />
                  <div className="ml-2">
                    <p className="text-sm font-medium text-muted-foreground">Negativi</p>
                    <p className="text-2xl font-bold">{stats?.negativeContents || 0}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Tab Sentiment */}
        <TabsContent value="sentiment" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Distribuzione Sentiment</CardTitle>
              <CardDescription>
                Analisi del sentiment dei contenuti monitorati
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <TrendingUp className="h-4 w-4 text-green-600" />
                    <span>Positivo</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-muted-foreground">
                      {stats?.positiveContents || 0} ({getSentimentPercentage(stats?.positiveContents || 0, totalContents)}%)
                    </span>
                    <div className="w-32 bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-green-600 h-2 rounded-full" 
                        style={{ width: `${getSentimentPercentage(stats?.positiveContents || 0, totalContents)}%` }}
                      />
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Minus className="h-4 w-4 text-gray-600" />
                    <span>Neutro</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-muted-foreground">
                      {stats?.neutralContents || 0} ({getSentimentPercentage(stats?.neutralContents || 0, totalContents)}%)
                    </span>
                    <div className="w-32 bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-gray-600 h-2 rounded-full" 
                        style={{ width: `${getSentimentPercentage(stats?.neutralContents || 0, totalContents)}%` }}
                      />
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <TrendingDown className="h-4 w-4 text-red-600" />
                    <span>Negativo</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-muted-foreground">
                      {stats?.negativeContents || 0} ({getSentimentPercentage(stats?.negativeContents || 0, totalContents)}%)
                    </span>
                    <div className="w-32 bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-red-600 h-2 rounded-full" 
                        style={{ width: `${getSentimentPercentage(stats?.negativeContents || 0, totalContents)}%` }}
                      />
                    </div>
                  </div>
                </div>

                {stats?.averageSentiment !== undefined && (
                  <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">Sentiment Medio</span>
                      <span className="text-lg font-bold">
                        {stats.averageSentiment > 0 ? '+' : ''}{stats.averageSentiment.toFixed(2)}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab Configurazione */}
        <TabsContent value="config" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Zap className="h-5 w-5" />
                <span>Configurazione Awario</span>
              </CardTitle>
              <CardDescription>
                Impostazioni per l'integrazione con l'API Awario
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Configurazione tramite variabili d'ambiente:</strong>
                  <br />
                  Per configurare l'integrazione Awario, è necessario impostare le seguenti variabili d'ambiente nel file <code>.env</code>:
                </AlertDescription>
              </Alert>

              <div className="bg-gray-50 p-4 rounded-lg font-mono text-sm">
                <div className="space-y-2">
                  <div><strong>AWARIO_API_KEY</strong>="your-api-key-here"</div>
                  <div><strong>AWARIO_BASE_URL</strong>="https://api.awario.com/v1"</div>
                  <div><strong>CRON_SECRET</strong>="awario-sync-2024-secret-key"</div>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="font-semibold">Come ottenere le credenziali API:</h4>
                <ol className="list-decimal list-inside space-y-1 text-sm">
                  <li>Accedi al tuo account Awario</li>
                  <li>Vai su Settings → API</li>
                  <li>Genera una nuova API key</li>
                  <li>Copia la chiave e inseriscila nella variabile <code>AWARIO_API_KEY</code></li>
                  <li>Riavvia l'applicazione</li>
                </ol>
              </div>

              <div className="space-y-2">
                <h4 className="font-semibold">Sincronizzazione Automatica:</h4>
                <p className="text-sm text-muted-foreground">
                  Per configurare la sincronizzazione automatica, imposta un cron job che chiami:
                </p>
                <div className="bg-gray-50 p-2 rounded font-mono text-xs">
                  POST /api/awario/cron<br />
                  Header: x-cron-secret: awario-sync-2024-secret-key
                </div>
                <p className="text-xs text-muted-foreground">
                  Raccomandato: ogni 15-30 minuti per dati aggiornati
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
