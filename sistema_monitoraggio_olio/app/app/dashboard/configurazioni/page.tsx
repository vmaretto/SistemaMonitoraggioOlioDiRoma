

'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Settings, Save, RotateCcw, Mail, Sliders, Shield, Bell, Users, Plus, Trash2, KeyRound, Edit } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { useSession } from 'next-auth/react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface Configurazione {
  id: string;
  chiave: string;
  valore: string;
  descrizione?: string;
  categoria: string;
  createdAt: string;
  updatedAt: string;
}

interface User {
  id: string;
  email: string;
  name: string | null;
  role: string;
  organization: string | null;
  createdAt: string;
  updatedAt: string;
}

export default function ConfigurazioniPage() {
  const { data: session } = useSession();
  const [configurazioni, setConfigurazioni] = useState<Configurazione[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const router = useRouter();

  // Stato per le configurazioni locali
  const [localConfig, setLocalConfig] = useState<{ [key: string]: string }>({});

  // Stato per gestione utenti
  const [users, setUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showResetPasswordDialog, setShowResetPasswordDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [tempPassword, setTempPassword] = useState<string | null>(null);
  const [userFormError, setUserFormError] = useState<string | null>(null);
  const [savingUser, setSavingUser] = useState(false);

  // Form nuovo utente
  const [newUserForm, setNewUserForm] = useState({
    email: '',
    name: '',
    password: '',
    role: 'USER',
    organization: ''
  });

  // Form modifica utente
  const [editUserForm, setEditUserForm] = useState({
    name: '',
    role: 'USER',
    organization: ''
  });

  const isAdmin = session?.user?.role === 'ADMIN';

  useEffect(() => {
    fetchConfigurazioni();
    if (isAdmin) {
      fetchUsers();
    }
  }, [isAdmin]);

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

  const fetchUsers = async () => {
    setLoadingUsers(true);
    try {
      const response = await fetch('/api/users');
      const data = await response.json();
      if (data.users) {
        setUsers(data.users);
      }
    } catch (error) {
      console.error('Errore caricamento utenti:', error);
    } finally {
      setLoadingUsers(false);
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

  // Funzioni gestione utenti
  const createUser = async () => {
    setUserFormError(null);
    setSavingUser(true);
    try {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newUserForm)
      });

      const data = await response.json();

      if (!response.ok) {
        setUserFormError(data.error || 'Errore nella creazione utente');
        return;
      }

      setShowCreateDialog(false);
      setNewUserForm({ email: '', name: '', password: '', role: 'USER', organization: '' });
      fetchUsers();
    } catch (error) {
      setUserFormError('Errore di connessione');
    } finally {
      setSavingUser(false);
    }
  };

  const updateUser = async () => {
    if (!selectedUser) return;
    setUserFormError(null);
    setSavingUser(true);
    try {
      const response = await fetch(`/api/users/${selectedUser.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editUserForm)
      });

      const data = await response.json();

      if (!response.ok) {
        setUserFormError(data.error || 'Errore nella modifica utente');
        return;
      }

      setShowEditDialog(false);
      setSelectedUser(null);
      fetchUsers();
    } catch (error) {
      setUserFormError('Errore di connessione');
    } finally {
      setSavingUser(false);
    }
  };

  const resetPassword = async () => {
    if (!selectedUser) return;
    setSavingUser(true);
    try {
      const response = await fetch(`/api/users/${selectedUser.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resetPassword: true })
      });

      const data = await response.json();

      if (response.ok && data.tempPassword) {
        setTempPassword(data.tempPassword);
      } else {
        setUserFormError(data.error || 'Errore nel reset password');
      }
    } catch (error) {
      setUserFormError('Errore di connessione');
    } finally {
      setSavingUser(false);
    }
  };

  const deleteUser = async () => {
    if (!selectedUser) return;
    setSavingUser(true);
    try {
      const response = await fetch(`/api/users/${selectedUser.id}`, {
        method: 'DELETE'
      });

      const data = await response.json();

      if (!response.ok) {
        setUserFormError(data.error || 'Errore nella eliminazione utente');
        setShowDeleteDialog(false);
        return;
      }

      setShowDeleteDialog(false);
      setSelectedUser(null);
      fetchUsers();
    } catch (error) {
      setUserFormError('Errore di connessione');
    } finally {
      setSavingUser(false);
    }
  };

  const openEditDialog = (user: User) => {
    setSelectedUser(user);
    setEditUserForm({
      name: user.name || '',
      role: user.role,
      organization: user.organization || ''
    });
    setUserFormError(null);
    setShowEditDialog(true);
  };

  const openResetPasswordDialog = (user: User) => {
    setSelectedUser(user);
    setTempPassword(null);
    setUserFormError(null);
    setShowResetPasswordDialog(true);
  };

  const openDeleteDialog = (user: User) => {
    setSelectedUser(user);
    setUserFormError(null);
    setShowDeleteDialog(true);
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'ADMIN': return 'bg-red-100 text-red-800';
      case 'INSPECTOR': return 'bg-purple-100 text-purple-800';
      case 'ANALYST': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'ADMIN': return 'Amministratore';
      case 'INSPECTOR': return 'Ispettore';
      case 'ANALYST': return 'Analista';
      case 'USER': return 'Operatore';
      default: return role;
    }
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

      <Tabs defaultValue={isAdmin ? 'utenti' : categorieUniche[0]} className="space-y-6">
        <TabsList>
          {isAdmin && (
            <TabsTrigger value="utenti" className="flex items-center space-x-2">
              <Users className="h-4 w-4 text-indigo-600" />
              <span>Utenti</span>
            </TabsTrigger>
          )}
          {categorieUniche.map(categoria => (
            <TabsTrigger key={categoria} value={categoria} className="flex items-center space-x-2">
              {getCategoriaIcon(categoria)}
              <span>{categoria.charAt(0).toUpperCase() + categoria.slice(1)}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        {/* Tab Utenti - Solo per ADMIN */}
        {isAdmin && (
          <TabsContent value="utenti" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center">
                      <Users className="h-5 w-5 mr-2 text-indigo-600" />
                      Gestione Utenti
                    </CardTitle>
                    <CardDescription>
                      Crea, modifica ed elimina utenti del sistema
                    </CardDescription>
                  </div>
                  <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
                    <DialogTrigger asChild>
                      <Button onClick={() => {
                        setNewUserForm({ email: '', name: '', password: '', role: 'USER', organization: '' });
                        setUserFormError(null);
                      }}>
                        <Plus className="h-4 w-4 mr-2" />
                        Nuovo Utente
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Crea Nuovo Utente</DialogTitle>
                        <DialogDescription>
                          Inserisci i dati del nuovo utente. La password deve avere almeno 6 caratteri.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label htmlFor="email">Email *</Label>
                          <Input
                            id="email"
                            type="email"
                            value={newUserForm.email}
                            onChange={(e) => setNewUserForm({ ...newUserForm, email: e.target.value })}
                            placeholder="email@esempio.it"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="name">Nome</Label>
                          <Input
                            id="name"
                            value={newUserForm.name}
                            onChange={(e) => setNewUserForm({ ...newUserForm, name: e.target.value })}
                            placeholder="Nome completo"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="password">Password *</Label>
                          <Input
                            id="password"
                            type="password"
                            value={newUserForm.password}
                            onChange={(e) => setNewUserForm({ ...newUserForm, password: e.target.value })}
                            placeholder="Almeno 6 caratteri"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="role">Ruolo *</Label>
                          <Select
                            value={newUserForm.role}
                            onValueChange={(value) => setNewUserForm({ ...newUserForm, role: value })}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Seleziona ruolo" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="USER">Operatore</SelectItem>
                              <SelectItem value="ANALYST">Analista</SelectItem>
                              <SelectItem value="INSPECTOR">Ispettore</SelectItem>
                              <SelectItem value="ADMIN">Amministratore</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="organization">Organizzazione</Label>
                          <Input
                            id="organization"
                            value={newUserForm.organization}
                            onChange={(e) => setNewUserForm({ ...newUserForm, organization: e.target.value })}
                            placeholder="Nome organizzazione"
                          />
                        </div>
                        {userFormError && (
                          <p className="text-sm text-red-600">{userFormError}</p>
                        )}
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                          Annulla
                        </Button>
                        <Button onClick={createUser} disabled={savingUser}>
                          {savingUser ? 'Creazione...' : 'Crea Utente'}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                {loadingUsers ? (
                  <div className="animate-pulse space-y-2">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="h-12 bg-gray-200 rounded"></div>
                    ))}
                  </div>
                ) : users.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">
                    Nessun utente trovato
                  </p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Email</TableHead>
                        <TableHead>Nome</TableHead>
                        <TableHead>Ruolo</TableHead>
                        <TableHead>Organizzazione</TableHead>
                        <TableHead>Creato il</TableHead>
                        <TableHead className="text-right">Azioni</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users.map((user) => (
                        <TableRow key={user.id}>
                          <TableCell className="font-medium">{user.email}</TableCell>
                          <TableCell>{user.name || '-'}</TableCell>
                          <TableCell>
                            <Badge className={getRoleBadgeColor(user.role)}>
                              {getRoleLabel(user.role)}
                            </Badge>
                          </TableCell>
                          <TableCell>{user.organization || '-'}</TableCell>
                          <TableCell>
                            {format(new Date(user.createdAt), 'dd/MM/yyyy', { locale: it })}
                          </TableCell>
                          <TableCell className="text-right space-x-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openEditDialog(user)}
                              title="Modifica utente"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openResetPasswordDialog(user)}
                              title="Reset password"
                            >
                              <KeyRound className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openDeleteDialog(user)}
                              title="Elimina utente"
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>

            {/* Dialog Modifica Utente */}
            <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Modifica Utente</DialogTitle>
                  <DialogDescription>
                    Modifica i dati dell&apos;utente {selectedUser?.email}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-name">Nome</Label>
                    <Input
                      id="edit-name"
                      value={editUserForm.name}
                      onChange={(e) => setEditUserForm({ ...editUserForm, name: e.target.value })}
                      placeholder="Nome completo"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-role">Ruolo</Label>
                    <Select
                      value={editUserForm.role}
                      onValueChange={(value) => setEditUserForm({ ...editUserForm, role: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleziona ruolo" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="USER">Operatore</SelectItem>
                        <SelectItem value="ANALYST">Analista</SelectItem>
                        <SelectItem value="INSPECTOR">Ispettore</SelectItem>
                        <SelectItem value="ADMIN">Amministratore</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-organization">Organizzazione</Label>
                    <Input
                      id="edit-organization"
                      value={editUserForm.organization}
                      onChange={(e) => setEditUserForm({ ...editUserForm, organization: e.target.value })}
                      placeholder="Nome organizzazione"
                    />
                  </div>
                  {userFormError && (
                    <p className="text-sm text-red-600">{userFormError}</p>
                  )}
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowEditDialog(false)}>
                    Annulla
                  </Button>
                  <Button onClick={updateUser} disabled={savingUser}>
                    {savingUser ? 'Salvataggio...' : 'Salva Modifiche'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* Dialog Reset Password */}
            <Dialog open={showResetPasswordDialog} onOpenChange={(open) => {
              setShowResetPasswordDialog(open);
              if (!open) setTempPassword(null);
            }}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Reset Password</DialogTitle>
                  <DialogDescription>
                    {tempPassword
                      ? 'Password resettata con successo. Comunica la nuova password temporanea all\'utente.'
                      : `Vuoi resettare la password per ${selectedUser?.email}?`
                    }
                  </DialogDescription>
                </DialogHeader>
                {tempPassword ? (
                  <div className="py-4">
                    <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                      <p className="text-sm text-green-800 mb-2">Nuova password temporanea:</p>
                      <p className="font-mono text-lg font-bold text-green-900 select-all">
                        {tempPassword}
                      </p>
                    </div>
                    <p className="text-sm text-muted-foreground mt-4">
                      L&apos;utente dovrà utilizzare questa password al prossimo accesso.
                    </p>
                  </div>
                ) : (
                  <div className="py-4">
                    <p className="text-sm text-muted-foreground">
                      Verrà generata una nuova password temporanea che dovrai comunicare all&apos;utente.
                    </p>
                    {userFormError && (
                      <p className="text-sm text-red-600 mt-2">{userFormError}</p>
                    )}
                  </div>
                )}
                <DialogFooter>
                  {tempPassword ? (
                    <Button onClick={() => {
                      setShowResetPasswordDialog(false);
                      setTempPassword(null);
                    }}>
                      Chiudi
                    </Button>
                  ) : (
                    <>
                      <Button variant="outline" onClick={() => setShowResetPasswordDialog(false)}>
                        Annulla
                      </Button>
                      <Button onClick={resetPassword} disabled={savingUser}>
                        {savingUser ? 'Reset in corso...' : 'Reset Password'}
                      </Button>
                    </>
                  )}
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* Dialog Conferma Eliminazione */}
            <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Conferma Eliminazione</AlertDialogTitle>
                  <AlertDialogDescription>
                    Sei sicuro di voler eliminare l&apos;utente <strong>{selectedUser?.email}</strong>?
                    Questa azione non può essere annullata.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Annulla</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={deleteUser}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    {savingUser ? 'Eliminazione...' : 'Elimina'}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </TabsContent>
        )}

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
