

'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TrendingUp, TrendingDown, Minus, Search, Calendar, ExternalLink } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';

interface ContenutoMonitorato {
  id: string;
  fonte: string;
  piattaforma: string;
  testo: string;
  url?: string;
  autore?: string;
  sentiment: string;
  sentimentScore: number;
  keywords: string[];
  dataPost: string;
  rilevanza: number;
  createdAt: string;
}

export default function ContenutiPage() {
  const [contenuti, setContenuti] = useState<ContenutoMonitorato[]>([]);
  const [activeKeywords, setActiveKeywords] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSentiment, setFilterSentiment] = useState('all');
  const [filterFonte, setFilterFonte] = useState('all');
  const [filterKeyword, setFilterKeyword] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [providerStats, setProviderStats] = useState<any>(null);
  const [syncLoading, setSyncLoading] = useState(false);
  const [aiTestLoading, setAiTestLoading] = useState(false);
  const [aiStatus, setAiStatus] = useState<string>('unknown');
  const router = useRouter();

  const itemsPerPage = 10;

  useEffect(() => {
    fetchContenuti();
    fetchProviderStats();
    checkAiStatus();
  }, [currentPage, filterSentiment, filterFonte, filterKeyword, searchTerm]);

  const fetchContenuti = async () => {
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: itemsPerPage.toString(),
        ...(searchTerm && { search: searchTerm }),
        ...(filterSentiment !== 'all' && { sentiment: filterSentiment }),
        ...(filterFonte !== 'all' && { fonte: filterFonte }),
        ...(filterKeyword !== 'all' && { keyword: filterKeyword })
      });

      const response = await fetch(`/api/contenuti?${params}`);
      const data = await response.json();
      setContenuti(data.contenuti || []);
      setActiveKeywords(data.activeKeywords || []);
      setTotalPages(Math.ceil((data.total || 0) / itemsPerPage));
    } catch (error) {
      console.error('Errore caricamento contenuti:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchProviderStats = async () => {
    try {
      const response = await fetch('/api/providers/test');
      if (response.ok) {
        const data = await response.json();
        setProviderStats(data);
      }
    } catch (error) {
      console.error('Errore caricamento stats provider:', error);
    }
  };

  const syncMultiProvider = async () => {
    try {
      setSyncLoading(true);
      const response = await fetch('/api/ingestion/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profile: 'brand_monitoring',
          options: { maxItemsPerProvider: 20, mockMode: true }
        })
      });
      const result = await response.json();
      
      if (response.ok && result.success) {
        await fetchContenuti();
        await fetchProviderStats();
        alert(`✅ ${result.message}`);
      } else {
        alert(`❌ Errore: ${result.message || result.error}`);
      }
    } catch (error) {
      console.error('Errore sincronizzazione multi-provider:', error);
      alert('❌ Errore durante la sincronizzazione multi-provider');
    } finally {
      setSyncLoading(false);
    }
  };

  const updateKeywordMatching = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/contenuti/update-keywords', {
        method: 'POST'
      });
      const result = await response.json();
      
      if (response.ok) {
        // Ricarica i contenuti dopo l'aggiornamento
        await fetchContenuti();
        alert(`✅ ${result.message}`);
      } else {
        alert(`❌ Errore: ${result.error}`);
      }
    } catch (error) {
      console.error('Errore aggiornamento keywords:', error);
      alert('❌ Errore durante l\'aggiornamento');
    } finally {
      setLoading(false);
    }
  };

  const loadDemoData = async () => {
    const confirmed = confirm(
      '🚀 Caricare i dati demo?\n\n' +
      'Questo popolerà il database con:\n' +
      '• 6 Keywords categorizzate\n' +
      '• 8 Contenuti con sentiment analysis\n' +
      '• Collegamenti automatici contenuti-keyword\n' +
      '• Dati realistici da varie piattaforme\n\n' +
      '⚠️ Attenzione: Questo sostituirà i dati esistenti!'
    );
    
    if (!confirmed) return;

    try {
      setLoading(true);
      const response = await fetch('/api/seed-demo-data', {
        method: 'POST'
      });
      const result = await response.json();
      
      if (response.ok) {
        // Ricarica tutti i dati dopo il caricamento
        await fetchContenuti();
        await fetchProviderStats();
        alert(`✅ ${result.message}\n\nDettagli:\n${Object.entries(result.details).map(([k,v]) => `• ${k}: ${v}`).join('\n')}`);
      } else {
        alert(`❌ Errore: ${result.error}`);
      }
    } catch (error) {
      console.error('Errore caricamento dati demo:', error);
      alert('❌ Errore durante il caricamento dei dati demo');
    } finally {
      setLoading(false);
    }
  };

  const checkAiStatus = async () => {
    try {
      const response = await fetch('/api/ai-test');
      const data = await response.json();
      setAiStatus(data.aiStatus);
    } catch (error) {
      console.error('Errore verifica AI:', error);
      setAiStatus('error');
    }
  };

  const testAI = async () => {
    const testoEsempio = `
    Ho appena provato l'Olio Roma DOP del Consorzio Olio Roma-Lazio e devo dire che è fantastico! 
    La qualità è eccellente, sapore genuino e tradizionale. Consigliatissimo per chi cerca 
    un prodotto autentico del territorio laziale. Packaging curato e prezzo giusto.
    `;

    const confirmed = confirm(
      '🤖 Test AI vs Simulazione\n\n' +
      'Questo test mostrerà la differenza tra:\n' +
      '• AI Intelligente (sentiment, keyword semantiche, classificazione)\n' +
      '• Logica Simulata (pattern matching base)\n\n' +
      'Vuoi procedere con il test comparativo?'
    );
    
    if (!confirmed) return;

    try {
      setAiTestLoading(true);
      const response = await fetch('/api/ai-test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          testo: testoEsempio,
          testType: 'completo'
        })
      });

      const result = await response.json();
      
      if (response.ok) {
        // Mostra risultati in un alert dettagliato
        let alertMessage = '🎯 RISULTATI TEST AI vs SIMULAZIONE\n\n';
        
        if (result.testResults.sentimentAnalysis) {
          const sa = result.testResults.sentimentAnalysis;
          alertMessage += '📊 SENTIMENT ANALYSIS:\n';
          if (sa.ai && sa.simulated) {
            alertMessage += `• AI: ${sa.ai.result.sentiment} (${sa.ai.result.score.toFixed(2)}) - ${sa.ai.processingTime}\n`;
            alertMessage += `• Base: ${sa.simulated.result.sentiment} (${sa.simulated.result.score.toFixed(2)}) - ${sa.simulated.processingTime}\n`;
            alertMessage += `• Match: ${sa.comparison.sentimentMatch ? '✅' : '❌'}\n\n`;
          }
        }

        if (result.testResults.keywordProcessing) {
          const kp = result.testResults.keywordProcessing;
          alertMessage += '🔍 KEYWORD PROCESSING:\n';
          if (kp.ai && kp.simulated) {
            alertMessage += `• AI: ${kp.ai.result.keywords.length} keywords - ${kp.ai.processingTime}\n`;
            alertMessage += `• Base: ${kp.simulated.result.keywords.length} keywords - ${kp.simulated.processingTime}\n`;
            alertMessage += `• AI Extra: +${kp.comparison.additionalKeywords.length} semantic keywords\n\n`;
          }
        }

        if (result.testResults.contentClassification) {
          const cc = result.testResults.contentClassification;
          alertMessage += '🎯 CLASSIFICAZIONE:\n';
          if (cc.ai) {
            alertMessage += `• Categoria: ${cc.ai.result.category}\n`;
            alertMessage += `• Priorità: ${cc.ai.result.priority}\n`;
            alertMessage += `• Risk Level: ${cc.ai.result.riskLevel}\n\n`;
          }
        }

        alertMessage += '💡 VANTAGGI AI:\n';
        alertMessage += '• Comprensione semantica del contesto\n';
        alertMessage += '• Riconoscimento sarcasmo e ironia\n';
        alertMessage += '• Estrazione keyword intelligente\n';
        alertMessage += '• Classificazione automatica contenuti\n';
        alertMessage += '• Fallback sempre disponibile';

        alert(alertMessage);
      } else {
        alert(`❌ Errore nel test: ${result.error}`);
      }
    } catch (error) {
      console.error('Errore test AI:', error);
      alert('❌ Errore durante il test AI');
    } finally {
      setAiTestLoading(false);
    }
  };

  const getSentimentIcon = (sentiment: string) => {
    switch (sentiment) {
      case 'positivo': return <TrendingUp className="h-4 w-4 text-green-600" />;
      case 'negativo': return <TrendingDown className="h-4 w-4 text-red-600" />;
      case 'neutro': return <Minus className="h-4 w-4 text-gray-600" />;
      default: return <Minus className="h-4 w-4 text-gray-600" />;
    }
  };

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case 'positivo': return 'bg-green-100 text-green-800';
      case 'negativo': return 'bg-red-100 text-red-800';
      case 'neutro': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPiattaformaIcon = (piattaforma: string) => {
    switch (piattaforma.toLowerCase()) {
      case 'facebook': return '📘';
      case 'twitter': return '🐦';
      case 'instagram': return '📷';
      case 'amazon': return '📦';
      case 'google': return '🔍';
      default: return '🌐';
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-64 mb-6"></div>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
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
          <h1 className="text-3xl font-bold tracking-tight">Contenuti Monitorati</h1>
          <p className="text-muted-foreground">
            Analisi e monitoraggio dei contenuti online relativi alle parole chiave configurate
          </p>
        </div>
        <Button onClick={() => router.push('/dashboard')} variant="outline">
          ← Torna alla Dashboard
        </Button>
      </div>

      {/* Filtri e Ricerca */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg">Filtri e Ricerca</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cerca nei contenuti..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filterSentiment} onValueChange={setFilterSentiment}>
              <SelectTrigger>
                <SelectValue placeholder="Filtra per sentiment" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tutti i sentiment</SelectItem>
                <SelectItem value="positivo">Positivi</SelectItem>
                <SelectItem value="neutro">Neutri</SelectItem>
                <SelectItem value="negativo">Negativi</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterFonte} onValueChange={setFilterFonte}>
              <SelectTrigger>
                <SelectValue placeholder="Filtra per fonte" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tutte le fonti</SelectItem>
                <SelectItem value="social">Social Media</SelectItem>
                <SelectItem value="blog">Blog</SelectItem>
                <SelectItem value="ecommerce">E-commerce</SelectItem>
                <SelectItem value="news">News</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterKeyword} onValueChange={setFilterKeyword}>
              <SelectTrigger>
                <SelectValue placeholder="Filtra per keyword" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tutte le keywords</SelectItem>
                {activeKeywords.map((keyword) => (
                  <SelectItem key={keyword} value={keyword}>
                    {keyword}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button 
              onClick={() => {
                setSearchTerm('');
                setFilterSentiment('all');
                setFilterFonte('all');
                setFilterKeyword('all');
                setCurrentPage(1);
              }}
              variant="outline"
            >
              Reset Filtri
            </Button>
          </div>
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">
              {activeKeywords.length > 0 ? (
                <>Keywords attive: <strong>{activeKeywords.join(', ')}</strong></>
              ) : (
                'Nessuna keyword attiva configurata'
              )}
            </p>
            <div className="flex space-x-2">
              <Button 
                onClick={syncMultiProvider}
                variant={providerStats?.success ? "default" : "outline"}
                size="sm"
                disabled={syncLoading || loading}
              >
                {syncLoading ? (
                  <>🔄 Sync Multi-Provider...</>
                ) : (
                  <>🌐 Sincronizza Provider</>
                )}
              </Button>
              <Button 
                onClick={updateKeywordMatching}
                variant="outline" 
                size="sm"
                disabled={loading}
              >
                🔄 Aggiorna Keywords
              </Button>
              <Button 
                onClick={loadDemoData}
                variant="secondary" 
                size="sm"
                disabled={loading}
              >
                📊 Carica Dati Demo
              </Button>
              <Button 
                onClick={testAI}
                variant={aiStatus === 'funzionante' ? "default" : "outline"}
                size="sm"
                disabled={aiTestLoading || loading}
              >
                {aiTestLoading ? (
                  <>🔄 Test AI...</>
                ) : (
                  <>🤖 Test AI {aiStatus === 'funzionante' ? '✅' : aiStatus === 'non_configurata' ? '⚠️' : '❌'}</>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stato Sistemi */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {/* Stato Multi-Provider */}
        {providerStats && (
          <Card className={`${providerStats.success ? 'border-green-200 bg-green-50' : 'border-orange-200 bg-orange-50'}`}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className={`p-2 rounded-full ${providerStats.success ? 'bg-green-100' : 'bg-orange-100'}`}>
                    <div className={`h-3 w-3 rounded-full ${providerStats.success ? 'bg-green-500' : 'bg-orange-500'}`}></div>
                  </div>
                  <div>
                    <h4 className={`text-sm font-semibold ${providerStats.success ? 'text-green-900' : 'text-orange-900'}`}>
                      🔗 Multi-Provider: {providerStats.success ? 'Attivo' : 'Demo Mode'}
                    </h4>
                    <p className={`text-xs ${providerStats.success ? 'text-green-700' : 'text-orange-700'}`}>
                      {providerStats.message || 'Provider Webz.io & SerpApi'}
                    </p>
                  </div>
                </div>
                {providerStats.providers && (
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">
                      Webzio: <strong>{providerStats.providers.webzio ? '✅' : '❌'}</strong>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      SerpApi: <strong>{(providerStats.providers.serpapi_google_news && providerStats.providers.serpapi_reddit) ? '✅' : '❌'}</strong>
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Stato AI */}
        <Card className={`${aiStatus === 'funzionante' ? 'border-blue-200 bg-blue-50' : aiStatus === 'non_configurata' ? 'border-yellow-200 bg-yellow-50' : 'border-gray-200 bg-gray-50'}`}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className={`p-2 rounded-full ${aiStatus === 'funzionante' ? 'bg-blue-100' : aiStatus === 'non_configurata' ? 'bg-yellow-100' : 'bg-gray-100'}`}>
                  <div className={`h-3 w-3 rounded-full ${aiStatus === 'funzionante' ? 'bg-blue-500' : aiStatus === 'non_configurata' ? 'bg-yellow-500' : 'bg-gray-500'}`}></div>
                </div>
                <div>
                  <h4 className={`text-sm font-semibold ${aiStatus === 'funzionante' ? 'text-blue-900' : aiStatus === 'non_configurata' ? 'text-yellow-900' : 'text-gray-900'}`}>
                    🤖 AI Analysis: {aiStatus === 'funzionante' ? 'Attivo' : aiStatus === 'non_configurata' ? 'Disponibile' : 'Fallback'}
                  </h4>
                  <p className={`text-xs ${aiStatus === 'funzionante' ? 'text-blue-700' : aiStatus === 'non_configurata' ? 'text-yellow-700' : 'text-gray-700'}`}>
                    {aiStatus === 'funzionante' ? 'Sentiment & keyword intelligenti' : 
                     aiStatus === 'non_configurata' ? 'Ready - usando logica simulata' : 
                     'Simulato per demo'}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">
                  Model: <strong>GPT-4o-mini</strong>
                </p>
                <p className="text-xs text-muted-foreground">
                  Fallback: <strong>Sempre ON</strong>
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Statistiche */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <TrendingUp className="h-4 w-4 text-green-600" />
              <div className="ml-2">
                <p className="text-sm font-medium text-muted-foreground">Positivi</p>
                <p className="text-2xl font-bold">
                  {contenuti.filter(c => c.sentiment === 'positivo').length}
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
                <p className="text-sm font-medium text-muted-foreground">Neutri</p>
                <p className="text-2xl font-bold">
                  {contenuti.filter(c => c.sentiment === 'neutro').length}
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
                <p className="text-sm font-medium text-muted-foreground">Negativi</p>
                <p className="text-2xl font-bold">
                  {contenuti.filter(c => c.sentiment === 'negativo').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Calendar className="h-4 w-4 text-blue-600" />
              <div className="ml-2">
                <p className="text-sm font-medium text-muted-foreground">Totali</p>
                <p className="text-2xl font-bold">{contenuti.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Lista Contenuti */}
      <div className="space-y-4">
        {contenuti.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold">Nessun contenuto trovato</h3>
              <p className="text-muted-foreground">Non ci sono contenuti che corrispondono ai filtri selezionati.</p>
            </CardContent>
          </Card>
        ) : (
          contenuti.map((contenuto) => (
            <Card key={contenuto.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="text-lg">{getPiattaformaIcon(contenuto.piattaforma)}</span>
                    <Badge variant="outline">{contenuto.piattaforma}</Badge>
                    <Badge variant="outline">{contenuto.fonte}</Badge>
                    <div className={`flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium ${getSentimentColor(contenuto.sentiment)}`}>
                      {getSentimentIcon(contenuto.sentiment)}
                      <span>{contenuto.sentiment}</span>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    {format(new Date(contenuto.dataPost), 'PPp', { locale: it })}
                  </div>
                </div>
                <CardDescription>
                  {contenuto.autore && `Da: ${contenuto.autore}`}
                  <span className="ml-2">Rilevanza: {contenuto.rilevanza}%</span>
                  <span className="ml-2">Score: {contenuto.sentimentScore.toFixed(2)}</span>
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm mb-4 line-clamp-3">{contenuto.testo}</p>
                <div className="flex items-center justify-between">
                  <div className="flex flex-wrap gap-1">
                    {contenuto.keywords.map((keyword, index) => (
                      <Badge key={index} variant="secondary" className="text-xs">
                        {keyword}
                      </Badge>
                    ))}
                  </div>
                  {contenuto.url && (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => window.open(contenuto.url, '_blank')}
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Visualizza
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Paginazione */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center space-x-2 mt-8">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
          >
            Precedente
          </Button>
          <span className="text-sm">
            Pagina {currentPage} di {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
          >
            Successiva
          </Button>
        </div>
      )}
    </div>
  );
}
