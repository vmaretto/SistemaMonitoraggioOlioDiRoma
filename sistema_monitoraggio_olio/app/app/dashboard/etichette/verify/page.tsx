

'use client';

import { useState, useCallback, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { CheckCircle, XCircle, AlertTriangle, Upload, Image as ImageIcon, Zap, ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
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
  analisiTestuale?: {
    risultato: string;
    score: number;
    violazioni: string[];
  };
  analisiVisiva?: {
    similarity: number;
    verdict: string;
    differences: string[];
  };
}

export default function VerifyEtichettaPage() {
  const [uploadLoading, setUploadLoading] = useState(false);
  const [verificationResult, setVerificationResult] = useState<VerificationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [progressMessage, setProgressMessage] = useState<string>('');
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const handleFileUpload = useCallback(async (file: File) => {
    console.log('🎯 File selezionato:', file.name);
    
    console.log('📤 Inizio upload e analisi...');
    setUploadLoading(true);
    setError(null);
    setVerificationResult(null);
    setProgressPercent(0);
    setProgressMessage('');

    const formData = new FormData();
    formData.append('file', file);

    // Messaggi di progresso simulati
    const progressSteps = [
      { percent: 15, message: '📸 Estrazione testo dall\'immagine con OCR...', delay: 1000 },
      { percent: 35, message: '📋 Analisi conformità DOP/IGP...', delay: 3000 },
      { percent: 60, message: '🔍 Confronto con etichette ufficiali...', delay: 5000 },
      { percent: 85, message: '👁️ Analisi visiva approfondita...', delay: 8000 },
      { percent: 95, message: '💾 Finalizzazione verifica...', delay: 11000 }
    ];

    const startTime = Date.now();
    let currentStepIndex = 0;

    // Simula progresso
    const progressInterval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      
      if (currentStepIndex < progressSteps.length) {
        const step = progressSteps[currentStepIndex];
        if (elapsed >= step.delay) {
          setProgressPercent(step.percent);
          setProgressMessage(step.message);
          currentStepIndex++;
        }
      }
    }, 500);

    // Timeout controller per 120 secondi
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 120000);

    try {
      console.log('🚀 Invio richiesta POST a /api/etichette/verify...');
      const response = await fetch('/api/etichette/verify', {
        method: 'POST',
        body: formData,
        signal: controller.signal
      });
      console.log('📨 Risposta ricevuta:', response.status, response.ok);

      clearTimeout(timeoutId);
      clearInterval(progressInterval);

      if (response.ok) {
        const data = await response.json();
        setProgressPercent(100);
        setProgressMessage('✅ Verifica completata!');
        setTimeout(() => {
          setVerificationResult(data.verifica);
          setUploadLoading(false);
        }, 500);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Errore durante la verifica');
        setUploadLoading(false);
      }
    } catch (error) {
      clearTimeout(timeoutId);
      clearInterval(progressInterval);
      console.error('Errore upload etichetta:', error);
      if ((error as Error).name === 'AbortError') {
        setError('Timeout: l\'analisi sta richiedendo troppo tempo. Riprova con un\'immagine più piccola.');
      } else {
        setError('Errore di connessione durante il caricamento');
      }
      setUploadLoading(false);
    }
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      // Verifica dimensione max 10MB
      if (file.size > 10 * 1024 * 1024) {
        setError('File troppo grande. Massimo 10MB');
        return;
      }
      handleFileUpload(file);
    }
  };

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
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
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
            <div className="border-2 border-dashed rounded-lg p-12 text-center">
              <Upload className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <p className="text-xl font-medium text-gray-900 mb-2">Carica etichetta per la verifica</p>
              <p className="text-gray-600 mb-4">Seleziona un'immagine dal tuo computer</p>
              <div className="text-sm text-gray-500 mb-6">
                <p>Formati supportati: PNG, JPG, GIF, WebP</p>
                <p>Dimensione massima: 10MB</p>
              </div>
              
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                onChange={handleFileChange}
                className="hidden"
                id="file-upload"
              />
              <Button
                onClick={() => fileInputRef.current?.click()}
                size="lg"
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Upload className="h-5 w-5 mr-2" />
                Seleziona Immagine
              </Button>
            </div>

            {error && (
              <Alert variant="destructive" className="mt-6">
                <XCircle className="h-4 w-4" />
                <AlertTitle>Errore durante il caricamento</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="mt-8 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <h3 className="font-semibold text-blue-900 mb-2 flex items-center">
                <Zap className="h-4 w-4 mr-2" />
                Sistema di Verifica Dual-Layer (OpenAI Vision):
              </h3>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• <strong>OCR Testuale:</strong> Estrazione e analisi del testo con GPT-5 Vision</li>
                <li>• <strong>Visual Matching:</strong> Confronto diretto immagini con repository ufficiale</li>
                <li>• <strong>Score Combinato:</strong> 50% match testuale + 50% similarity visiva</li>
                <li>• <strong>Rilevamento:</strong> Violazioni DOP/IGP, simboli non autorizzati, contraffazioni</li>
                <li>• <strong>Riferimenti:</strong> Database etichette ufficiali Agroqualità/Consorzio</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      )}

      {uploadLoading && (
        <Card className="max-w-2xl mx-auto">
          <CardContent className="p-12">
            <div className="text-center mb-8">
              <Zap className="h-16 w-16 text-blue-500 mx-auto mb-4 animate-pulse" />
              <h3 className="text-xl font-semibold mb-2">Analisi in corso...</h3>
              <p className="text-muted-foreground">
                Il processo richiede 30-40 secondi, attendere prego
              </p>
            </div>

            {/* Barra di progresso */}
            <div className="space-y-4">
              <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                <div 
                  className="bg-blue-500 h-full transition-all duration-500 ease-out"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>

              {/* Messaggio di progresso corrente */}
              {progressMessage && (
                <div className="flex items-center justify-center space-x-2 text-sm">
                  <div className="flex items-center space-x-2 bg-blue-50 px-4 py-2 rounded-lg border border-blue-200">
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                    <span className="text-blue-900 font-medium">{progressMessage}</span>
                  </div>
                </div>
              )}

              {/* Percentuale */}
              <div className="text-center text-sm text-gray-600">
                {progressPercent}% completato
              </div>
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

          {/* Analisi Dettagliata */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Analisi Testuale */}
            {verificationResult.analisiTestuale && (
              <Card className={verificationResult.analisiTestuale.risultato === 'conforme' ? 'border-green-200' : 'border-orange-200'}>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <CheckCircle className="h-5 w-5 mr-2" />
                    Analisi Testuale (OCR)
                  </CardTitle>
                  <CardDescription>
                    Verifica conformità basata sul testo estratto
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Risultato:</span>
                      <Badge variant={verificationResult.analisiTestuale.risultato === 'conforme' ? 'default' : 'secondary'}>
                        {verificationResult.analisiTestuale.risultato}
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Score Testuale:</span>
                      <span className="text-lg font-bold">{verificationResult.analisiTestuale.score}%</span>
                    </div>
                    {verificationResult.analisiTestuale.violazioni.length > 0 && (
                      <div>
                        <p className="text-sm font-medium mb-2">Violazioni Testuali:</p>
                        <ul className="text-sm text-muted-foreground space-y-1">
                          {verificationResult.analisiTestuale.violazioni.map((v, i) => (
                            <li key={i}>• {v}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Analisi Visiva */}
            {verificationResult.analisiVisiva && (
              <Card className={verificationResult.analisiVisiva.verdict === 'identica' || verificationResult.analisiVisiva.verdict === 'simile' ? 'border-green-200' : 'border-red-200'}>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <ImageIcon className="h-5 w-5 mr-2" />
                    Analisi Visiva (AI Vision)
                  </CardTitle>
                  <CardDescription>
                    Confronto diretto con etichetta ufficiale
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Verdetto Visivo:</span>
                      <Badge variant={verificationResult.analisiVisiva.verdict === 'contraffatta' ? 'destructive' : 'default'}>
                        {verificationResult.analisiVisiva.verdict}
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Similarity Visiva:</span>
                      <span className="text-lg font-bold">{verificationResult.analisiVisiva.similarity}%</span>
                    </div>
                    {verificationResult.analisiVisiva.differences.length > 0 && (
                      <div>
                        <p className="text-sm font-medium mb-2">Differenze Visive:</p>
                        <ul className="text-sm text-muted-foreground space-y-1">
                          {verificationResult.analisiVisiva.differences.map((d, i) => (
                            <li key={i}>• {d}</li>
                          ))}
                        </ul>
                      </div>
                    )}
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
                  Tutte le Violazioni Rilevate
                </CardTitle>
                <CardDescription>
                  Violazioni combinate da analisi testuale e visiva
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
