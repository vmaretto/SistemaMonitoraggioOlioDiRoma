

'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DatePickerWithRange } from '@/components/ui/date-range-picker';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Download, FileText, BarChart3, PieChart, TrendingUp, TrendingDown, Calendar } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { DateRange } from 'react-day-picker';
import { addDays, subDays } from 'date-fns';

interface ReportData {
  periodo: {
    inizio: string;
    fine: string;
  };
  sentiment: {
    positivi: number;
    neutri: number;
    negativi: number;
    totali: number;
    media: number;
  };
  contenuti: {
    social: number;
    blog: number;
    ecommerce: number;
    news: number;
    totali: number;
  };
  keywords: {
    keyword: string;
    menzioni: number;
    sentiment: number;
  }[];
  etichette: {
    verificate: number;
    conformi: number;
    non_conformi: number;
    sospette: number;
  };
  alert: {
    critico: number;
    medio: number;
    basso: number;
    risolti: number;
  };
}

export default function ReportPage() {
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(false);
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: subDays(new Date(), 30),
    to: new Date()
  });
  const [reportType, setReportType] = useState('completo');
  const [exportLoading, setExportLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (dateRange?.from && dateRange?.to) {
      generateReport();
    }
  }, [dateRange]);

  const generateReport = async () => {
    if (!dateRange?.from || !dateRange?.to) return;

    setLoading(true);
    try {
      const params = new URLSearchParams({
        inizio: dateRange.from.toISOString(),
        fine: dateRange.to.toISOString(),
        tipo: reportType
      });

      const response = await fetch(`/api/report?${params}`);
      const data = await response.json();
      setReportData(data);
    } catch (error) {
      console.error('Errore generazione report:', error);
    } finally {
      setLoading(false);
    }
  };

  const exportReport = async (formato: 'csv' | 'pdf') => {
    if (!dateRange?.from || !dateRange?.to) return;

    setExportLoading(true);
    try {
      const params = new URLSearchParams({
        inizio: dateRange.from.toISOString(),
        fine: dateRange.to.toISOString(),
        tipo: reportType,
        formato
      });

      const response = await fetch(`/api/export/${formato}?${params}`);
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = `report_monitoraggio_${format(new Date(), 'yyyy-MM-dd')}.${formato}`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Errore export report:', error);
    } finally {
      setExportLoading(false);
    }
  };

  const getSentimentPercentage = (valore: number, totale: number) => {
    return totale > 0 ? ((valore / totale) * 100).toFixed(1) : '0.0';
  };

  const getSentimentIcon = (sentiment: number) => {
    if (sentiment > 0.2) return <TrendingUp className="h-4 w-4 text-green-600" />;
    if (sentiment < -0.2) return <TrendingDown className="h-4 w-4 text-red-600" />;
    return <div className="h-4 w-4 rounded-full bg-gray-400" />;
  };

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Report e Analytics</h1>
          <p className="text-muted-foreground">
            Genera e analizza report dettagliati sul monitoraggio reputazionale
          </p>
        </div>
        <Button onClick={() => router.push('/dashboard')} variant="outline">
          ← Torna alla Dashboard
        </Button>
      </div>

      {/* Controlli Report */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg flex items-center">
            <BarChart3 className="h-5 w-5 mr-2" />
            Genera Report Personalizzato
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <div>
              <label className="text-sm font-medium mb-2 block">Periodo</label>
              <DatePickerWithRange
                date={dateRange}
                onDateChange={setDateRange}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Tipo Report</label>
              <Select value={reportType} onValueChange={setReportType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="completo">Report Completo</SelectItem>
                  <SelectItem value="sentiment">Solo Sentiment</SelectItem>
                  <SelectItem value="etichette">Solo Etichette</SelectItem>
                  <SelectItem value="alert">Solo Alert</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button 
              onClick={generateReport} 
              disabled={loading || !dateRange?.from || !dateRange?.to}
            >
              {loading ? 'Generando...' : 'Genera Report'}
            </Button>
            <div className="flex space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => exportReport('csv')}
                disabled={exportLoading || !reportData}
              >
                <Download className="h-4 w-4 mr-2" />
                CSV
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => exportReport('pdf')}
                disabled={exportLoading || !reportData}
              >
                <FileText className="h-4 w-4 mr-2" />
                PDF
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Report Data */}
      {loading ? (
        <div className="space-y-6">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-64 mb-4"></div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-24 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      ) : reportData ? (
        <div className="space-y-6">
          {/* Header Report */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Report Monitoraggio Reputazionale</span>
                <Badge variant="outline">
                  {format(new Date(reportData.periodo.inizio), 'PP', { locale: it })} - {format(new Date(reportData.periodo.fine), 'PP', { locale: it })}
                </Badge>
              </CardTitle>
              <CardDescription>
                Analisi completa del periodo selezionato
              </CardDescription>
            </CardHeader>
          </Card>

          <Tabs defaultValue="overview" className="space-y-6">
            <TabsList>
              <TabsTrigger value="overview">Panoramica</TabsTrigger>
              <TabsTrigger value="sentiment">Sentiment Analysis</TabsTrigger>
              <TabsTrigger value="contenuti">Contenuti</TabsTrigger>
              <TabsTrigger value="etichette">Etichette</TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center">
                      <div className="h-2 w-2 rounded-full bg-blue-600 mr-2"></div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Contenuti Totali</p>
                        <p className="text-2xl font-bold">{reportData.contenuti.totali.toLocaleString()}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center">
                      <TrendingUp className="h-4 w-4 text-green-600 mr-2" />
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Sentiment Medio</p>
                        <p className="text-2xl font-bold">{reportData.sentiment.media.toFixed(2)}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center">
                      <div className="h-2 w-2 rounded-full bg-orange-600 mr-2"></div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Alert Attivi</p>
                        <p className="text-2xl font-bold">
                          {reportData.alert.critico + reportData.alert.medio + reportData.alert.basso}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center">
                      <div className="h-2 w-2 rounded-full bg-green-600 mr-2"></div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Etichette Verificate</p>
                        <p className="text-2xl font-bold">{reportData.etichette.verificate}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Sentiment Tab */}
            <TabsContent value="sentiment" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center">
                      <TrendingUp className="h-5 w-5 text-green-600 mr-2" />
                      Sentiment Positivi
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-green-600 mb-2">
                      {reportData.sentiment.positivi}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {getSentimentPercentage(reportData.sentiment.positivi, reportData.sentiment.totali)}% del totale
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center">
                      <div className="h-5 w-5 rounded-full bg-gray-400 mr-2"></div>
                      Sentiment Neutri
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-gray-600 mb-2">
                      {reportData.sentiment.neutri}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {getSentimentPercentage(reportData.sentiment.neutri, reportData.sentiment.totali)}% del totale
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center">
                      <TrendingDown className="h-5 w-5 text-red-600 mr-2" />
                      Sentiment Negativi
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-red-600 mb-2">
                      {reportData.sentiment.negativi}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {getSentimentPercentage(reportData.sentiment.negativi, reportData.sentiment.totali)}% del totale
                    </p>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Performance per Keyword</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {reportData.keywords.map((kw, index) => (
                      <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center space-x-3">
                          {getSentimentIcon(kw.sentiment)}
                          <div>
                            <p className="font-medium">{kw.keyword}</p>
                            <p className="text-sm text-muted-foreground">
                              {kw.menzioni} menzioni • Sentiment: {kw.sentiment.toFixed(2)}
                            </p>
                          </div>
                        </div>
                        <Badge variant={kw.sentiment > 0.2 ? "default" : kw.sentiment < -0.2 ? "destructive" : "secondary"}>
                          {kw.sentiment > 0.2 ? 'Positivo' : kw.sentiment < -0.2 ? 'Negativo' : 'Neutro'}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Contenuti Tab */}
            <TabsContent value="contenuti" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center">
                      <span className="text-2xl mr-2">📱</span>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Social Media</p>
                        <p className="text-2xl font-bold">{reportData.contenuti.social}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center">
                      <span className="text-2xl mr-2">📰</span>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Blog</p>
                        <p className="text-2xl font-bold">{reportData.contenuti.blog}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center">
                      <span className="text-2xl mr-2">🛒</span>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">E-commerce</p>
                        <p className="text-2xl font-bold">{reportData.contenuti.ecommerce}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center">
                      <span className="text-2xl mr-2">📺</span>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">News</p>
                        <p className="text-2xl font-bold">{reportData.contenuti.news}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Etichette Tab */}
            <TabsContent value="etichette" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center">
                      <span className="text-2xl mr-2">✅</span>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Conformi</p>
                        <p className="text-2xl font-bold">{reportData.etichette.conformi}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center">
                      <span className="text-2xl mr-2">⚠️</span>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Sospette</p>
                        <p className="text-2xl font-bold">{reportData.etichette.sospette}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center">
                      <span className="text-2xl mr-2">❌</span>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Non Conformi</p>
                        <p className="text-2xl font-bold">{reportData.etichette.non_conformi}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center">
                      <span className="text-2xl mr-2">📊</span>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Totali Verificate</p>
                        <p className="text-2xl font-bold">{reportData.etichette.verificate}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      ) : (
        <Card>
          <CardContent className="p-12 text-center">
            <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold">Genera un Report</h3>
            <p className="text-muted-foreground">Seleziona un periodo e tipo di report per iniziare l'analisi.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
