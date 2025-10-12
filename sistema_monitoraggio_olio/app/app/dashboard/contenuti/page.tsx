

'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TrendingUp, TrendingDown, Minus, Search, Calendar, CalendarClock, ExternalLink, Image as ImageIcon, Shield } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';

interface ContenutoMonitorato {
  id: string;
  fonte: string;
  piattaforma: string;
  testo: string;
  url?: string;
  imageUrl?: string;
  autore?: string;
  sentiment: string;
  sentimentScore: number;
  keywords: string[];
  dataPost: string;
  rilevanza: number;
  createdAt: string;
}

interface StoredSyncMetadata {
  highlightedIds: string[];
  syncAt?: string;
  newCount?: number;
}

const LAST_SYNC_STORAGE_KEY = 'contenuti-monitorati:last-sync';

interface IngestionApiResponse {
  success: boolean;
  message: string;
  error?: string;
  data?: {
    newItems?: number;
    savedItemIds?: string[];
    [key: string]: any;
  };
}

export default function ContenutiPage() {
  const [contenuti, setContenuti] = useState<ContenutoMonitorato[]>([]);
  const [activeKeywords, setActiveKeywords] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSentiment, setFilterSentiment] = useState('all');
  const [filterFonte, setFilterFonte] = useState('all');
  const [filterKeyword, setFilterKeyword] = useState('all');
  const [filterDataType, setFilterDataType] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [providerStats, setProviderStats] = useState<any>(null);
  const [syncLoading, setSyncLoading] = useState(false);
  const [aiTestLoading, setAiTestLoading] = useState(false);
  const [aiStatus, setAiStatus] = useState<string>('unknown');
  const [highlightedIds, setHighlightedIds] = useState<string[]>([]);
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(null);
  const [lastSyncNewCount, setLastSyncNewCount] = useState<number | null>(null);
  const [verifyingContentId, setVerifyingContentId] = useState<string | null>(null);
  const router = useRouter();

  const itemsPerPage = 10;

  const providerLabels: Record<string, string> = {
    webzio: 'Webz.io – Monitoraggio Web',
    serpapi_google_news: 'SerpAPI – Google News',
    serpapi_reddit: 'SerpAPI – Reddit'
  };

  useEffect(() => {
    fetchContenuti();
    fetchProviderStats();
    checkAiStatus();
  }, [currentPage, filterSentiment, filterFonte, filterKeyword, filterDataType, searchTerm]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    try {
      const stored = window.localStorage.getItem(LAST_SYNC_STORAGE_KEY);
      if (!stored) {
        return;
      }

      const parsed: StoredSyncMetadata = JSON.parse(stored);
      setHighlightedIds(parsed.highlightedIds || []);
      if (parsed.syncAt) {
        setLastSyncAt(parsed.syncAt);
      }
      if (typeof parsed.newCount === 'number') {
        setLastSyncNewCount(parsed.newCount);
      }
    } catch (error) {
      console.error('Errore lettura stato evidenziazione:', error);
    }
  }, []);

  const fetchContenuti = async (pageOverride?: number) => {
    try {
      setLoading(true);
      const pageToFetch = pageOverride ?? currentPage;
      const params = new URLSearchParams({
        page: pageToFetch.toString(),
        limit: itemsPerPage.toString(),
        ...(searchTerm && { search: searchTerm }),
        ...(filterSentiment !== 'all' && { sentiment: filterSentiment }),
        ...(filterFonte !== 'all' && { fonte: filterFonte }),
        ...(filterKeyword !== 'all' && { keyword: filterKeyword }),
        ...(filterDataType !== 'all' && { dataType: filterDataType })
      });

      const response = await fetch(`/api/contenuti?${params}`);
      const data = await response.json();
      const contenutiOrdinati: ContenutoMonitorato[] = (data.contenuti || []).slice().sort((a: ContenutoMonitorato, b: ContenutoMonitorato) => {
        const createdA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const createdB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return createdB - createdA;
      });

      setContenuti(contenutiOrdinati);
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
          options: { maxItemsPerProvider: 20 }
        })
      });
      const result: IngestionApiResponse = await response.json();

      if (response.ok && result.success) {
        const newItemIds: string[] = result.data?.savedItemIds ?? [];
        const newItemsCount: number | null = typeof result.data?.newItems === 'number'
          ? result.data.newItems
          : null;

        if (currentPage !== 1) {
          setCurrentPage(1);
        }

        await fetchContenuti(1);
        await fetchProviderStats();

        const syncTimestamp = new Date().toISOString();
        const computedNewCount = newItemsCount ?? (newItemIds.length > 0 ? newItemIds.length : 0);
        const metadata: StoredSyncMetadata = {
          highlightedIds: newItemIds,
          syncAt: syncTimestamp,
          newCount: computedNewCount,
        };

        setHighlightedIds(newItemIds);
        setLastSyncAt(syncTimestamp);
        setLastSyncNewCount(computedNewCount);

        if (typeof window !== 'undefined') {
          window.localStorage.setItem(LAST_SYNC_STORAGE_KEY, JSON.stringify(metadata));
        }
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

  const handleVerifyLabel = async (contenutoId: string, imageUrl: string) => {
    setVerifyingContentId(contenutoId);
    
    try {
      // Naviga alla pagina verifiche con parametri
      router.push(`/dashboard/verifiche?verifyFromContent=${contenutoId}&imageUrl=${encodeURIComponent(imageUrl)}`);
    } catch (error) {
      console.error('Errore avvio verifica:', error);
      alert('❌ Errore durante l\'avvio della verifica');
      setVerifyingContentId(null);
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

  const getPlatformDisplay = (piattaforma: string) => {
    if (!piattaforma) {
      return {
        name: 'Sconosciuta',
        type: 'demo' as const,
        icon: '🌐',
        color: 'bg-gray-100 text-gray-800'
      };
    }
    
    // Semplificata per evitare errori di idratazione
    if (piattaforma.includes('_real')) {
      const baseName = piattaforma.replace('_real', '');
      return {
        name: baseName === 'google_news' ? 'Google News' : baseName === 'reddit' ? 'Reddit' : baseName,
        type: 'real' as const,
        icon: '✅',
        color: 'bg-green-100 text-green-800'
      };
    }
    
    // Tutto il resto è demo
    const demoNames: Record<string, string> = {
      'webzio': 'Webz.io Demo',
      'webzio_demo': 'Webz.io Demo',
      'google_news': 'Google News Demo', 
      'reddit': 'Reddit Demo',
      'multi_provider': 'Multi-Provider Demo',
      'multiprovider': 'Multi-Provider Demo'
    };
    
    return {
      name: demoNames[piattaforma] || `${piattaforma} Demo`,
      type: 'demo' as const,
      icon: '⚠️',
      color: 'bg-orange-100 text-orange-800'
    };
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
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4 mb-4">
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
                <SelectValue placeholder="Sentiment" />
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
                <SelectValue placeholder="Fonte" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tutte le fonti</SelectItem>
                <SelectItem value="social">Social Media</SelectItem>
                <SelectItem value="blog">Blog</SelectItem>
                <SelectItem value="ecommerce">E-commerce</SelectItem>
                <SelectItem value="news">News</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterDataType} onValueChange={setFilterDataType}>
              <SelectTrigger>
                <SelectValue placeholder="Tipo Dati" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tutti i dati</SelectItem>
                <SelectItem value="real">✅ Dati Reali</SelectItem>
                <SelectItem value="demo">⚠️ Dati Demo</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterKeyword} onValueChange={setFilterKeyword}>
              <SelectTrigger>
                <SelectValue placeholder="Keywords" />
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
                setFilterDataType('all');
                setCurrentPage(1);
              }}
              variant="outline"
            >
              Reset Filtri
            </Button>
          </div>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">
                {activeKeywords.length > 0 ? (
                  <>Keywords attive: <strong>{activeKeywords.join(', ')}</strong></>
                ) : (
                  'Nessuna keyword attiva configurata'
                )}
              </p>
              {lastSyncAt && (
                <p className="text-xs text-muted-foreground">
                  Ultima sincronizzazione:{' '}
                  <span className="font-medium text-foreground">
                    {format(new Date(lastSyncAt), 'PPpp', { locale: it })}
                  </span>
                  {typeof lastSyncNewCount === 'number' && (
                    <span className="ml-2">
                      • Nuovi contenuti rilevati: <strong>{lastSyncNewCount}</strong>
                    </span>
                  )}
                </p>
              )}
            </div>
            <div className="flex flex-wrap gap-2 md:justify-end">
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
                  <div className="text-right text-xs text-muted-foreground space-y-1">
                    <p>
                      Webzio: <strong>{providerStats.providers.webzio ? '✅' : '❌'}</strong>
                    </p>
                    <p>
                      SerpApi: <strong>{
                        (providerStats.providers.serpapi_google_news && providerStats.providers.serpapi_reddit) ? '✅ (2/2)' :
                        (providerStats.providers.serpapi_google_news || providerStats.providers.serpapi_reddit) ? '⚡ (1/2)' :
                        '❌ (0/2)'
                      }</strong>
                    </p>
                  </div>
                )}
              </div>
              {providerStats.providers && (
                <div className="mt-4 rounded-md border border-dashed border-green-200 bg-white/50 p-3">
                  <p className="text-xs font-semibold text-green-800">
                    Provider funzionanti: {Object.values(providerStats.providers).filter(Boolean).length}/{Object.keys(providerStats.providers).length}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {Object.entries(providerStats.providers).map(([code, isWorking]) => (
                      <span
                        key={code}
                        className={`inline-flex items-center rounded-full px-2 py-1 text-[11px] font-medium ${
                          isWorking ? 'bg-green-100 text-green-800 border border-green-200' : 'bg-red-100 text-red-800 border border-red-200'
                        }`}
                      >
                        {isWorking ? '✅' : '❌'} {providerLabels[code as keyof typeof providerLabels] || code}
                      </span>
                    ))}
                  </div>
                </div>
              )}
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
          contenuti.map((contenuto) => {
            try {
              const platformInfo = getPlatformDisplay(contenuto.piattaforma || '');
              const isHighlighted = highlightedIds.includes(contenuto.id);
              const publicationDate = contenuto.dataPost
                ? format(new Date(contenuto.dataPost), 'PPp', { locale: it })
                : 'Data non disponibile';
              const syncDate = contenuto.createdAt
                ? format(new Date(contenuto.createdAt), 'PPp', { locale: it })
                : 'Data sincronizzazione non disponibile';
              return (
                <Card
                  key={contenuto.id}
                  className={`relative transition-all ${isHighlighted ? 'border-blue-400 bg-blue-50/60 shadow-md' : ''}`}
                >
                  <CardHeader className="relative">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-2 flex-wrap">
                        <span className="text-lg">{platformInfo.icon}</span>
                        <Badge className={platformInfo.color}>
                          {platformInfo.name}
                        </Badge>
                        <Badge variant="outline">{contenuto.fonte || 'N/A'}</Badge>
                        {contenuto.imageUrl && (
                          <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                            <ImageIcon className="h-3 w-3 mr-1" />
                            Contiene Immagine
                          </Badge>
                        )}
                        {(contenuto as any).verifiche && (contenuto as any).verifiche.length > 0 && (() => {
                          const verifica = (contenuto as any).verifiche[0];
                          const risultato = verifica.risultatoMatching;
                          
                          if (risultato === 'conforme') {
                            return (
                              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Conforme
                              </Badge>
                            );
                          } else if (risultato === 'non_conforme') {
                            return (
                              <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                                <XCircle className="h-3 w-3 mr-1" />
                                Non Conforme
                              </Badge>
                            );
                          } else if (risultato === 'sospetta') {
                            return (
                              <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
                                <AlertTriangle className="h-3 w-3 mr-1" />
                                Sospetta
                              </Badge>
                            );
                          }
                          return null;
                        })()}
                        <div className={`flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium ${getSentimentColor(contenuto.sentiment)}`}>
                          {getSentimentIcon(contenuto.sentiment)}
                          <span>{contenuto.sentiment}</span>
                        </div>
                      </div>
                      <div className="flex flex-col items-end space-y-1 text-xs md:text-sm text-muted-foreground">
                        <div className="flex items-center space-x-2">
                          <Calendar className="h-4 w-4" />
                          <span>Pubblicato: {publicationDate}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <CalendarClock className="h-4 w-4" />
                          <span>Rilevato: {syncDate}</span>
                        </div>
                      </div>
                    </div>
                    {isHighlighted && (
                      <Badge className="absolute top-4 right-4 bg-blue-600 text-white">
                        Nuovo
                      </Badge>
                    )}
                    <CardDescription>
                      {contenuto.autore && `Da: ${contenuto.autore}`}
                      <span className="ml-2">Rilevanza: {contenuto.rilevanza}%</span>
                      <span className="ml-2">Score: {contenuto.sentimentScore.toFixed(2)}</span>
                    </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm mb-4 line-clamp-3">{contenuto.testo || 'Contenuto non disponibile'}</p>
                <div className="flex items-center justify-between">
                  <div className="flex flex-wrap gap-1">
                    {(contenuto.keywords || []).map((keyword, index) => (
                      <Badge key={index} variant="secondary" className="text-xs">
                        {keyword}
                      </Badge>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    {contenuto.imageUrl && (
                      <Button 
                        variant="default"
                        className="bg-purple-600 hover:bg-purple-700"
                        size="sm" 
                        onClick={() => handleVerifyLabel(contenuto.id, contenuto.imageUrl!)}
                        disabled={verifyingContentId === contenuto.id}
                      >
                        <Shield className="h-4 w-4 mr-2" />
                        {verifyingContentId === contenuto.id ? 'Avvio...' : 'Verifica Etichetta'}
                      </Button>
                    )}
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
                </div>
              </CardContent>
            </Card>
              );
            } catch (error) {
              console.error('Errore rendering contenuto:', error);
              return (
                <Card key={contenuto.id}>
                  <CardContent className="p-4">
                    <p className="text-sm text-muted-foreground">Errore nel caricamento del contenuto</p>
                  </CardContent>
                </Card>
              );
            }
          })
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
