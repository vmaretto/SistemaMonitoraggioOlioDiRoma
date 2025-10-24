'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Upload, ChevronLeft, Database, FileImage } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import UploadEtichettaModal from '@/components/dashboard/upload-etichetta-modal';
import DetailEtichettaModal from '@/components/dashboard/detail-etichetta-modal';

interface Etichetta {
  id: string;
  nome: string;
  descrizione?: string;
  denominazione: string;
  categoria: string;
  produttore?: string;
  comune?: string;
  regioneProduzione: string;
  tipoEtichetta: string;
  imageFronteUrl?: string;
  imageRetroUrl?: string;
  imageUrl?: string;
  isAttiva: boolean;
  createdAt: string;
  _count?: {
    verifiche: number;
  };
}

export default function RepositoryEtichetteUfficialiPage() {
  const router = useRouter();
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedEtichetta, setSelectedEtichetta] = useState<Etichetta | null>(null);
  const [etichette, setEtichette] = useState<Etichetta[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filtroCategoria, setFiltroCategoria] = useState('all');
  const [filtroDenominazione, setFiltroDenominazione] = useState('all');

  // Carica etichette dal backend
  const fetchEtichette = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (filtroCategoria !== 'all') params.append('categoria', filtroCategoria);
      if (filtroDenominazione !== 'all') params.append('denominazione', filtroDenominazione);
      if (searchQuery) params.append('search', searchQuery);

      const response = await fetch(`/api/etichette?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error('Errore nel caricamento delle etichette');
      }

      const data = await response.json();
      setEtichette(data.etichette || []);
    } catch (error) {
      console.error('Errore fetch etichette:', error);
      toast.error('Impossibile caricare le etichette');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchEtichette();
  }, [filtroCategoria, filtroDenominazione]);

  // Effettua ricerca quando l'utente smette di digitare
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery !== undefined) {
        fetchEtichette();
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleResetFiltri = () => {
    setSearchQuery('');
    setFiltroCategoria('all');
    setFiltroDenominazione('all');
  };

  const handleUploadSuccess = () => {
    fetchEtichette();
    toast.success('Etichetta caricata con successo!');
  };

  const handleDetailSuccess = () => {
    fetchEtichette();
    setIsDetailModalOpen(false);
    setSelectedEtichetta(null);
  };

  const handleEtichettaClick = (etichetta: Etichetta) => {
    console.log('Click su etichetta:', etichetta.id);
    setSelectedEtichetta(etichetta);
    setIsDetailModalOpen(true);
  };

  // Conteggi per categoria
  const conteggi = {
    DOP: etichette.filter((e) => e.categoria === 'DOP').length,
    IGP: etichette.filter((e) => e.categoria === 'IGP').length,
    Biologici: etichette.filter((e) => e.categoria === 'Biologici').length,
    Totali: etichette.length,
  };

  // Estrai denominazioni uniche per il filtro
  const denominazioniUniche = Array.from(
    new Set(etichette.map((e) => e.denominazione))
  ).sort();

  const getCategoriaColor = (categoria: string) => {
    switch (categoria) {
      case 'DOP':
        return 'bg-yellow-100 text-yellow-700 border-yellow-300';
      case 'IGP':
        return 'bg-blue-100 text-blue-700 border-blue-300';
      case 'Biologici':
        return 'bg-green-100 text-green-700 border-green-300';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-300';
    }
  };

  return (
    <div className="flex-1 space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Repository Etichette Ufficiali
          </h1>
          <p className="text-gray-600 mt-1">
            Archivio delle etichette certificate per il monitoraggio delle conformità
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button onClick={() => setIsUploadModalOpen(true)} className="gap-2">
            <Upload size={18} />
            Carica Nuova Etichetta
          </Button>
          <Button
            variant="outline"
            onClick={() => router.push('/dashboard')}
            className="gap-2"
          >
            <ChevronLeft size={18} />
            Torna alla Dashboard
          </Button>
        </div>
      </div>

      {/* Filtri e Ricerca */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Search */}
            <div className="md:col-span-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <Input
                  type="text"
                  placeholder="Cerca etichette per nome, produttore, comune..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Filtro Denominazione */}
            <div>
              <Select value={filtroDenominazione} onValueChange={setFiltroDenominazione}>
                <SelectTrigger>
                  <SelectValue placeholder="Tutte le denominazioni" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tutte le denominazioni</SelectItem>
                  {denominazioniUniche.map((denom) => (
                    <SelectItem key={denom} value={denom}>
                      {denom}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Filtro Categoria + Reset */}
            <div className="flex items-center gap-2">
              <Select value={filtroCategoria} onValueChange={setFiltroCategoria}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Tutte le categorie" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tutte le categorie</SelectItem>
                  <SelectItem value="DOP">DOP</SelectItem>
                  <SelectItem value="IGP">IGP</SelectItem>
                  <SelectItem value="Biologici">Biologici</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="ghost"
                onClick={handleResetFiltri}
                className="whitespace-nowrap"
              >
                Reset
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Cards Conteggio */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                <span className="text-2xl">🏷️</span>
              </div>
              <div>
                <p className="text-sm text-gray-600">DOP</p>
                <p className="text-3xl font-bold text-gray-900">{conteggi.DOP}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <span className="text-2xl">🛡️</span>
              </div>
              <div>
                <p className="text-sm text-gray-600">IGP</p>
                <p className="text-3xl font-bold text-gray-900">{conteggi.IGP}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <span className="text-2xl">🌱</span>
              </div>
              <div>
                <p className="text-sm text-gray-600">Biologici</p>
                <p className="text-3xl font-bold text-gray-900">{conteggi.Biologici}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <Database className="text-purple-600" size={24} />
              </div>
              <div>
                <p className="text-sm text-gray-600">Totali</p>
                <p className="text-3xl font-bold text-gray-900">{conteggi.Totali}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Lista Etichette */}
      <Card>
        <CardContent className="pt-6">
          {isLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin mx-auto mb-4 h-12 w-12 border-4 border-blue-500 border-t-transparent rounded-full"></div>
              <p className="text-gray-600">Caricamento etichette...</p>
            </div>
          ) : etichette.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-24 h-24 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                <FileImage className="text-gray-400" size={40} />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Nessuna etichetta trovata
              </h3>
              <p className="text-gray-600 mb-6">
                Non ci sono etichette che corrispondono ai filtri selezionati.
              </p>
              <Button onClick={() => setIsUploadModalOpen(true)} className="gap-2">
                <Upload size={20} />
                Carica la prima etichetta ufficiale
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {etichette.map((etichetta) => (
                <Card
                  key={etichetta.id}
                  className="hover:shadow-lg transition-all cursor-pointer"
                  onClick={() => handleEtichettaClick(etichetta)}
                >
                  <CardContent className="p-4">
                    {/* Immagine */}
                    <div className="aspect-video bg-gray-100 rounded-lg mb-3 overflow-hidden">
                      {(etichetta.imageFronteUrl || etichetta.imageUrl) ? (
                        <img
                          src={etichetta.imageFronteUrl || etichetta.imageUrl}
                          alt={etichetta.nome}
                          className="w-full h-full object-contain"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <FileImage className="text-gray-400" size={40} />
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="space-y-2">
                      {/* Badge categoria e stato */}
                      <div className="flex items-center justify-between">
                        <Badge className={getCategoriaColor(etichetta.categoria)}>
                          {etichetta.categoria}
                        </Badge>
                        {etichetta.isAttiva ? (
                          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300">
                            ✓ Attiva
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-gray-50 text-gray-500">
                            Inattiva
                          </Badge>
                        )}
                      </div>

                      {/* Nome */}
                      <h4 className="font-semibold text-gray-900 line-clamp-2">
                        {etichetta.nome}
                      </h4>

                      {/* Denominazione */}
                      <p className="text-sm text-blue-600 font-medium">
                        {etichetta.denominazione}
                      </p>

                      {/* Produttore */}
                      {etichetta.produttore && (
                        <p className="text-sm text-gray-600 line-clamp-1">
                          {etichetta.produttore}
                        </p>
                      )}

                      {/* Location */}
                      {(etichetta.comune || etichetta.regioneProduzione) && (
                        <p className="text-xs text-gray-500">
                          📍 {[etichetta.comune, etichetta.regioneProduzione].filter(Boolean).join(', ')}
                        </p>
                      )}

                      {/* Verifiche count */}
                      {etichetta._count && etichetta._count.verifiche > 0 && (
                        <p className="text-xs text-purple-600 font-medium">
                          {etichetta._count.verifiche} verific{etichetta._count.verifiche === 1 ? 'a' : 'he'}
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal Upload */}
      <UploadEtichettaModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onSuccess={handleUploadSuccess}
      />

      {/* Modal Dettaglio/Modifica */}
      <DetailEtichettaModal
        isOpen={isDetailModalOpen}
        onClose={() => {
          setIsDetailModalOpen(false);
          setSelectedEtichetta(null);
        }}
        etichetta={selectedEtichetta}
        onSuccess={handleDetailSuccess}
      />
    </div>
  );
}
