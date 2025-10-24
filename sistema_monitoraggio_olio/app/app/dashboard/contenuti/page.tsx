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
import { TrendingUp, TrendingDown, Minus, RefreshCw, Search, Filter, Eye, Pencil, Trash2, Calendar, Tag, ExternalLink } from 'lucide-react';

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
}

interface Stats {
  totale: number;
  positivi: number;
  neutri: number;
  negativi: number;
}

export default function ContenutiMonitoratiPage() {
  const router = useRouter();
  const [contenuti, setContenuti] = useState<Contenuto[]>([]);
  const [filteredContenuti, setFilteredContenuti] = useState<Contenuto[]>([]);
  const [stats, setStats] = useState<Stats>({ totale: 0, positivi: 0, neutri: 0, negativi: 0 });
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [testingAI, setTestingAI] = useState(false);
  
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

  const updateKeywords = async () => {
    try {
      setUpdating(true);
      const response = await fetch('/api/contenuti/update-keywords', {
        method: 'POST'
      });
      
      if (!response.ok) throw new Error('Errore nell\'aggiornamento');
      
      const data = await response.json();
      setLastSync(new Date());
      setNewContentCount(data.updated || 0);
      
      // Ricarica contenuti dopo l'aggiornamento
      await fetchContenuti();
      
      alert(`✅ Aggiornamento completato!\nProcessati: ${data.processed || 0}\nAggiornati: ${data.updated || 0}`);
    } catch (error) {
      console.error('Errore aggiornamento:', error);
      alert('❌ Errore durante l\'aggiornamento keywords');
    } finally {
      setUpdating(false);
    }
  };

  const testAIAnalysis = async () => {
    setTestingAI(true);
    try {
      const response = await fetch('/api/sentiment-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          testo: 'Olio eccellente del Consorzio Roma-Lazio, qualità premium DOP',
          keywords: ['olio', 'Roma', 'Lazio', 'DOP', 'consorzio'],
          compareMode: true
        })
      });

      if (!response.ok) throw new Error('Test fallito');

      const data = await response.json();
      
      alert(`✅ Test AI completato!

📊 ANALISI BASE (Keyword Matching):
Sentiment: ${data.base?.sentiment || 'N/A'}
Score: ${data.base?.score?.toFixed(2) || 'N/A'}
Confidence: ${(data.base?.confidence * 100)?.toFixed(0) || 'N/A'}%

🤖 ANALISI AI (OpenAI GPT-5):
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

  const applyFilters = () => {
    let filtered = [...contenuti];

    // Filtro ricerca testuale
    if (searchTerm) {
      filtered = filtered.filter(c => 
        c.testo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.autore?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filtro sentiment
    if (sentimentFilter !== 'all') {
      filtered = filtered.filter(c => c.sentiment === sentimentFilter);
    }

    // Filtro fonte
    if (fonteFilter !== 'all') {
      filtered = filtered.filter(c => c.fonte === fonteFilter);
    }

    // Filtro data
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

    // Filtro keyword
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
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Contenuti Monitorati</h1>
        <p className="text-gray-600">
          Analisi e monitoraggio dei contenuti online relativi alle parole chiave configurate
        </p>
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

        <div className="flex flex-wrap gap-2 items-center">
          <p className="text-sm text-gray-600">
            Keywords attive: <strong>{activeKeywords.join(', ') || 'Nessuna keyword attiva'}</strong>
          </p>
          {lastSync && (
            <p className="text-sm text-gray-500">
              Ultima sincronizzazione: <strong>{formatDate(lastSync.toISOString())}</strong> • 
              Nuovi contenuti rilevati: <strong>{newContentCount}</strong>
            </p>
          )}
        </div>

        <div className="flex gap-2 mt-4">
          <Button onClick={resetFilters} variant="outline" size="sm">
            Reset Filtri
          </Button>
          <Button 
            onClick={updateKeywords} 
            disabled={updating}
            variant="default"
            size="sm"
          >
            {updating ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Aggiornamento...
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4 mr-2" />
                Aggiorna Keywords
              </>
            )}
          </Button>
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
              <p className="text-sm">Prova a modificare i filtri o aggiornare le keywords</p>
            </div>
          </Card>
        ) : (
          filteredContenuti.map((contenuto) => (
            <Card key={contenuto.id} className="p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3 flex-1">
                  {getSentimentIcon(contenuto.sentiment)}
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline" className={getSentimentColor(contenuto.sentiment)}>
                        {contenuto.sentiment}
                      </Badge>
                      <span className="text-sm text-gray-600">
                        Rilevanza: {contenuto.rilevanza}%
                      </span>
                      <span className="text-sm text-gray-600">
                        Score: {contenuto.sentimentScore.toFixed(2)}
                      </span>
                    </div>
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
                      variant="ghost"
                      size="sm"
                      onClick={() => window.open(contenuto.url, '_blank')}
                    >
                      <ExternalLink className="w-4 h-4" />
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
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
