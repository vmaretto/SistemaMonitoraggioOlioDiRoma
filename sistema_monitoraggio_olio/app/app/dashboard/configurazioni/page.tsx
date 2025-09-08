

'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Settings, Save, RotateCcw, Mail, Sliders, Shield, Bell } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';

interface Configurazione {
  id: string;
  chiave: string;
  valore: string;
  descrizione?: string;
  categoria: string;
  createdAt: string;
  updatedAt: string;
}

export default function ConfigurazioniPage() {
  const [configurazioni, setConfigurazioni] = useState<Configurazione[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const router = useRouter();

  // Stato per le configurazioni locali
  const [localConfig, setLocalConfig] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    fetchConfigurazioni();
  }, []);

  useEffect(() => {
    // Controlla se ci sono modifiche non salvate
    const hasLocalChanges = Object.keys(localConfig).some(key => {
      const config = configurazioni.find(c => c.chiave === key);
      return config && localConfig[key] !== config.valore;
    });
    setHasChanges(hasLocalChanges);
  }, [localConfig, configurazioni]);

  const fetchConfigurazioni = async () => {
    try {
      const response = await fetch('/api/configurazioni');
      const data = await response.json();
      const configs = data.configurazioni || [];
      setConfigurazioni(configs);
      
      // Inizializza lo stato locale
      const local: { [key: string]: string } = {};
      configs.forEach((config: Configurazione) => {
        local[config.chiave] = config.valore;
      });
      setLocalConfig(local);
    } catch (error) {
      console.error('Errore caricamento configurazioni:', error);
    } finally {
      setLoading(false);
    }
  };

  const salvaConfigurazioni = async () => {
    setSaving(true);
    try {
      const updates = Object.keys(localConfig).map(chiave => {
        const config = configurazioni.find(c => c.chiave === chiave);
        return {
          id: config?.id,
          chiave,
          valore: localConfig[chiave]
        };
      });

      const response = await fetch('/api/configurazioni', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ updates })
      });

      if (response.ok) {
        fetchConfigurazioni();
        setHasChanges(false);
      }
    } catch (error) {
      console.error('Errore salvataggio configurazioni:', error);
    } finally {
      setSaving(false);
    }
  };

  const resetConfigurazioni = () => {
    const local: { [key: string]: string } = {};
    configurazioni.forEach((config: Configurazione) => {
      local[config.chiave] = config.valore;
    });
    setLocalConfig(local);
    setHasChanges(false);
  };

  const updateLocalConfig = (chiave: string, valore: string) => {
    setLocalConfig(prev => ({
      ...prev,
      [chiave]: valore
    }));
  };

  const getCategoriaIcon = (categoria: string) => {
    switch (categoria) {
      case 'monitoraggio': return <Sliders className="h-4 w-4 text-blue-600" />;
      case 'etichette': return <Shield className="h-4 w-4 text-green-600" />;
      case 'notifiche': return <Bell className="h-4 w-4 text-orange-600" />;
      default: return <Settings className="h-4 w-4 text-gray-600" />;
    }
  };

  const getCategoriaColor = (categoria: string) => {
    switch (categoria) {
      case 'monitoraggio': return 'bg-blue-100 text-blue-800';
      case 'etichette': return 'bg-green-100 text-green-800';
      case 'notifiche': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const renderConfigField = (config: Configurazione) => {
    const valore = localConfig[config.chiave] || '';
    
    switch (config.chiave) {
      case 'soglia_sentiment_critico':
      case 'soglia_matching_etichette':
      case 'intervallo_monitoraggio':
        return (
          <Input
            type="number"
            value={valore}
            onChange={(e) => updateLocalConfig(config.chiave, e.target.value)}
            step={config.chiave === 'soglia_sentiment_critico' ? '0.1' : '1'}
          />
        );
      
      case 'email_notifiche':
        return (
          <Input
            type="email"
            value={valore}
            onChange={(e) => updateLocalConfig(config.chiave, e.target.value)}
          />
        );
      
      case 'parole_vietate':
        try {
          const parole = JSON.parse(valore);
          return (
            <Textarea
              value={parole.join('\n')}
              onChange={(e) => {
                const paroleArray = e.target.value.split('\n').filter(p => p.trim());
                updateLocalConfig(config.chiave, JSON.stringify(paroleArray));
              }}
              rows={4}
              placeholder="Una parola per riga"
            />
          );
        } catch {
          return (
            <Textarea
              value={valore}
              onChange={(e) => updateLocalConfig(config.chiave, e.target.value)}
              rows={4}
            />
          );
        }
      
      default:
        return (
          <Input
            value={valore}
            onChange={(e) => updateLocalConfig(config.chiave, e.target.value)}
          />
        );
    }
  };

  const getFieldLabel = (chiave: string) => {
    switch (chiave) {
      case 'soglia_sentiment_critico': return 'Soglia Sentiment Critico';
      case 'soglia_matching_etichette': return 'Soglia Matching Etichette (%)';
      case 'email_notifiche': return 'Email per Notifiche';
      case 'intervallo_monitoraggio': return 'Intervallo Monitoraggio (minuti)';
      case 'parole_vietate': return 'Parole Vietate';
      default: return chiave.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
    }
  };

  const categorieUniche = [...new Set(configurazioni.map(c => c.categoria))];

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
          <h1 className="text-3xl font-bold tracking-tight">Configurazioni Sistema</h1>
          <p className="text-muted-foreground">
            Gestisci le impostazioni e i parametri di configurazione del sistema
          </p>
        </div>
        <div className="space-x-2">
          {hasChanges && (
            <>
              <Button onClick={resetConfigurazioni} variant="outline">
                <RotateCcw className="h-4 w-4 mr-2" />
                Ripristina
              </Button>
              <Button onClick={salvaConfigurazioni} disabled={saving}>
                {saving ? (
                  <>
                    <Settings className="h-4 w-4 mr-2 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Salva Modifiche
                  </>
                )}
              </Button>
            </>
          )}
          <Button onClick={() => router.push('/dashboard')} variant="outline">
            ← Torna alla Dashboard
          </Button>
        </div>
      </div>

      {hasChanges && (
        <Card className="mb-6 border-orange-200 bg-orange-50">
          <CardHeader>
            <CardTitle className="text-orange-800 flex items-center">
              <Settings className="h-5 w-5 mr-2" />
              Modifiche Non Salvate
            </CardTitle>
            <CardDescription className="text-orange-700">
              Hai delle modifiche non salvate. Ricordati di salvare prima di uscire dalla pagina.
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      <Tabs defaultValue={categorieUniche[0]} className="space-y-6">
        <TabsList>
          {categorieUniche.map(categoria => (
            <TabsTrigger key={categoria} value={categoria} className="flex items-center space-x-2">
              {getCategoriaIcon(categoria)}
              <span>{categoria.charAt(0).toUpperCase() + categoria.slice(1)}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        {categorieUniche.map(categoria => (
          <TabsContent key={categoria} value={categoria} className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  {getCategoriaIcon(categoria)}
                  <span className="ml-2">Configurazioni {categoria.charAt(0).toUpperCase() + categoria.slice(1)}</span>
                </CardTitle>
                <CardDescription>
                  Personalizza le impostazioni per la categoria {categoria}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {configurazioni
                  .filter(config => config.categoria === categoria)
                  .map((config, index) => (
                    <div key={config.id}>
                      {index > 0 && <Separator className="my-4" />}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label htmlFor={config.chiave} className="text-sm font-medium">
                            {getFieldLabel(config.chiave)}
                          </Label>
                          <Badge variant="outline" className={getCategoriaColor(config.categoria)}>
                            {config.categoria}
                          </Badge>
                        </div>
                        {config.descrizione && (
                          <p className="text-sm text-muted-foreground">
                            {config.descrizione}
                          </p>
                        )}
                        <div className="max-w-md">
                          {renderConfigField(config)}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Ultima modifica: {format(new Date(config.updatedAt), 'PPp', { locale: it })}
                        </p>
                      </div>
                    </div>
                  ))}
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
