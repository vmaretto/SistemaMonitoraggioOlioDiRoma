'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Minus, RefreshCw, Search, Filter, Eye, Calendar, Tag, ExternalLink, AlertCircle, CheckCircle, XCircle } from 'lucide-react';

interface Contenuto {
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
  metadata?: {
    aiAnalysis?: {
      confidence?: number;
      reasoning?: string;
    };
    sentimentAnalysis?: {
      base?: {
        sentiment: string;
        score: number;
        confidence: number;
        method: string;
      };
      ai?: {
        sentiment: string;
        score: number;
        confidence: number;
        method: string;
      };
    };
  };
}

interface Stats {
  totale: number;
  positivi: number;
  neutri: number;
  negativi: number;
}

interface ProviderStatus {
  name: string;
  status: 'active' | 'inactive' | 'error';
  lastCheck?: string;
}

export default function ContenutiMonitoratiPage() {
  const router = useRouter();
  const [contenuti, setContenuti] = useState<Contenuto[]>([]);
  const [filteredContenuti, setFilteredContenuti] = useState<Contenuto[]>([]);
  const [stats, setStats] = useState<Stats>({ totale: 0, positivi: 0, neutri: 0, negativi: 0 });
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [testingAI, setTestingAI] = useState(false);
  const [testingProviders, setTestingProviders] = useState(false);
  const [reanalyzing, setReanalyzing] = useState(false);
  const [testAIText, setTestAIText] = useState('');

  // Provider status
  const [providers, setProviders] = useState<ProviderStatus[]>([]);
  
  // Filtri
  const [searchTerm, setSearchTerm] = useState('');
  const [sentimentFilter, setSentimentFilter] = useState<string>('all');
  const [fonteFilter, setFonteFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('all');
  const [keywordFilter, setKeywordFilter] = useState<string>('all');

  // Keywords attive
  const [activeKeywords, setActiveKeywords] = useState<string[]>([]);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [newContentCount, setNewContentCount] = useState<number>(0);

  useEffect(() => {
    fetchContenuti();
    fetchActiveKeywords();
    checkProviders();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [contenuti, searchTerm, sentimentFilter, fonteFilter, dateFilter, keywordFilter]);

  const fetchContenuti = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/contenuti');
      if (!response.ok) throw new Error('Errore nel caricamento');
      
      const data = await response.json();
      setContenuti(data.contenuti || []);
      setStats(data.stats || { totale: 0, positivi: 0, neutri: 0, negativi: 0 });
    } catch (error) {
      console.error('Errore nel fetch contenuti:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchActiveKeywords = async () => {
    try {
      const response = await fetch('/api/keywords?status=active');
      if (!response.ok) throw new Error('Errore nel caricamento keywords');
      
      const data = await response.json();
      setActiveKeywords(data.keywords?.map((k: any) => k.keyword) || []);
    } catch (error) {
      console.error('Errore nel fetch keywords:', error);
    }
  };

  const checkProviders = async () => {
  try {
    const response = await fetch('/api/providers/test');
    if (!response.ok) {
      console.error('Errore nel test providers');
      return;
    }
    
    const data = await response.json();
    console.log('Provider data ricevuto:', data);
    
    // Converte il formato dell'API in array per l'UI
    const providersList: ProviderStatus[] = [];
    
    if (data.providers) {
      // Webz.io
      if (data.providers.webzio !== undefined) {
        providersList.push({
          name: 'Webz.io - Monitoraggio Web',
          status: data.providers.webzio ? 'active' : 'error'
        });
      }
      
      // SerpAPI Google News
      if (data.providers.serpapi_google_news !== undefined) {
        providersList.push({
          name: 'SerpAPI - Google News',
          status: data.providers.serpapi_google_news ? 'active' : 'error'
        });
      }
      
      // SerpAPI Reddit
      if (data.providers.serpapi_reddit !== undefined) {
        providersList.push({
          name: 'SerpAPI - Reddit',
          status: data.providers.serpapi_reddit ? 'active' : 'error'
        });
      }
    }
    
    console.log('Providers processati:', providersList);
    setProviders(providersList);
    
  } catch (error) {
    console.error('Errore nel check providers:', error);
  }
};

  const syncProviders = async () => {
  try {
    setSyncing(true);

    // Salva timestamp PRIMA della sincronizzazione per identificare i nuovi contenuti
    const syncStartTime = new Date();

    // Mostra messaggio iniziale
    const startMessage = "🔄 Avvio sincronizzazione...\n\n" +
      "Sto contattando i provider esterni:\n" +
      "• SerpAPI (Google News)\n" +
      "• SerpAPI (Reddit)\n" +
      "• Webz.io\n\n" +
      "⏳ Questa operazione può richiedere 10-30 secondi.\n" +
      "Attendi senza ricaricare la pagina...";

    // Crea un alert che mostra il progresso (opzionale)
    console.log(startMessage);

    const response = await fetch('/api/providers/sync', {
      method: 'POST'
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Errore nella sincronizzazione');
    }

    const data = await response.json();
    console.log('📊 Risposta sync:', data); // Debug log

    // Usa il timestamp di PRIMA della sincronizzazione per evidenziare i nuovi
    setLastSync(syncStartTime);
    setNewContentCount(data.newContents || 0);
    
    // Ricarica contenuti dopo la sincronizzazione
    await fetchContenuti();
    
    // Messaggio di successo dettagliato
    const successMessage = `✅ Sincronizzazione completata con successo!\n\n` +
      `📊 Risultati:\n` +
      `• Nuovi contenuti trovati: ${data.newContents || 0}\n` +
      `• Provider utilizzati: ${data.providersUsed || 'N/A'}\n` +
      `• Tempo impiegato: ${data.duration || 'N/A'}\n\n` +
      `I contenuti sono stati aggiunti alla lista.`;
    
    alert(successMessage);
    
  } catch (error) {
    console.error('Errore sincronizzazione:', error);
    
    const errorMessage = `❌ Errore durante la sincronizzazione\n\n` +
      `Dettagli: ${error instanceof Error ? error.message : 'Errore sconosciuto'}\n\n` +
      `Possibili cause:\n` +
      `• Chiavi API non configurate o scadute\n` +
      `• Problemi di connessione\n` +
      `• Quota API esaurita\n\n` +
      `Prova a cliccare "Test Provider" per verificare lo stato delle API.`;
    
    alert(errorMessage);
  } finally {
    setSyncing(false);
  }
};

  const updateKeywords = async () => {
    try {
      setUpdating(true);
      const response = await fetch('/api/contenuti/update-keywords', {
        method: 'POST'
      });
      
      if (!response.ok) throw new Error('Errore nell\'aggiornamento');
      
      const data = await response.json();
      
      // Ricarica contenuti dopo l'aggiornamento
      await fetchContenuti();
      
      alert(`✅ Keywords aggiornate!\nProcessati: ${data.processed || 0}\nAggiornati: ${data.updated || 0}`);
    } catch (error) {
      console.error('Errore aggiornamento:', error);
      alert('❌ Errore durante l\'aggiornamento keywords');
    } finally {
      setUpdating(false);
    }
  };

  const testProviders = async () => {
    try {
      setTestingProviders(true);
      await checkProviders();
      alert('✅ Test providers completato! Controlla lo stato nella sezione "Multi-Provider"');
    } catch (error) {
      alert('❌ Errore durante il test providers');
    } finally {
      setTestingProviders(false);
    }
  };

  const testAIAnalysis = async () => {
    const testoDefault = 'Olio eccellente del Consorzio Roma-Lazio, qualità premium DOP';
    const testoAnalisi = testAIText.trim() || testoDefault;

    setTestingAI(true);
    try {
      const response = await fetch('/api/sentiment-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          testo: testoAnalisi,
          keywords: ['olio', 'Roma', 'Lazio', 'DOP', 'consorzio'],
          compareMode: true
        })
      });

      if (!response.ok) throw new Error('Test fallito');

      const data = await response.json();

      alert(`✅ Test AI completato!

📝 TESTO ANALIZZATO:
"${testoAnalisi.substring(0, 100)}${testoAnalisi.length > 100 ? '...' : ''}"

📊 ANALISI BASE (Keyword Matching):
Sentiment: ${data.base?.sentiment || 'N/A'}
Score: ${data.base?.score?.toFixed(2) || 'N/A'}
Confidence: ${(data.base?.confidence * 100)?.toFixed(0) || 'N/A'}%

🤖 ANALISI AI (OpenAI GPT-4-turbo):
Sentiment: ${data.ai?.sentiment || 'N/A'}
Score: ${data.ai?.score?.toFixed(2) || 'N/A'}
Confidence: ${(data.ai?.confidence * 100)?.toFixed(0) || 'N/A'}%

🎯 Concordanza: ${data.agreement}%
📝 ${data.recommendation}
      `);
    } catch (error) {
      alert(`❌ Errore: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setTestingAI(false);
    }
  };

  const reanalyzeWithAI = async () => {
    try {
      setReanalyzing(true);
      const response = await fetch('/api/contenuti/reanalyze-ai', {
        method: 'POST'
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Errore nella ri-analisi');
      }

      const data = await response.json();

      // Ricarica contenuti dopo la ri-analisi
      await fetchContenuti();

      const message = `✅ Ri-analisi AI completata!\n\n` +
        `📊 Risultati:\n` +
        `• Totale contenuti: ${data.total}\n` +
        `• Analizzati con AI: ${data.analyzed}\n` +
        `• Già analizzati: ${data.skipped}\n` +
        `• Errori: ${data.errors}\n` +
        `• Rimanenti: ${data.remaining}\n` +
        `• Tempo: ${data.duration}\n\n` +
        (data.remaining > 0 ? '⚠️ Premi di nuovo per analizzare i rimanenti.' : '✅ Tutti i contenuti sono stati analizzati!');

      alert(message);
    } catch (error) {
      console.error('Errore ri-analisi AI:', error);
      alert(`❌ Errore durante la ri-analisi AI\n\n${error instanceof Error ? error.message : 'Errore sconosciuto'}`);
    } finally {
      setReanalyzing(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...contenuti];

    if (searchTerm) {
      filtered = filtered.filter(c => 
        c.testo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.autore?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (sentimentFilter !== 'all') {
      filtered = filtered.filter(c => c.sentiment === sentimentFilter);
    }

    if (fonteFilter !== 'all') {
      filtered = filtered.filter(c => c.fonte === fonteFilter);
    }

    if (dateFilter !== 'all') {
      const now = new Date();
      filtered = filtered.filter(c => {
        const contentDate = new Date(c.dataPost);
        const diffDays = Math.floor((now.getTime() - contentDate.getTime()) / (1000 * 60 * 60 * 24));
        
        switch (dateFilter) {
          case 'today': return diffDays === 0;
          case 'week': return diffDays <= 7;
          case 'month': return diffDays <= 30;
          default: return true;
        }
      });
    }

    if (keywordFilter !== 'all') {
      filtered = filtered.filter(c => c.keywords.includes(keywordFilter));
    }

    setFilteredContenuti(filtered);
  };

  const resetFilters = () => {
    setSearchTerm('');
    setSentimentFilter('all');
    setFonteFilter('all');
    setDateFilter('all');
    setKeywordFilter('all');
  };

  const getSentimentIcon = (sentiment: string) => {
    switch (sentiment.toLowerCase()) {
      case 'positivo': return <TrendingUp className="w-4 h-4 text-green-600" />;
      case 'negativo': return <TrendingDown className="w-4 h-4 text-red-600" />;
      default: return <Minus className="w-4 h-4 text-gray-400" />;
    }
  };

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment.toLowerCase()) {
      case 'positivo': return 'bg-green-100 text-green-800 border-green-300';
      case 'negativo': return 'bg-red-100 text-red-800 border-red-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getProviderIcon = (status: string) => {
    switch (status) {
      case 'active': return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'error': return <XCircle className="w-4 h-4 text-red-600" />;
      default: return <AlertCircle className="w-4 h-4 text-gray-400" />;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('it-IT', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  const uniqueFonti = Array.from(new Set(contenuti.map(c => c.fonte)));
  const uniqueKeywords = Array.from(new Set(contenuti.flatMap(c => c.keywords)));

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <RefreshCw className="w-12 h-12 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Caricamento contenuti...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Contenuti Monitorati</h1>
          <p className="text-gray-600">
            Analisi e monitoraggio dei contenuti online relativi alle parole chiave configurate
          </p>
        </div>
        <Button variant="outline" onClick={() => router.push('/dashboard')}>
          ← Torna alla Dashboard
        </Button>
      </div>

      {/* Filtri e Ricerca */}
      <Card className="p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <Filter className="w-5 h-5" />
          Filtri e Ricerca
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Cerca nei contenuti..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          <Select value={sentimentFilter} onValueChange={setSentimentFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Tutti i sentiment" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tutti i sentiment</SelectItem>
              <SelectItem value="positivo">Positivo</SelectItem>
              <SelectItem value="neutrale">Neutrale</SelectItem>
              <SelectItem value="negativo">Negativo</SelectItem>
            </SelectContent>
          </Select>

          <Select value={fonteFilter} onValueChange={setFonteFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Tutte le fonti" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tutte le fonti</SelectItem>
              {uniqueFonti.map(fonte => (
                <SelectItem key={fonte} value={fonte}>{fonte}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={dateFilter} onValueChange={setDateFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Tutti i dati" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tutti i dati</SelectItem>
              <SelectItem value="today">Oggi</SelectItem>
              <SelectItem value="week">Ultima settimana</SelectItem>
              <SelectItem value="month">Ultimo mese</SelectItem>
            </SelectContent>
          </Select>

          <Select value={keywordFilter} onValueChange={setKeywordFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Tutte le keywords" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tutte le keywords</SelectItem>
              {uniqueKeywords.map(keyword => (
                <SelectItem key={keyword} value={keyword}>{keyword}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="mb-4">
          <p className="text-sm text-gray-600 mb-2">
            Keywords attive: <strong>{activeKeywords.join(', ') || 'Nessuna keyword attiva'}</strong>
          </p>
          {lastSync && (
            <p className="text-sm text-gray-500">
              Ultima sincronizzazione: <strong>{formatDate(lastSync.toISOString())}</strong> • 
              Nuovi contenuti rilevati: <strong>{newContentCount}</strong>
            </p>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          <Button onClick={resetFilters} variant="outline" size="sm">
            Reset Filtri
          </Button>
          <Button 
  onClick={syncProviders} 
  disabled={syncing}
  variant="default"
  size="sm"
  className={syncing ? "animate-pulse" : ""}
>
  {syncing ? (
    <>
      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
      Sincronizzando... (10-30s)
    </>
  ) : (
    <>
      <RefreshCw className="w-4 h-4 mr-2" />
      Sincronizza Provider
    </>
  )}
</Button>
          <Button 
            onClick={updateKeywords} 
            disabled={updating}
            variant="secondary"
            size="sm"
          >
            {updating ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Aggiornando...
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4 mr-2" />
                Aggiorna Keywords
              </>
            )}
          </Button>
          <Button
            onClick={testProviders}
            disabled={testingProviders}
            variant="outline"
            size="sm"
          >
            {testingProviders ? '⏳ Testing...' : '🔧 Test Provider'}
          </Button>
          <Button
            onClick={reanalyzeWithAI}
            disabled={reanalyzing}
            variant="outline"
            size="sm"
            className="bg-purple-50 hover:bg-purple-100 border-purple-300 text-purple-700"
          >
            {reanalyzing ? '⏳ Ri-analizzando...' : '🧠 Ri-analizza con AI'}
          </Button>
        </div>

        {/* Test AI con input personalizzato */}
        <div className="flex gap-2 mt-3 items-center">
          <Input
            placeholder="Inserisci testo da analizzare (es: Sequestro olio contraffatto in Lazio)"
            value={testAIText}
            onChange={(e) => setTestAIText(e.target.value)}
            className="flex-1"
          />
          <Button
            onClick={testAIAnalysis}
            disabled={testingAI}
            variant="outline"
            size="sm"
          >
            {testingAI ? '⏳ Testing...' : '🤖 Test AI'}
          </Button>
        </div>
      </Card>

      {/* Provider Attivi */}
      {providers.filter(p => p.status === 'active').length > 0 && (
        <Card className="p-6 mb-6 bg-green-50 border-green-200">
          <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-600" />
            Provider Attivi
          </h3>
          <div className="text-sm">
            <div className="flex flex-wrap gap-2">
              {providers.filter(p => p.status === 'active').map((provider, index) => (
                <Badge
                  key={index}
                  variant="outline"
                  className="bg-green-100 text-green-800 border-green-300"
                >
                  {getProviderIcon(provider.status)}
                  <span className="ml-1">{provider.name}</span>
                </Badge>
              ))}
            </div>
          </div>
        </Card>
      )}

      {/* Statistiche */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Positivi</p>
              <p className="text-3xl font-bold text-green-600">{stats.positivi}</p>
            </div>
            <TrendingUp className="w-8 h-8 text-green-600" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Neutri</p>
              <p className="text-3xl font-bold text-gray-600">{stats.neutri}</p>
            </div>
            <Minus className="w-8 h-8 text-gray-600" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Negativi</p>
              <p className="text-3xl font-bold text-red-600">{stats.negativi}</p>
            </div>
            <TrendingDown className="w-8 h-8 text-red-600" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Totali</p>
              <p className="text-3xl font-bold text-blue-600">{stats.totale}</p>
            </div>
            <Eye className="w-8 h-8 text-blue-600" />
          </div>
        </Card>
      </div>

      {/* Lista Contenuti */}
      <div className="space-y-4">
        {filteredContenuti.length === 0 ? (
          <Card className="p-12">
            <div className="text-center text-gray-500">
              <Search className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <p className="text-lg font-medium mb-2">Nessun contenuto trovato</p>
              <p className="text-sm">Prova a modificare i filtri o sincronizzare i provider</p>
            </div>
          </Card>
        ) : (
          filteredContenuti.map((contenuto) => {
            // Determina se il contenuto è "nuovo" (creato dopo l'ultima sincronizzazione)
            const isNew = lastSync && new Date(contenuto.createdAt) >= lastSync;

            return (
            <Card
              key={contenuto.id}
              className={`p-6 hover:shadow-lg transition-shadow ${
                isNew ? 'ring-2 ring-blue-500 bg-blue-50' : ''
              }`}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3 flex-1">
                  {getSentimentIcon(contenuto.sentiment)}
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <Badge variant="outline" className={getSentimentColor(contenuto.sentiment)}>
                        {contenuto.sentiment}
                      </Badge>
                    </div>
                    
                    {/* DOPPIA ANALISI SENTIMENT */}
                    {contenuto.metadata?.sentimentAnalysis && (
                      <div className="grid grid-cols-2 gap-4 p-3 bg-gray-50 rounded-lg mb-2">
                        {/* Analisi Base */}
                        {contenuto.metadata.sentimentAnalysis.base && (
                          <div className="border-r pr-3">
                            <p className="text-xs font-semibold text-gray-500 mb-1">📊 ANALISI BASE</p>
                            <div className="space-y-1">
                              <p className="text-sm">
                                Sentiment: <Badge variant="outline" className={getSentimentColor(contenuto.metadata.sentimentAnalysis.base.sentiment)}>
                                  {contenuto.metadata.sentimentAnalysis.base.sentiment}
                                </Badge>
                              </p>
                              <p className="text-xs text-gray-600">
                                Score: {contenuto.metadata.sentimentAnalysis.base.score.toFixed(2)}
                              </p>
                              <p className="text-xs text-gray-600">
                                Confidence: {(contenuto.metadata.sentimentAnalysis.base.confidence * 100).toFixed(0)}%
                              </p>
                            </div>
                          </div>
                        )}
                        
                        {/* Analisi AI */}
                        {contenuto.metadata.sentimentAnalysis.ai && (
                          <div className="pl-3">
                            <p className="text-xs font-semibold text-gray-500 mb-1">🤖 ANALISI AI</p>
                            <div className="space-y-1">
                              <p className="text-sm">
                                Sentiment: <Badge variant="outline" className={getSentimentColor(contenuto.metadata.sentimentAnalysis.ai.sentiment)}>
                                  {contenuto.metadata.sentimentAnalysis.ai.sentiment}
                                </Badge>
                              </p>
                              <p className="text-xs text-gray-600">
                                Score: {contenuto.metadata.sentimentAnalysis.ai.score.toFixed(2)}
                              </p>
                              <p className="text-xs text-gray-600">
                                Confidence: {(contenuto.metadata.sentimentAnalysis.ai.confidence * 100).toFixed(0)}%
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                    
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <span className="font-medium">{contenuto.fonte}</span>
                      <span>•</span>
                      <span>{contenuto.piattaforma}</span>
                      {contenuto.autore && (
                        <>
                          <span>•</span>
                          <span>{contenuto.autore}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  {contenuto.url && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(contenuto.url, '_blank')}
                      className="text-blue-600 hover:text-blue-800 hover:bg-blue-50"
                    >
                      <ExternalLink className="w-4 h-4 mr-1" />
                      Leggi articolo
                    </Button>
                  )}
                </div>
              </div>

              <p className="text-gray-700 mb-4 line-clamp-3">{contenuto.testo}</p>

              <div className="flex items-center justify-between pt-4 border-t">
                <div className="flex flex-wrap gap-2">
                  {contenuto.keywords.map((keyword, index) => (
                    <Badge key={index} variant="secondary" className="text-xs">
                      <Tag className="w-3 h-3 mr-1" />
                      {keyword}
                    </Badge>
                  ))}
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Calendar className="w-4 h-4" />
                  <span>Pubblicato: {formatDate(contenuto.dataPost)}</span>
                </div>
              </div>

              <div className="text-xs text-gray-400 mt-2">
                Rilevato il: {formatDate(contenuto.createdAt)}
                {isNew && (
                  <span className="ml-2 text-blue-600 font-semibold">• NUOVO</span>
                )}
              </div>
            </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
