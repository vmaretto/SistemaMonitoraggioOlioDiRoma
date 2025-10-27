'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  Search, 
  Plus, 
  Eye, 
  Calendar,
  FileText,
  Activity,
  AlertCircle,
  CheckCircle,
  Clock,
  Filter,
  ChevronRight,
  MoreHorizontal
} from 'lucide-react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';

// Types
interface Report {
  id: string;
  title: string;
  description: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  _count: {
    actionLogs: number;
    inspections: number;
    clarificationRequests: number;
    authorityNotices: number;
    attachments: number;
  };
}

interface ReportsResponse {
  reports: Report[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  stats: {
    byStatus: Record<string, number>;
  };
}

// Status mappings
const STATUS_LABELS = {
  BOZZA: { label: 'Bozza', color: 'bg-gray-100 text-gray-800' },
  IN_LAVORAZIONE: { label: 'In Lavorazione', color: 'bg-yellow-100 text-yellow-800' },
  IN_VERIFICA: { label: 'In Verifica', color: 'bg-blue-100 text-blue-800' },
  RICHIESTA_CHIARIMENTI: { label: 'Richiesta Chiarimenti', color: 'bg-purple-100 text-purple-800' },
  SEGNALATO_AUTORITA: { label: 'Segnalato Autorità', color: 'bg-red-100 text-red-800' },
  CHIUSO: { label: 'Chiuso', color: 'bg-green-100 text-green-800' },
  ARCHIVIATO: { label: 'Archiviato', color: 'bg-gray-100 text-gray-800' }
};

const STATUS_ICONS = {
  BOZZA: <FileText className="h-4 w-4" />,
  IN_LAVORAZIONE: <Clock className="h-4 w-4" />,
  IN_VERIFICA: <Eye className="h-4 w-4" />,
  RICHIESTA_CHIARIMENTI: <AlertCircle className="h-4 w-4" />,
  SEGNALATO_AUTORITA: <FileText className="h-4 w-4" />,
  CHIUSO: <CheckCircle className="h-4 w-4" />,
  ARCHIVIATO: <FileText className="h-4 w-4" />
};

export default function ReportsPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // States
  const [reports, setReports] = useState<Report[]>([]);
  const [stats, setStats] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newReport, setNewReport] = useState({
    title: '',
    description: ''
  });

  // Load reports
  const loadReports = async () => {
    try {
      setLoading(true);
      
      const params = new URLSearchParams();
      if (selectedStatus && selectedStatus !== 'all') {
        params.append('status', selectedStatus);
      }
      if (searchTerm) {
        params.append('search', searchTerm);
      }

      const response = await fetch(`/api/reports?${params}`);
      const data: ReportsResponse = await response.json();
      
      if (response.ok) {
        setReports(data.reports);
        setStats(data.stats?.byStatus || {});
      } else {
        console.error('Errore caricamento report:', (data as any).error || 'Errore sconosciuto');
      }
    } catch (error) {
      console.error('Errore caricamento report:', error);
    } finally {
      setLoading(false);
    }
  };

  // Create new report
  const handleCreateReport = async () => {
    try {
      const response = await fetch('/api/reports', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newReport),
      });

      const data = await response.json();
      
      if (response.ok) {
        setIsCreateDialogOpen(false);
        setNewReport({ title: '', description: '' });
        loadReports(); // Ricarica la lista
        
        // Naviga al dettaglio del nuovo report
        router.push(`/dashboard/reports/${data.report.id}`);
      } else {
        console.error('Errore creazione report:', data.error);
      }
    } catch (error) {
      console.error('Errore creazione report:', error);
    }
  };

  // Format date
  const formatDate = (dateStr: string) => {
    return format(new Date(dateStr), "dd MMM yyyy 'alle' HH:mm", { locale: it });
  };

  // Effects
  useEffect(() => {
    // Sync with URL params
    const statusParam = searchParams.get('status') || 'all';
    setSelectedStatus(statusParam);
  }, [searchParams]);

  useEffect(() => {
    loadReports();
  }, [selectedStatus, searchTerm]);

  // Handle view report
  const handleViewReport = (reportId: string) => {
    router.push(`/dashboard/reports/${reportId}`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Tracciabilità Ispettori</h1>
          <p className="mt-2 text-gray-600">
            Gestione report per verifiche conformità e controlli di autenticità prodotti DOP/IGP
          </p>
        </div>
        
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Nuovo Report
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Crea Nuovo Report</DialogTitle>
              <DialogDescription>
                Inserisci i dettagli per creare un nuovo report di verifica.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label htmlFor="title">Titolo Report</Label>
                <Input
                  id="title"
                  value={newReport.title}
                  onChange={(e) => setNewReport({ ...newReport, title: e.target.value })}
                  placeholder="Es. Verifica etichettatura prodotto XYZ"
                />
              </div>
              <div>
                <Label htmlFor="description">Descrizione</Label>
                <Textarea
                  id="description"
                  value={newReport.description}
                  onChange={(e) => setNewReport({ ...newReport, description: e.target.value })}
                  placeholder="Descrivi il motivo della verifica e gli aspetti da controllare..."
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                Annulla
              </Button>
              <Button 
                onClick={handleCreateReport}
                disabled={!newReport.title.trim()}
              >
                Crea Report
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {Object.entries(STATUS_LABELS).map(([status, config]) => (
          <Card 
            key={status} 
            className={`cursor-pointer transition-all hover:scale-105 ${
              selectedStatus === status ? 'ring-2 ring-blue-500' : ''
            }`}
            onClick={() => setSelectedStatus(status)}
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-1">
                    {config.label}
                  </p>
                  <p className="text-2xl font-bold">
                    {stats[status] || 0}
                  </p>
                </div>
                <div className={`p-2 rounded-full ${config.color}`}>
                  {STATUS_ICONS[status as keyof typeof STATUS_ICONS]}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        <Card 
          className={`cursor-pointer transition-all hover:scale-105 ${
            selectedStatus === 'all' ? 'ring-2 ring-blue-500' : ''
          }`}
          onClick={() => setSelectedStatus('all')}
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">Tutti</p>
                <p className="text-2xl font-bold">
                  {Object.values(stats).reduce((a, b) => a + b, 0)}
                </p>
              </div>
              <div className="p-2 rounded-full bg-gray-100 text-gray-800">
                <FileText className="h-4 w-4" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Cerca report per titolo o descrizione..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="sm:w-64">
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Filtra per stato" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tutti gli stati</SelectItem>
                  {Object.entries(STATUS_LABELS).map(([status, config]) => (
                    <SelectItem key={status} value={status}>
                      {config.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button variant="outline" onClick={loadReports}>
              <Filter className="h-4 w-4 mr-2" />
              Aggiorna
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Reports Table */}
      <Card>
        <CardHeader>
          <CardTitle>
            Report ({reports.length})
          </CardTitle>
          <CardDescription>
            Lista completa dei report con stato attuale e ultima attività
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-2 text-gray-600">Caricamento report...</span>
            </div>
          ) : reports.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Nessun report trovato
              </h3>
              <p className="text-gray-600 mb-4">
                {searchTerm || selectedStatus !== 'all' 
                  ? 'Prova a modificare i filtri di ricerca'
                  : 'Inizia creando il tuo primo report di verifica'
                }
              </p>
              {!searchTerm && selectedStatus === 'all' && (
                <Button onClick={() => setIsCreateDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Crea Primo Report
                </Button>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Report</TableHead>
                  <TableHead>Stato</TableHead>
                  <TableHead>Ultima Azione</TableHead>
                  <TableHead>Creato</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reports.map((report) => {
                  const statusConfig = STATUS_LABELS[report.status as keyof typeof STATUS_LABELS];
                  return (
                    <TableRow 
                      key={report.id}
                      className="cursor-pointer hover:bg-gray-50"
                      onClick={() => handleViewReport(report.id)}
                    >
                      <TableCell>
                        <div className="font-mono text-sm text-gray-600">
                          {report.id.slice(0, 8)}...
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium text-gray-900">
                            {report.title}
                          </div>
                          <div className="text-sm text-gray-500 mt-1 max-w-md truncate">
                            {report.description}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={statusConfig.color}>
                          {statusConfig.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm text-gray-600">
                          Aggiornato {format(new Date(report.updatedAt), 'dd/MM', { locale: it })}
                          <div className="flex items-center space-x-2 mt-1 text-xs">
                            <span>{report._count.actionLogs} azioni</span>
                            {report._count.inspections > 0 && <span>• {report._count.inspections} sopralluoghi</span>}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-gray-600">
                        {formatDate(report.createdAt)}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleViewReport(report.id);
                          }}
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}