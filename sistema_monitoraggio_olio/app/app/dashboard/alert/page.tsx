

'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle, CheckCircle, Clock, Filter, MoreHorizontal } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface AlertItem {
  id: string;
  tipo: string;
  priorita: string;
  titolo: string;
  descrizione: string;
  fonte: string;
  isRisolto: boolean;
  isNotificato: boolean;
  createdAt: string;
  dataRisolto?: string;
}

export default function AlertPage() {
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const router = useRouter();

  useEffect(() => {
    fetchAlerts();
  }, []);

  const fetchAlerts = async () => {
    try {
      const response = await fetch('/api/alert');
      const data = await response.json();
      setAlerts(data.alerts || []);
    } catch (error) {
      console.error('Errore caricamento alert:', error);
    } finally {
      setLoading(false);
    }
  };

  const risolviAlert = async (id: string) => {
    try {
      const response = await fetch(`/api/alert/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ isRisolto: true })
      });

      if (response.ok) {
        fetchAlerts();
      }
    } catch (error) {
      console.error('Errore risoluzione alert:', error);
    }
  };

  const getPriorityColor = (priorita: string) => {
    switch (priorita) {
      case 'critico': return 'destructive';
      case 'medio': return 'default';
      case 'basso': return 'secondary';
      default: return 'default';
    }
  };

  const getPriorityIcon = (priorita: string) => {
    switch (priorita) {
      case 'critico': return <AlertTriangle className="h-4 w-4" />;
      case 'medio': return <Clock className="h-4 w-4" />;
      case 'basso': return <CheckCircle className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  const filteredAlerts = alerts.filter(alert => {
    switch (filter) {
      case 'risolti': return alert.isRisolto;
      case 'attivi': return !alert.isRisolto;
      case 'critico': return alert.priorita === 'critico';
      default: return true;
    }
  });

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-64 mb-6"></div>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Sistema Alert</h1>
          <p className="text-muted-foreground">
            Gestisci e monitora tutti gli alert del sistema
          </p>
        </div>
        <Button onClick={() => router.push('/dashboard')} variant="outline">
          ← Torna alla Dashboard
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <div className="ml-2">
                <p className="text-sm font-medium text-muted-foreground">Critici Attivi</p>
                <p className="text-2xl font-bold">
                  {alerts.filter(a => a.priorita === 'critico' && !a.isRisolto).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Clock className="h-4 w-4 text-orange-600" />
              <div className="ml-2">
                <p className="text-sm font-medium text-muted-foreground">In Attesa</p>
                <p className="text-2xl font-bold">
                  {alerts.filter(a => !a.isRisolto).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <div className="ml-2">
                <p className="text-sm font-medium text-muted-foreground">Risolti</p>
                <p className="text-2xl font-bold">
                  {alerts.filter(a => a.isRisolto).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Filter className="h-4 w-4 text-blue-600" />
              <div className="ml-2">
                <p className="text-sm font-medium text-muted-foreground">Totali</p>
                <p className="text-2xl font-bold">{alerts.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="all" value={filter} onValueChange={setFilter}>
        <TabsList>
          <TabsTrigger value="all">Tutti</TabsTrigger>
          <TabsTrigger value="attivi">Attivi</TabsTrigger>
          <TabsTrigger value="critico">Critici</TabsTrigger>
          <TabsTrigger value="risolti">Risolti</TabsTrigger>
        </TabsList>

        <TabsContent value={filter} className="space-y-4">
          {filteredAlerts.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold">Nessun alert trovato</h3>
                <p className="text-muted-foreground">Non ci sono alert che corrispondono ai filtri selezionati.</p>
              </CardContent>
            </Card>
          ) : (
            filteredAlerts.map((alert) => (
              <Card key={alert.id} className={alert.priorita === 'critico' ? 'border-red-200' : ''}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-2">
                      {getPriorityIcon(alert.priorita)}
                      <Badge variant={getPriorityColor(alert.priorita) as any}>
                        {alert.priorita.toUpperCase()}
                      </Badge>
                      <Badge variant="outline">
                        {alert.tipo.replace('_', ' ')}
                      </Badge>
                      {alert.isRisolto && (
                        <Badge variant="secondary">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Risolto
                        </Badge>
                      )}
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem 
                          onClick={() => risolviAlert(alert.id)}
                          disabled={alert.isRisolto}
                        >
                          Segna come risolto
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          Visualizza dettagli
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <CardTitle className="text-lg">{alert.titolo}</CardTitle>
                  <CardDescription>
                    {format(new Date(alert.createdAt), 'PPp', { locale: it })}
                    {alert.fonte && ` • Fonte: ${alert.fonte}`}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">{alert.descrizione}</p>
                  {alert.isRisolto && alert.dataRisolto && (
                    <Alert>
                      <CheckCircle className="h-4 w-4" />
                      <AlertTitle>Alert risolto</AlertTitle>
                      <AlertDescription>
                        Risolto il {format(new Date(alert.dataRisolto), 'PPp', { locale: it })}
                      </AlertDescription>
                    </Alert>
                  )}
                  {!alert.isRisolto && (
                    <Button 
                      onClick={() => risolviAlert(alert.id)}
                      size="sm"
                      className="mt-2"
                    >
                      Risolvi Alert
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
