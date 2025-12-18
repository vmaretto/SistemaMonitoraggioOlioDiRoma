

'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DatePickerWithRange } from '@/components/ui/date-range-picker';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TrendingUp, TrendingDown, Minus, Calendar, BarChart3, PieChart, Activity } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import { it } from 'date-fns/locale';
import { DateRange } from 'react-day-picker';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart as RechartsPieChart, Pie, Cell, BarChart, Bar } from 'recharts';

interface SentimentData {
  date: string;
  positivi: number;
  neutri: number;
  negativi: number;
  media: number;
}

interface KeywordSentiment {
  keyword: string;
  positivi: number;
  neutri: number;
  negativi: number;
  media: number;
  totali: number;
}

interface PiattaformaSentiment {
  piattaforma: string;
  positivi: number;
  neutri: number;
  negativi: number;
  media: number;
  totali: number;
}

export default function SentimentPage() {
  const [sentimentData, setSentimentData] = useState<SentimentData[]>([]);
  const [keywordData, setKeywordData] = useState<KeywordSentiment[]>([]);
  const [piattaformaData, setPiattaformaData] = useState<PiattaformaSentiment[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: subDays(new Date(), 30),
    to: new Date()
  });
  const [selectedKeyword, setSelectedKeyword] = useState('all');
  const [selectedPiattaforma, setSelectedPiattaforma] = useState('all');
  const [availableKeywords, setAvailableKeywords] = useState<string[]>([]);
  const [availablePiattaforme, setAvailablePiattaforme] = useState<string[]>([]);
  const router = useRouter();

  // Carica keywords attive all'avvio
  useEffect(() => {
    fetchAvailableKeywords();
  }, []);

  useEffect(() => {
    if (dateRange?.from && dateRange?.to) {
      fetchSentimentData();
    }
  }, [dateRange, selectedKeyword, selectedPiattaforma]);

  const fetchAvailableKeywords = async () => {
    try {
      const response = await fetch('/api/keywords');
      if (response.ok) {
        const data = await response.json();
        const keywords = data.keywords
          ?.filter((k: any) => k.isActive)
          ?.map((k: any) => k.keyword) || [];
        setAvailableKeywords(keywords);
      }
    } catch (error) {
      console.error('Errore caricamento keywords:', error);
    }
  };

  const fetchSentimentData = async () => {
    if (!dateRange?.from || !dateRange?.to) return;

    setLoading(true);
    try {
      const params = new URLSearchParams({
        inizio: startOfDay(dateRange.from).toISOString(),
        fine: endOfDay(dateRange.to).toISOString(),
        ...(selectedKeyword !== 'all' && { keyword: selectedKeyword }),
        ...(selectedPiattaforma !== 'all' && { piattaforma: selectedPiattaforma })
      });

      const response = await fetch(`/api/sentiment-analysis?${params}`);
      const data = await response.json();

      setSentimentData(data.timeline || []);
      setKeywordData(data.keywords || []);
      setPiattaformaData(data.piattaforme || []);

      // Aggiorna piattaforme disponibili dai dati
      if (data.piattaforme && data.piattaforme.length > 0) {
        const piattaformeNames = data.piattaforme.map((p: any) => p.piattaforma);
        setAvailablePiattaforme(piattaformeNames);
      }
    } catch (error) {
      console.error('Errore caricamento dati sentiment:', error);
    } finally {
      setLoading(false);
    }
  };

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case 'positivo': return '#10b981';
      case 'negativo': return '#ef4444';
      case 'neutro': return '#6b7280';
      default: return '#6b7280';
    }
  };

  const getSentimentIcon = (media: number) => {
    if (media > 0.2) return <TrendingUp className="h-4 w-4 text-green-600" />;
    if (media < -0.2) return <TrendingDown className="h-4 w-4 text-red-600" />;
    return <Minus className="h-4 w-4 text-gray-600" />;
  };

  const getSentimentBadge = (media: number) => {
    if (media > 0.2) return <Badge className="bg-green-100 text-green-800">Positivo</Badge>;
    if (media < -0.2) return <Badge variant="destructive">Negativo</Badge>;
    return <Badge variant="secondary">Neutro</Badge>;
  };

  // Dati per i grafici
  const pieData = sentimentData.reduce(
    (acc, curr) => ({
      positivi: acc.positivi + curr.positivi,
      neutri: acc.neutri + curr.neutri,
      negativi: acc.negativi + curr.negativi
    }),
    { positivi: 0, neutri: 0, negativi: 0 }
  );

  const pieChartData = [
    { name: 'Positivi', value: pieData.positivi, fill: '#10b981' },
    { name: 'Neutri', value: pieData.neutri, fill: '#6b7280' },
    { name: 'Negativi', value: pieData.negativi, fill: '#ef4444' }
  ];

  const totaliContenuti = pieData.positivi + pieData.neutri + pieData.negativi;
  const mediaComplessiva = sentimentData.length > 0 
    ? sentimentData.reduce((acc, curr) => acc + curr.media, 0) / sentimentData.length 
    : 0;

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-64 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
          <div className="h-96 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Sentiment Analysis</h1>
          <p className="text-muted-foreground">
            Analisi dettagliata del sentiment dei contenuti monitorati
          </p>
        </div>
        <Button onClick={() => router.push('/dashboard')} variant="outline">
          ← Torna alla Dashboard
        </Button>
      </div>

      {/* Controlli */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg flex items-center">
            <Activity className="h-5 w-5 mr-2" />
            Filtri Analisi
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Periodo</label>
              <DatePickerWithRange
                date={dateRange}
                onDateChange={setDateRange}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Keyword</label>
              <Select value={selectedKeyword} onValueChange={setSelectedKeyword}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tutte le keywords</SelectItem>
                  {availableKeywords.map((kw) => (
                    <SelectItem key={kw} value={kw}>{kw}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Piattaforma</label>
              <Select value={selectedPiattaforma} onValueChange={setSelectedPiattaforma}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tutte le piattaforme</SelectItem>
                  {availablePiattaforme.map((plat) => (
                    <SelectItem key={plat} value={plat}>{plat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button onClick={fetchSentimentData} className="w-full">
                Aggiorna Analisi
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Statistiche Generali */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <TrendingUp className="h-4 w-4 text-green-600" />
              <div className="ml-2">
                <p className="text-sm font-medium text-muted-foreground">Contenuti Positivi</p>
                <p className="text-2xl font-bold">{pieData.positivi}</p>
                <p className="text-xs text-muted-foreground">
                  {totaliContenuti > 0 ? ((pieData.positivi / totaliContenuti) * 100).toFixed(1) : '0'}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Minus className="h-4 w-4 text-gray-600" />
              <div className="ml-2">
                <p className="text-sm font-medium text-muted-foreground">Contenuti Neutri</p>
                <p className="text-2xl font-bold">{pieData.neutri}</p>
                <p className="text-xs text-muted-foreground">
                  {totaliContenuti > 0 ? ((pieData.neutri / totaliContenuti) * 100).toFixed(1) : '0'}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <TrendingDown className="h-4 w-4 text-red-600" />
              <div className="ml-2">
                <p className="text-sm font-medium text-muted-foreground">Contenuti Negativi</p>
                <p className="text-2xl font-bold">{pieData.negativi}</p>
                <p className="text-xs text-muted-foreground">
                  {totaliContenuti > 0 ? ((pieData.negativi / totaliContenuti) * 100).toFixed(1) : '0'}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              {getSentimentIcon(mediaComplessiva)}
              <div className="ml-2">
                <p className="text-sm font-medium text-muted-foreground">Sentiment Medio</p>
                <p className="text-2xl font-bold">{mediaComplessiva.toFixed(2)}</p>
                <div className="mt-1">
                  {getSentimentBadge(mediaComplessiva)}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Grafici */}
      <Tabs defaultValue="timeline" className="space-y-6">
        <TabsList>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
          <TabsTrigger value="distribuzione">Distribuzione</TabsTrigger>
          <TabsTrigger value="keywords">Per Keyword</TabsTrigger>
          <TabsTrigger value="piattaforme">Per Piattaforma</TabsTrigger>
        </TabsList>

        <TabsContent value="timeline" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Andamento Sentiment nel Tempo</CardTitle>
              <CardDescription>
                Evoluzione del sentiment giorno per giorno
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={sentimentData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="date" 
                    tickFormatter={(value) => format(new Date(value), 'dd/MM', { locale: it })}
                  />
                  <YAxis />
                  <Tooltip 
                    labelFormatter={(value) => format(new Date(value), 'PPP', { locale: it })}
                    formatter={(value: number, name: string) => [
                      value.toFixed(2),
                      name === 'media' ? 'Sentiment Medio' : name
                    ]}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="media" 
                    stroke="#2563eb" 
                    strokeWidth={3}
                    dot={{ fill: '#2563eb' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="distribuzione" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Distribuzione Sentiment</CardTitle>
                <CardDescription>
                  Proporzione dei diversi tipi di sentiment
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <RechartsPieChart>
                    <Pie
                      data={pieChartData}
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      dataKey="value"

                    >
                      {pieChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </RechartsPieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Contenuti per Giorno</CardTitle>
                <CardDescription>
                  Volume giornaliero dei contenuti per sentiment
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={sentimentData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="date" 
                      tickFormatter={(value) => format(new Date(value), 'dd/MM', { locale: it })}
                    />
                    <YAxis />
                    <Tooltip 
                      labelFormatter={(value) => format(new Date(value), 'PPP', { locale: it })}
                    />
                    <Bar dataKey="positivi" stackId="a" fill="#10b981" />
                    <Bar dataKey="neutri" stackId="a" fill="#6b7280" />
                    <Bar dataKey="negativi" stackId="a" fill="#ef4444" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="keywords" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Performance per Keyword</CardTitle>
              <CardDescription>
                Analisi del sentiment per ciascuna parola chiave monitorata
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {keywordData.map((kw, index) => (
                  <div key={index} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold flex items-center">
                        {getSentimentIcon(kw.media)}
                        <span className="ml-2">{kw.keyword}</span>
                      </h3>
                      <div className="flex items-center space-x-2">
                        {getSentimentBadge(kw.media)}
                        <Badge variant="outline">{kw.totali} contenuti</Badge>
                      </div>
                    </div>
                    <div className="grid grid-cols-4 gap-4 text-sm">
                      <div className="text-center">
                        <div className="font-semibold text-green-600">{kw.positivi}</div>
                        <div className="text-muted-foreground">Positivi</div>
                      </div>
                      <div className="text-center">
                        <div className="font-semibold text-gray-600">{kw.neutri}</div>
                        <div className="text-muted-foreground">Neutri</div>
                      </div>
                      <div className="text-center">
                        <div className="font-semibold text-red-600">{kw.negativi}</div>
                        <div className="text-muted-foreground">Negativi</div>
                      </div>
                      <div className="text-center">
                        <div className="font-semibold">{kw.media.toFixed(2)}</div>
                        <div className="text-muted-foreground">Sentiment</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="piattaforme" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Performance per Piattaforma</CardTitle>
              <CardDescription>
                Analisi del sentiment suddivisa per piattaforma social e web
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {piattaformaData.map((piatt, index) => (
                  <div key={index} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold flex items-center">
                        {getSentimentIcon(piatt.media)}
                        <span className="ml-2 capitalize">{piatt.piattaforma}</span>
                      </h3>
                      <div className="flex items-center space-x-2">
                        {getSentimentBadge(piatt.media)}
                        <Badge variant="outline">{piatt.totali} contenuti</Badge>
                      </div>
                    </div>
                    <div className="grid grid-cols-4 gap-4 text-sm">
                      <div className="text-center">
                        <div className="font-semibold text-green-600">{piatt.positivi}</div>
                        <div className="text-muted-foreground">Positivi</div>
                      </div>
                      <div className="text-center">
                        <div className="font-semibold text-gray-600">{piatt.neutri}</div>
                        <div className="text-muted-foreground">Neutri</div>
                      </div>
                      <div className="text-center">
                        <div className="font-semibold text-red-600">{piatt.negativi}</div>
                        <div className="text-muted-foreground">Negativi</div>
                      </div>
                      <div className="text-center">
                        <div className="font-semibold">{piatt.media.toFixed(2)}</div>
                        <div className="text-muted-foreground">Sentiment</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
