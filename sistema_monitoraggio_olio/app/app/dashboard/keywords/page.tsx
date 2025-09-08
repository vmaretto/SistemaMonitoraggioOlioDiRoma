

'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, Plus, Edit, Trash2, Eye, EyeOff } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

interface Keyword {
  id: string;
  keyword: string;
  category: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function KeywordsPage() {
  const [keywords, setKeywords] = useState<Keyword[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingKeyword, setEditingKeyword] = useState<Keyword | null>(null);
  const router = useRouter();

  // Form state
  const [formData, setFormData] = useState({
    keyword: '',
    category: 'primary'
  });

  useEffect(() => {
    fetchKeywords();
  }, []);

  const fetchKeywords = async () => {
    try {
      const response = await fetch('/api/keywords');
      const data = await response.json();
      setKeywords(data.keywords || []);
    } catch (error) {
      console.error('Errore caricamento keywords:', error);
    } finally {
      setLoading(false);
    }
  };

  const salvaKeyword = async () => {
    if (!formData.keyword.trim()) return;

    try {
      const method = editingKeyword ? 'PUT' : 'POST';
      const url = editingKeyword ? `/api/keywords/${editingKeyword.id}` : '/api/keywords';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        fetchKeywords();
        chiudiDialog();
      }
    } catch (error) {
      console.error('Errore salvataggio keyword:', error);
    }
  };

  const eliminaKeyword = async (id: string) => {
    try {
      const response = await fetch(`/api/keywords/${id}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        fetchKeywords();
      }
    } catch (error) {
      console.error('Errore eliminazione keyword:', error);
    }
  };

  const toggleAttivo = async (id: string, isActive: boolean) => {
    try {
      const response = await fetch(`/api/keywords/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ isActive })
      });

      if (response.ok) {
        fetchKeywords();
      }
    } catch (error) {
      console.error('Errore toggle keyword:', error);
    }
  };

  const apriDialog = (keyword?: Keyword) => {
    if (keyword) {
      setEditingKeyword(keyword);
      setFormData({
        keyword: keyword.keyword,
        category: keyword.category
      });
    } else {
      setEditingKeyword(null);
      setFormData({ keyword: '', category: 'primary' });
    }
    setIsDialogOpen(true);
  };

  const chiudiDialog = () => {
    setIsDialogOpen(false);
    setEditingKeyword(null);
    setFormData({ keyword: '', category: 'primary' });
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'primary': return 'bg-blue-100 text-blue-800';
      case 'secondary': return 'bg-green-100 text-green-800';
      case 'competitor': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case 'primary': return 'Primaria';
      case 'secondary': return 'Secondaria';
      case 'competitor': return 'Competitor';
      default: return category;
    }
  };

  const filteredKeywords = keywords.filter(keyword => {
    const matchesSearch = keyword.keyword.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = filterCategory === 'all' || keyword.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-64 mb-6"></div>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-20 bg-gray-200 rounded"></div>
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
          <h1 className="text-3xl font-bold tracking-tight">Gestione Keywords</h1>
          <p className="text-muted-foreground">
            Configura e gestisci le parole chiave da monitorare sui social media e web
          </p>
        </div>
        <div className="space-x-2">
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => apriDialog()}>
                <Plus className="h-4 w-4 mr-2" />
                Nuova Keyword
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingKeyword ? 'Modifica Keyword' : 'Nuova Keyword'}
                </DialogTitle>
                <DialogDescription>
                  {editingKeyword ? 'Modifica i dettagli della keyword selezionata' : 'Aggiungi una nuova parola chiave da monitorare'}
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="keyword" className="text-right">
                    Parola chiave
                  </Label>
                  <Input
                    id="keyword"
                    value={formData.keyword}
                    onChange={(e) => setFormData({...formData, keyword: e.target.value})}
                    className="col-span-3"
                    placeholder="es. Olio Roma"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="category" className="text-right">
                    Categoria
                  </Label>
                  <Select value={formData.category} onValueChange={(value) => setFormData({...formData, category: value})}>
                    <SelectTrigger className="col-span-3">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="primary">Primaria</SelectItem>
                      <SelectItem value="secondary">Secondaria</SelectItem>
                      <SelectItem value="competitor">Competitor</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button onClick={salvaKeyword}>
                  {editingKeyword ? 'Aggiorna' : 'Aggiungi'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cerca keywords..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger>
                <SelectValue placeholder="Filtra per categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tutte le categorie</SelectItem>
                <SelectItem value="primary">Primarie</SelectItem>
                <SelectItem value="secondary">Secondarie</SelectItem>
                <SelectItem value="competitor">Competitor</SelectItem>
              </SelectContent>
            </Select>
            <Button 
              onClick={() => {
                setSearchTerm('');
                setFilterCategory('all');
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
              <div className="h-2 w-2 rounded-full bg-blue-600 mr-2"></div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Primarie</p>
                <p className="text-2xl font-bold">
                  {keywords.filter(k => k.category === 'primary').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="h-2 w-2 rounded-full bg-green-600 mr-2"></div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Secondarie</p>
                <p className="text-2xl font-bold">
                  {keywords.filter(k => k.category === 'secondary').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="h-2 w-2 rounded-full bg-orange-600 mr-2"></div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Competitor</p>
                <p className="text-2xl font-bold">
                  {keywords.filter(k => k.category === 'competitor').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Eye className="h-4 w-4 text-blue-600 mr-2" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Attive</p>
                <p className="text-2xl font-bold">
                  {keywords.filter(k => k.isActive).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Info Collegamento */}
      <Card className="mb-6 border-blue-200 bg-blue-50">
        <CardContent className="p-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 rounded-full">
              <Search className="h-4 w-4 text-blue-600" />
            </div>
            <div className="flex-1">
              <h4 className="text-sm font-semibold text-blue-900">
                Collegamento con Contenuti Monitorati
              </h4>
              <p className="text-sm text-blue-700 mt-1">
                Solo le keywords <strong>ATTIVE</strong> vengono utilizzate per filtrare e analizzare i contenuti. 
                Cambiare lo stato di una keyword influenza immediatamente il monitoraggio.
              </p>
            </div>
            <Button 
              onClick={() => router.push('/dashboard/contenuti')}
              variant="outline" 
              size="sm"
              className="border-blue-300 text-blue-700 hover:bg-blue-100"
            >
              Vai ai Contenuti →
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Lista Keywords */}
      <div className="space-y-4">
        {filteredKeywords.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold">Nessuna keyword trovata</h3>
              <p className="text-muted-foreground">Non ci sono parole chiave che corrispondono ai filtri selezionati.</p>
            </CardContent>
          </Card>
        ) : (
          filteredKeywords.map((keyword) => (
            <Card key={keyword.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center space-x-2">
                      {keyword.isActive ? (
                        <Eye className="h-4 w-4 text-green-600" />
                      ) : (
                        <EyeOff className="h-4 w-4 text-gray-400" />
                      )}
                      <h3 className="text-lg font-semibold">{keyword.keyword}</h3>
                    </div>
                    <div className={`px-2 py-1 rounded-full text-xs font-medium ${getCategoryColor(keyword.category)}`}>
                      {getCategoryLabel(keyword.category)}
                    </div>
                    <Badge variant={keyword.isActive ? "default" : "secondary"}>
                      {keyword.isActive ? 'Attiva' : 'Disattivata'}
                    </Badge>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={keyword.isActive}
                      onCheckedChange={(checked) => toggleAttivo(keyword.id, checked)}
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => apriDialog(keyword)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline" size="sm">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Elimina Keyword</AlertDialogTitle>
                          <AlertDialogDescription>
                            Sei sicuro di voler eliminare la keyword "{keyword.keyword}"? Questa azione non può essere annullata.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Annulla</AlertDialogCancel>
                          <AlertDialogAction onClick={() => eliminaKeyword(keyword.id)}>
                            Elimina
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
                <CardDescription>
                  Aggiunta il {format(new Date(keyword.createdAt), 'PPp', { locale: it })}
                  {keyword.updatedAt !== keyword.createdAt && (
                    <span> • Modificata il {format(new Date(keyword.updatedAt), 'PPp', { locale: it })}</span>
                  )}
                </CardDescription>
              </CardHeader>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
