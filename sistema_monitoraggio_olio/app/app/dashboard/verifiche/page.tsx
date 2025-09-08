

'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CheckCircle, XCircle, AlertTriangle, Upload, Image as ImageIcon, Zap } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import Image from 'next/image';
import { useDropzone } from 'react-dropzone';

interface VerificaEtichetta {
  id: string;
  imageUrl: string;
  testoOcr?: string;
  risultatoMatching: string;
  percentualeMatch: number;
  etichettaRiferimento?: string;
  violazioniRilevate: string[];
  note?: string;
  stato: string;
  createdAt: string;
}

export default function VerifichePage() {
  const [verifiche, setVerifiche] = useState<VerificaEtichetta[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [filter, setFilter] = useState('all');
  const router = useRouter();

  useEffect(() => {
    fetchVerifiche();
  }, []);

  const fetchVerifiche = async () => {
    try {
      const response = await fetch('/api/verifiche');
      const data = await response.json();
      setVerifiche(data.verifiche || []);
    } catch (error) {
      console.error('Errore caricamento verifiche:', error);
    } finally {
      setLoading(false);
    }
  };

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;

    setUploadLoading(true);
    const file = acceptedFiles[0];
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/etichette/verify', {
        method: 'POST',
        body: formData
      });

      if (response.ok) {
        const data = await response.json();
        fetchVerifiche();
      }
    } catch (error) {
      console.error('Errore upload etichetta:', error);
    } finally {
      setUploadLoading(false);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.gif', '.webp']
    },
    maxFiles: 1
  });

  const getResultIcon = (risultato: string) => {
    switch (risultato) {
      case 'conforme': return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'non_conforme': return <XCircle className="h-4 w-4 text-red-600" />;
      case 'sospetta': return <AlertTriangle className="h-4 w-4 text-orange-600" />;
      default: return <AlertTriangle className="h-4 w-4 text-gray-600" />;
    }
  };

  const getResultColor = (risultato: string) => {
    switch (risultato) {
      case 'conforme': return 'bg-green-100 text-green-800 border-green-200';
      case 'non_conforme': return 'bg-red-100 text-red-800 border-red-200';
      case 'sospetta': return 'bg-orange-100 text-orange-800 border-orange-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getViolazioneText = (violazione: string) => {
    switch (violazione) {
      case 'uso_simboli_romani_non_autorizzati': return 'Uso di simboli romani non autorizzati';
      case 'evocazione_colosseo': return 'Evocazione impropria del Colosseo';
      case 'evocazione_lupa_capitolina': return 'Evocazione impropria della Lupa Capitolina';
      case 'uso_termine_romanesco': return 'Uso improprio del termine "romanesco"';
      default: return violazione.replace('_', ' ');
    }
  };

  const filteredVerifiche = verifiche.filter(verifica => {
    switch (filter) {
      case 'conforme': return verifica.risultatoMatching === 'conforme';
      case 'non_conforme': return verifica.risultatoMatching === 'non_conforme';
      case 'sospetta': return verifica.risultatoMatching === 'sospetta';
      case 'da_verificare': return verifica.stato === 'da_verificare';
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
              <div key={i} className="h-48 bg-gray-200 rounded"></div>
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
          <h1 className="text-3xl font-bold tracking-tight">Verifiche Etichette</h1>
          <p className="text-muted-foreground">
            Sistema di verifica automatica delle etichette tramite OCR e matching
          </p>
        </div>
        <Button onClick={() => router.push('/dashboard')} variant="outline">
          ← Torna alla Dashboard
        </Button>
      </div>

      {/* Sezione Upload */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg flex items-center">
            <Upload className="h-5 w-5 mr-2" />
            Carica Nuova Etichetta
          </CardTitle>
          <CardDescription>
            Trascina un'immagine qui o clicca per selezionare un file. L'analisi OCR e il matching verranno eseguiti automaticamente.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div
            {...getRootProps()}
            className={`
              border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
              ${isDragActive ? 'border-blue-400 bg-blue-50' : 'border-gray-300 hover:border-gray-400'}
              ${uploadLoading ? 'opacity-50 pointer-events-none' : ''}
            `}
          >
            <input {...getInputProps()} />
            {uploadLoading ? (
              <div className="flex items-center justify-center">
                <Zap className="h-6 w-6 animate-spin mr-2" />
                <p>Analisi in corso...</p>
              </div>
            ) : isDragActive ? (
              <div>
                <ImageIcon className="h-12 w-12 text-blue-500 mx-auto mb-4" />
                <p className="text-blue-600">Rilascia l'immagine qui...</p>
              </div>
            ) : (
              <div>
                <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-lg font-medium text-gray-900">Carica etichetta per la verifica</p>
                <p className="text-sm text-muted-foreground">PNG, JPG, GIF fino a 10MB</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Statistiche */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <div className="ml-2">
                <p className="text-sm font-medium text-muted-foreground">Conformi</p>
                <p className="text-2xl font-bold">
                  {verifiche.filter(v => v.risultatoMatching === 'conforme').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <XCircle className="h-4 w-4 text-red-600" />
              <div className="ml-2">
                <p className="text-sm font-medium text-muted-foreground">Non Conformi</p>
                <p className="text-2xl font-bold">
                  {verifiche.filter(v => v.risultatoMatching === 'non_conforme').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <AlertTriangle className="h-4 w-4 text-orange-600" />
              <div className="ml-2">
                <p className="text-sm font-medium text-muted-foreground">Sospette</p>
                <p className="text-2xl font-bold">
                  {verifiche.filter(v => v.risultatoMatching === 'sospetta').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <ImageIcon className="h-4 w-4 text-blue-600" />
              <div className="ml-2">
                <p className="text-sm font-medium text-muted-foreground">Totali</p>
                <p className="text-2xl font-bold">{verifiche.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Lista Verifiche */}
      <Tabs defaultValue="all" value={filter} onValueChange={setFilter}>
        <TabsList>
          <TabsTrigger value="all">Tutte</TabsTrigger>
          <TabsTrigger value="conforme">Conformi</TabsTrigger>
          <TabsTrigger value="sospetta">Sospette</TabsTrigger>
          <TabsTrigger value="non_conforme">Non Conformi</TabsTrigger>
          <TabsTrigger value="da_verificare">Da Verificare</TabsTrigger>
        </TabsList>

        <TabsContent value={filter} className="space-y-4">
          {filteredVerifiche.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <ImageIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold">Nessuna verifica trovata</h3>
                <p className="text-muted-foreground">Non ci sono verifiche che corrispondono ai filtri selezionati.</p>
              </CardContent>
            </Card>
          ) : (
            filteredVerifiche.map((verifica) => (
              <Card key={verifica.id} className={`${verifica.risultatoMatching === 'non_conforme' ? 'border-red-200' : ''}`}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-2">
                      {getResultIcon(verifica.risultatoMatching)}
                      <div className={`px-3 py-1 rounded-full text-sm font-medium border ${getResultColor(verifica.risultatoMatching)}`}>
                        {verifica.risultatoMatching.replace('_', ' ').toUpperCase()}
                      </div>
                      <Badge variant="outline">
                        Match: {verifica.percentualeMatch.toFixed(1)}%
                      </Badge>
                      <Badge variant="secondary">
                        {verifica.stato.replace('_', ' ')}
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {format(new Date(verifica.createdAt), 'PPp', { locale: it })}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-semibold mb-2">Immagine Etichetta</h4>
                      <div className="relative aspect-square bg-muted rounded-lg overflow-hidden">
                        <Image
                          src={verifica.imageUrl}
                          alt="Etichetta verificata"
                          fill
                          className="object-contain"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none';
                          }}
                        />
                      </div>
                    </div>
                    <div>
                      <h4 className="font-semibold mb-2">Dettagli Verifica</h4>
                      {verifica.testoOcr && (
                        <div className="mb-4">
                          <p className="text-sm font-medium text-muted-foreground mb-1">Testo Estratto (OCR):</p>
                          <p className="text-sm bg-gray-50 p-3 rounded border">{verifica.testoOcr}</p>
                        </div>
                      )}
                      
                      {verifica.violazioniRilevate.length > 0 && (
                        <Alert variant="destructive" className="mb-4">
                          <AlertTriangle className="h-4 w-4" />
                          <AlertTitle>Violazioni Rilevate</AlertTitle>
                          <AlertDescription>
                            <ul className="list-disc list-inside space-y-1">
                              {verifica.violazioniRilevate.map((violazione, index) => (
                                <li key={index} className="text-sm">
                                  {getViolazioneText(violazione)}
                                </li>
                              ))}
                            </ul>
                          </AlertDescription>
                        </Alert>
                      )}

                      {verifica.note && (
                        <div>
                          <p className="text-sm font-medium text-muted-foreground mb-1">Note:</p>
                          <p className="text-sm">{verifica.note}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
