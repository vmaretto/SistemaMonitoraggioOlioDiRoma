

'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Mail, Send, CheckCircle, XCircle, Clock, Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';

interface LogNotifica {
  id: string;
  tipo: string;
  destinatario: string;
  oggetto: string;
  corpo: string;
  stato: string;
  alertId?: string;
  createdAt: string;
}

export default function NotifichePage() {
  const [notifiche, setNotifiche] = useState<LogNotifica[]>([]);
  const [loading, setLoading] = useState(true);
  const [sendLoading, setSendLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [filter, setFilter] = useState('all');
  const router = useRouter();

  // Form state per nuova notifica
  const [formData, setFormData] = useState({
    tipo: 'email',
    destinatario: '',
    oggetto: '',
    corpo: ''
  });

  useEffect(() => {
    fetchNotifiche();
  }, []);

  const fetchNotifiche = async () => {
    try {
      const response = await fetch('/api/notifiche');
      const data = await response.json();
      setNotifiche(data.notifiche || []);
    } catch (error) {
      console.error('Errore caricamento notifiche:', error);
    } finally {
      setLoading(false);
    }
  };

  const inviaNotifica = async () => {
    if (!formData.destinatario || !formData.oggetto || !formData.corpo) {
      return;
    }

    setSendLoading(true);
    try {
      const response = await fetch('/api/notifiche/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        fetchNotifiche();
        setIsDialogOpen(false);
        setFormData({ tipo: 'email', destinatario: '', oggetto: '', corpo: '' });
      }
    } catch (error) {
      console.error('Errore invio notifica:', error);
    } finally {
      setSendLoading(false);
    }
  };

  const getStatoIcon = (stato: string) => {
    switch (stato) {
      case 'inviata': return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'fallita': return <XCircle className="h-4 w-4 text-red-600" />;
      case 'in_sospeso': return <Clock className="h-4 w-4 text-orange-600" />;
      default: return <Clock className="h-4 w-4 text-gray-600" />;
    }
  };

  const getStatoColor = (stato: string) => {
    switch (stato) {
      case 'inviata': return 'bg-green-100 text-green-800';
      case 'fallita': return 'bg-red-100 text-red-800';
      case 'in_sospeso': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTipoIcon = (tipo: string) => {
    switch (tipo) {
      case 'email': return '📧';
      case 'sms': return '📱';
      case 'push': return '🔔';
      default: return '📧';
    }
  };

  const filteredNotifiche = notifiche.filter(notifica => {
    switch (filter) {
      case 'inviata': return notifica.stato === 'inviata';
      case 'fallita': return notifica.stato === 'fallita';
      case 'in_sospeso': return notifica.stato === 'in_sospeso';
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
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
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
          <h1 className="text-3xl font-bold tracking-tight">Sistema Notifiche</h1>
          <p className="text-muted-foreground">
            Gestisci e monitora l'invio delle notifiche via email, SMS e push
          </p>
        </div>
        <div className="space-x-2">
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Nuova Notifica
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[525px]">
              <DialogHeader>
                <DialogTitle>Invia Nuova Notifica</DialogTitle>
                <DialogDescription>
                  Compila i campi per inviare una notifica personalizzata
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="tipo" className="text-right">
                    Tipo
                  </Label>
                  <Select value={formData.tipo} onValueChange={(value) => setFormData({...formData, tipo: value})}>
                    <SelectTrigger className="col-span-3">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="email">Email</SelectItem>
                      <SelectItem value="sms">SMS</SelectItem>
                      <SelectItem value="push">Push</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="destinatario" className="text-right">
                    Destinatario
                  </Label>
                  <Input
                    id="destinatario"
                    value={formData.destinatario}
                    onChange={(e) => setFormData({...formData, destinatario: e.target.value})}
                    className="col-span-3"
                    placeholder={formData.tipo === 'email' ? 'email@esempio.com' : '+39 123 456 7890'}
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="oggetto" className="text-right">
                    Oggetto
                  </Label>
                  <Input
                    id="oggetto"
                    value={formData.oggetto}
                    onChange={(e) => setFormData({...formData, oggetto: e.target.value})}
                    className="col-span-3"
                    placeholder="Oggetto della notifica"
                  />
                </div>
                <div className="grid grid-cols-4 items-start gap-4">
                  <Label htmlFor="corpo" className="text-right pt-2">
                    Messaggio
                  </Label>
                  <Textarea
                    id="corpo"
                    value={formData.corpo}
                    onChange={(e) => setFormData({...formData, corpo: e.target.value})}
                    className="col-span-3"
                    rows={4}
                    placeholder="Scrivi qui il contenuto della notifica..."
                  />
                </div>
              </div>
              <DialogFooter>
                <Button onClick={inviaNotifica} disabled={sendLoading}>
                  {sendLoading ? (
                    <>
                      <Clock className="h-4 w-4 mr-2 animate-spin" />
                      Invio...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Invia Notifica
                    </>
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <Button onClick={() => router.push('/dashboard')} variant="outline">
            ← Torna alla Dashboard
          </Button>
        </div>
      </div>

      {/* Statistiche */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <div className="ml-2">
                <p className="text-sm font-medium text-muted-foreground">Inviate</p>
                <p className="text-2xl font-bold">
                  {notifiche.filter(n => n.stato === 'inviata').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Clock className="h-4 w-4 text-orange-600" />
              <div className="ml-2">
                <p className="text-sm font-medium text-muted-foreground">In Sospeso</p>
                <p className="text-2xl font-bold">
                  {notifiche.filter(n => n.stato === 'in_sospeso').length}
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
                <p className="text-sm font-medium text-muted-foreground">Fallite</p>
                <p className="text-2xl font-bold">
                  {notifiche.filter(n => n.stato === 'fallita').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Mail className="h-4 w-4 text-blue-600" />
              <div className="ml-2">
                <p className="text-sm font-medium text-muted-foreground">Totali</p>
                <p className="text-2xl font-bold">{notifiche.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Lista Notifiche */}
      <Tabs defaultValue="all" value={filter} onValueChange={setFilter}>
        <TabsList>
          <TabsTrigger value="all">Tutte</TabsTrigger>
          <TabsTrigger value="inviata">Inviate</TabsTrigger>
          <TabsTrigger value="in_sospeso">In Sospeso</TabsTrigger>
          <TabsTrigger value="fallita">Fallite</TabsTrigger>
        </TabsList>

        <TabsContent value={filter} className="space-y-4">
          {filteredNotifiche.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <Mail className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold">Nessuna notifica trovata</h3>
                <p className="text-muted-foreground">Non ci sono notifiche che corrispondono ai filtri selezionati.</p>
              </CardContent>
            </Card>
          ) : (
            filteredNotifiche.map((notifica) => (
              <Card key={notifica.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="text-lg">{getTipoIcon(notifica.tipo)}</span>
                      <Badge variant="outline">{notifica.tipo}</Badge>
                      <div className={`flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium ${getStatoColor(notifica.stato)}`}>
                        {getStatoIcon(notifica.stato)}
                        <span>{notifica.stato.replace('_', ' ')}</span>
                      </div>
                      {notifica.alertId && (
                        <Badge variant="secondary">Alert #{notifica.alertId}</Badge>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {format(new Date(notifica.createdAt), 'PPp', { locale: it })}
                    </div>
                  </div>
                  <CardTitle className="text-lg">{notifica.oggetto}</CardTitle>
                  <CardDescription>
                    Destinatario: {notifica.destinatario}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="bg-gray-50 p-3 rounded border">
                    <p className="text-sm whitespace-pre-wrap">{notifica.corpo}</p>
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
