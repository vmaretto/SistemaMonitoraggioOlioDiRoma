

'use client';

import { useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { CheckCircle, XCircle, AlertTriangle, Upload, Image as ImageIcon, Zap, ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useDropzone } from 'react-dropzone';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

interface VerificationResult {
  id: string;
  imageUrl: string;
  testoOcr: string;
  risultatoMatching: string;
  percentualeMatch: number;
  etichettaRiferimento?: string;
  violazioniRilevate: string[];
  note: string;
  etichettaUfficiale?: {
    nome: string;
    imageUrl: string;
    produttore: string;
    denominazione: string;
  };
}

export default function VerifyEtichettaPage() {
  const [uploadLoading, setUploadLoading] = useState(false);
  const [verificationResult, setVerificationResult] = useState<VerificationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;

    setUploadLoading(true);
    setError(null);
    setVerificationResult(null);

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
        setVerificationResult(data.verifica);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Errore durante la verifica');
      }
    } catch (error) {
      console.error('Errore upload etichetta:', error);
      setError('Errore di connessione durante il caricamento');
    } finally {
      setUploadLoading(false);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.gif', '.webp']
    },
    maxFiles: 1,
    maxSize: 10 * 1024 * 1024 // 10MB
  });

  const getResultIcon = (risultato: string) => {
    switch (risultato) {
      case 'conforme': return <CheckCircle className="h-8 w-8 text-green-600" />;
      case 'non_conforme': return <XCircle className="h-8 w-8 text-red-600" />;
      case 'sospetta': return <AlertTriangle className="h-8 w-8 text-orange-600" />;
      default: return <AlertTriangle className="h-8 w-8 text-gray-600" />;
    }
  };

  const getResultColor = (risultato: string) => {
    switch (risultato) {
      case 'conforme': return 'border-green-200 bg-green-50';
      case 'non_conforme': return 'border-red-200 bg-red-50';
      case 'sospetta': return 'border-orange-200 bg-orange-50';
      default: return 'border-gray-200 bg-gray-50';
    }
  };

  const getResultTitle = (risultato: string) => {
    switch (risultato) {
      case 'conforme': return 'Etichetta Conforme';
      case 'non_conforme': return 'Etichetta Non Conforme';
      case 'sospetta': return 'Etichetta Sospetta';
      default: return 'Verifica Completata';
    }
  };

  const getResultDescription = (risultato: string) => {
    switch (risultato) {
      case 'conforme': return 'L\'etichetta rispetta tutti i parametri di conformità e può essere utilizzata.';
      case 'non_conforme': return 'L\'etichetta presenta violazioni significative che richiedono correzione.';
      case 'sospetta': return 'L\'etichetta presenta alcuni elementi che richiedono verifica manuale.';
      default: return 'Analisi completata.';
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

  const nuovaVerifica = () => {
    setVerificationResult(null);
    setError(null);
  };

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Verifica Etichetta</h1>
          <p className="text-muted-foreground">
            Carica un'immagine di etichetta per verificarne la conformità automaticamente
          </p>
        </div>
        <div className="space-x-2">
          <Button 
            onClick={() => router.push('/dashboard/etichette')} 
            variant="outline"
            size="sm"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Repository
          </Button>
          <Button onClick={() => router.push('/dashboard')} variant="outline">
            ← Dashboard
          </Button>
        </div>
      </div>

      {!verificationResult && !uploadLoading && (
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle className="text-lg flex items-center">
              <Upload className="h-5 w-5 mr-2" />
              Carica Etichetta per Verifica
            </CardTitle>
            <CardDescription>
              Il sistema analizzerà automaticamente l'etichetta utilizzando OCR e confronto con il database ufficiale.
              Saranno rilevate eventuali violazioni o usi impropri di simboli e terminologie.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div
              {...getRootProps()}
              className={`
                border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors
                ${isDragActive ? 'border-blue-400 bg-blue-50' : 'border-gray-300 hover:border-gray-400'}
              `}
            >
              <input {...getInputProps()} />
              {isDragActive ? (
                <div>
                  <ImageIcon className="h-16 w-16 text-blue-500 mx-auto mb-4" />
                  <p className="text-lg text-blue-600 font-medium">Rilascia l'immagine qui...</p>
                  <p className="text-sm text-blue-500">L'analisi inizierà automaticamente</p>
                </div>
              ) : (
                <div>
                  <Upload className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-xl font-medium text-gray-900 mb-2">Carica etichetta per la verifica</p>
                  <p className="text-gray-600 mb-4">Trascina un'immagine qui o clicca per selezionare</p>
                  <div className="text-sm text-gray-500">
                    <p>Formati supportati: PNG, JPG, GIF, WebP</p>
                    <p>Dimensione massima: 10MB</p>
                  </div>
                </div>
              )}
            </div>

            {error && (
              <Alert variant="destructive" className="mt-6">
                <XCircle className="h-4 w-4" />
                <AlertTitle>Errore durante il caricamento</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="mt-8 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <h3 className="font-semibold text-blue-900 mb-2">Cosa viene verificato:</h3>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Conformità con etichette ufficiali del database Agroqualità</li>
                <li>• Uso corretto di denominazioni DOP, IGP e biologiche</li>
                <li>• Rilevamento di simboli romani non autorizzati (Colosseo, Lupa Capitolina)</li>
                <li>• Verifica terminologie geografiche (es. "romanesco")</li>
                <li>• Matching percentuale con etichette di riferimento</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      )}

      {uploadLoading && (
        <Card className="max-w-2xl mx-auto">
          <CardContent className="p-12 text-center">
            <Zap className="h-16 w-16 text-blue-500 mx-auto mb-4 animate-pulse" />
            <h3 className="text-xl font-semibold mb-2">Analisi in corso...</h3>
            <p className="text-muted-foreground mb-6">
              Stiamo processando l'etichetta con OCR e confrontando con il database ufficiale
            </p>
            <div className="flex justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          </CardContent>
        </Card>
      )}

      {verificationResult && (
        <div className="space-y-6">
          {/* Risultato Principale */}
          <Card className={`border-2 ${getResultColor(verificationResult.risultatoMatching)}`}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  {getResultIcon(verificationResult.risultatoMatching)}
                  <div>
                    <CardTitle className="text-xl">{getResultTitle(verificationResult.risultatoMatching)}</CardTitle>
                    <CardDescription className="text-base mt-1">
                      {getResultDescription(verificationResult.risultatoMatching)}
                    </CardDescription>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold">
                    {verificationResult.percentualeMatch.toFixed(1)}%
                  </div>
                  <div className="text-sm text-muted-foreground">Match</div>
                </div>
              </div>
            </CardHeader>
          </Card>

          {/* Dettagli Verifica */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Etichetta Caricata */}
            <Card>
              <CardHeader>
                <CardTitle>Etichetta Verificata</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="relative aspect-square bg-muted rounded-lg overflow-hidden">
                    <Image
                      src={verificationResult.imageUrl}
                      alt="Etichetta verificata"
                      fill
                      className="object-contain"
                    />
                  </div>
                  {verificationResult.testoOcr && (
                    <div>
                      <h4 className="font-semibold mb-2">Testo Riconosciuto (OCR)</h4>
                      <div className="bg-gray-50 p-3 rounded border text-sm">
                        {verificationResult.testoOcr}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Etichetta di Riferimento */}
            {verificationResult.etichettaUfficiale && (
              <Card>
                <CardHeader>
                  <CardTitle>Etichetta di Riferimento</CardTitle>
                  <CardDescription>
                    Etichetta ufficiale utilizzata per il confronto
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="relative aspect-square bg-muted rounded-lg overflow-hidden">
                      <Image
                        src={verificationResult.etichettaUfficiale.imageUrl}
                        alt="Etichetta di riferimento"
                        fill
                        className="object-contain"
                      />
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Nome:</span>
                        <span className="text-sm font-medium">{verificationResult.etichettaUfficiale.nome}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Produttore:</span>
                        <span className="text-sm font-medium">{verificationResult.etichettaUfficiale.produttore}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Denominazione:</span>
                        <Badge variant="outline">{verificationResult.etichettaUfficiale.denominazione}</Badge>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Violazioni */}
          {verificationResult.violazioniRilevate.length > 0 && (
            <Card className="border-red-200">
              <CardHeader>
                <CardTitle className="text-red-800 flex items-center">
                  <AlertTriangle className="h-5 w-5 mr-2" />
                  Violazioni Rilevate
                </CardTitle>
                <CardDescription>
                  Sono state rilevate le seguenti non conformità che richiedono attenzione
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {verificationResult.violazioniRilevate.map((violazione, index) => (
                    <Alert key={index} variant="destructive">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertTitle>Violazione {index + 1}</AlertTitle>
                      <AlertDescription>
                        {getViolazioneText(violazione)}
                      </AlertDescription>
                    </Alert>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Note Aggiuntive */}
          {verificationResult.note && (
            <Card>
              <CardHeader>
                <CardTitle>Note sulla Verifica</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm">{verificationResult.note}</p>
              </CardContent>
            </Card>
          )}

          {/* Azioni */}
          <div className="flex justify-center space-x-4">
            <Button onClick={nuovaVerifica} variant="outline">
              Verifica Nuova Etichetta
            </Button>
            <Button onClick={() => router.push('/dashboard/verifiche')}>
              Visualizza Tutte le Verifiche
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
