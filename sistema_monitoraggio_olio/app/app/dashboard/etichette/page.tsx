

'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Image as ImageIcon, Search, ShieldCheck, Award, Package } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import Image from 'next/image';

interface EtichettaUfficiale {
  id: string;
  nome: string;
  descrizione?: string;
  imageUrl: string;
  testoOcr?: string;
  categoria: string;
  denominazione: string;
  produttore?: string;
  regioneProduzione: string;
  isAttiva: boolean;
  createdAt: string;
}

export default function EtichettePage() {
  const [etichette, setEtichette] = useState<EtichettaUfficiale[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDenominazione, setFilterDenominazione] = useState('all');
  const [filterCategoria, setFilterCategoria] = useState('all');
  const router = useRouter();

  useEffect(() => {
    fetchEtichette();
  }, []);

  const fetchEtichette = async () => {
    try {
      const response = await fetch('/api/etichette');
      const data = await response.json();
      setEtichette(data.etichette || []);
    } catch (error) {
      console.error('Errore caricamento etichette:', error);
    } finally {
      setLoading(false);
    }
  };

  const getDenominazioneIcon = (denominazione: string) => {
    switch (denominazione.toUpperCase()) {
      case 'DOP': return <Award className="h-4 w-4 text-yellow-600" />;
      case 'IGP': return <ShieldCheck className="h-4 w-4 text-blue-600" />;
      case 'BIO': return <Package className="h-4 w-4 text-green-600" />;
      default: return <Package className="h-4 w-4 text-gray-600" />;
    }
  };

  const getDenominazioneColor = (denominazione: string) => {
    switch (denominazione.toUpperCase()) {
      case 'DOP': return 'bg-yellow-100 text-yellow-800';
      case 'IGP': return 'bg-blue-100 text-blue-800';
      case 'BIO': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredEtichette = etichette.filter(etichetta => {
    const matchesSearch = etichetta.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         etichetta.descrizione?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         etichetta.produttore?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesDenominazione = filterDenominazione === 'all' || etichetta.denominazione === filterDenominazione;
    const matchesCategoria = filterCategoria === 'all' || etichetta.categoria === filterCategoria;

    return matchesSearch && matchesDenominazione && matchesCategoria;
  });

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-64 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[...Array(9)].map((_, i) => (
              <div key={i} className="h-80 bg-gray-200 rounded"></div>
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
          <h1 className="text-3xl font-bold tracking-tight">Repository Etichette Ufficiali</h1>
          <p className="text-muted-foreground">
            Archivio delle etichette certificate per il monitoraggio delle conformità
          </p>
        </div>
        <div className="space-x-2">
          <Button onClick={() => router.push('/dashboard/etichette/verify')} variant="outline">
            Verifica Etichetta
          </Button>
          <Button onClick={() => router.push('/dashboard')} variant="outline">
            ← Torna alla Dashboard
          </Button>
        </div>
      </div>

      {/* Filtri e Ricerca */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg">Filtri e Ricerca</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cerca etichette..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filterDenominazione} onValueChange={setFilterDenominazione}>
              <SelectTrigger>
                <SelectValue placeholder="Denominazione" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tutte le denominazioni</SelectItem>
                <SelectItem value="DOP">DOP</SelectItem>
                <SelectItem value="IGP">IGP</SelectItem>
                <SelectItem value="BIO">Biologico</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterCategoria} onValueChange={setFilterCategoria}>
              <SelectTrigger>
                <SelectValue placeholder="Categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tutte le categorie</SelectItem>
                <SelectItem value="ufficiale">Ufficiali</SelectItem>
                <SelectItem value="variante">Varianti</SelectItem>
              </SelectContent>
            </Select>
            <Button 
              onClick={() => {
                setSearchTerm('');
                setFilterDenominazione('all');
                setFilterCategoria('all');
              }}
              variant="outline"
            >
              Reset Filtri
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Statistiche */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Award className="h-4 w-4 text-yellow-600" />
              <div className="ml-2">
                <p className="text-sm font-medium text-muted-foreground">DOP</p>
                <p className="text-2xl font-bold">
                  {etichette.filter(e => e.denominazione === 'DOP').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <ShieldCheck className="h-4 w-4 text-blue-600" />
              <div className="ml-2">
                <p className="text-sm font-medium text-muted-foreground">IGP</p>
                <p className="text-2xl font-bold">
                  {etichette.filter(e => e.denominazione === 'IGP').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Package className="h-4 w-4 text-green-600" />
              <div className="ml-2">
                <p className="text-sm font-medium text-muted-foreground">Biologici</p>
                <p className="text-2xl font-bold">
                  {etichette.filter(e => e.denominazione === 'BIO').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <ImageIcon className="h-4 w-4 text-purple-600" />
              <div className="ml-2">
                <p className="text-sm font-medium text-muted-foreground">Totali</p>
                <p className="text-2xl font-bold">{etichette.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Griglia Etichette */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredEtichette.length === 0 ? (
          <div className="col-span-full">
            <Card>
              <CardContent className="p-12 text-center">
                <ImageIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold">Nessuna etichetta trovata</h3>
                <p className="text-muted-foreground">Non ci sono etichette che corrispondono ai filtri selezionati.</p>
              </CardContent>
            </Card>
          </div>
        ) : (
          filteredEtichette.map((etichetta) => (
            <Card key={etichetta.id} className="overflow-hidden">
              <div className="relative aspect-square bg-muted">
                <Image
                  src={etichetta.imageUrl}
                  alt={etichetta.nome}
                  fill
                  className="object-contain p-2"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                  }}
                />
              </div>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <CardTitle className="text-lg line-clamp-2">{etichetta.nome}</CardTitle>
                  <div className="flex items-center space-x-1">
                    {getDenominazioneIcon(etichetta.denominazione)}
                    <div className={`px-2 py-1 rounded text-xs font-semibold ${getDenominazioneColor(etichetta.denominazione)}`}>
                      {etichetta.denominazione}
                    </div>
                  </div>
                </div>
                <CardDescription className="line-clamp-2">
                  {etichetta.descrizione}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {etichetta.produttore && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Produttore:</span>
                      <span className="font-medium">{etichetta.produttore}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Regione:</span>
                    <span className="font-medium">{etichetta.regioneProduzione}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Categoria:</span>
                    <Badge variant="outline" className="text-xs">
                      {etichetta.categoria}
                    </Badge>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Aggiunta il:</span>
                    <span className="text-xs">
                      {format(new Date(etichetta.createdAt), 'PP', { locale: it })}
                    </span>
                  </div>
                  {etichetta.testoOcr && (
                    <div className="mt-3 p-2 bg-gray-50 rounded text-xs">
                      <p className="font-medium text-muted-foreground mb-1">Testo riconosciuto:</p>
                      <p className="line-clamp-3">{etichetta.testoOcr}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
