'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
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
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { 
  ArrowLeft,
  Calendar,
  User,
  Activity,
  FileText,
  Eye,
  MapPin,
  MessageCircle,
  Building,
  Paperclip,
  Plus,
  Edit,
  Trash2,
  Download,
  Send,
  CheckCircle,
  AlertTriangle,
  Clock,
  ChevronRight
} from 'lucide-react';
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

interface ActionLog {
  id: string;
  type: string;
  message: string;
  createdAt: string;
  actorId: string;
  meta: any;
}

interface Inspection {
  id: string;
  date: string;
  location: string;
  minutesText?: string;
  outcome?: string;
  createdAt: string;
}

interface ClarificationRequest {
  id: string;
  question: string;
  feedback?: string;
  requestedAt: string;
  feedbackAt?: string;
  dueAt?: string;
}

interface AuthorityNotice {
  id: string;
  authority: string;
  protocol?: string;
  feedback?: string;
  sentAt: string;
  feedbackAt?: string;
}

interface Attachment {
  id: string;
  filename: string;
  url: string;
  entityType: string;
  entityId: string;
  uploadedAt: string;
  uploadedBy: string;
}

interface ReportDetail {
  report: Report;
  actionLogs: ActionLog[];
  inspections: Inspection[];
  clarificationRequests: ClarificationRequest[];
  authorityNotices: AuthorityNotice[];
  attachments: Attachment[];
  availableTransitions: string[];
}

// Status configuration
const STATUS_LABELS = {
  ANALISI: { label: 'In Analisi', color: 'bg-yellow-100 text-yellow-800' },
  IN_CONTROLLO: { label: 'In Controllo', color: 'bg-blue-100 text-blue-800' },
  VERIFICA_SOPRALLUOGO: { label: 'Verifica Sopralluogo', color: 'bg-orange-100 text-orange-800' },
  VERIFICA_CHIARIMENTI: { label: 'Verifica Chiarimenti', color: 'bg-purple-100 text-purple-800' },
  SEGNALATA_A_ENTE: { label: 'Segnalata a Ente', color: 'bg-red-100 text-red-800' },
  IN_ATTESA_FEEDBACK_ENTE: { label: 'In Attesa Feedback', color: 'bg-red-100 text-red-800' },
  CHIUSA: { label: 'Chiusa', color: 'bg-green-100 text-green-800' },
  ARCHIVIATA: { label: 'Archiviata', color: 'bg-gray-100 text-gray-800' }
};

const ACTION_TYPE_LABELS = {
  'CREAZIONE': 'Report creato',
  'TRANSIZIONE': 'Cambio stato',
  'SOPRALLUOGO': 'Sopralluogo registrato',
  'RICHIESTA_CHIARIMENTI': 'Chiarimenti richiesti',
  'FEEDBACK_CHIARIMENTI': 'Feedback ricevuto',
  'INVIO_A_ENTE': 'Segnalato a ente',
  'FEEDBACK_ENTE': 'Feedback ente',
  'CHIUSURA': 'Report chiuso',
  'ALLEGATO_AGGIUNTO': 'Allegato aggiunto',
  'ALLEGATO_RIMOSSO': 'Allegato rimosso'
};

export default function ReportDetailPage() {
  const { data: session } = useSession();
  const params = useParams();
  const router = useRouter();
  const reportId = params.id as string;
  
  // States
  const [reportDetail, setReportDetail] = useState<ReportDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('timeline');
  
  // Dialog states
  const [isTransitionDialogOpen, setIsTransitionDialogOpen] = useState(false);
  const [isInspectionDialogOpen, setIsInspectionDialogOpen] = useState(false);
  const [isClarificationDialogOpen, setIsClarificationDialogOpen] = useState(false);
  const [isAuthorityDialogOpen, setIsAuthorityDialogOpen] = useState(false);
  
  // Form states
  const [transitionForm, setTransitionForm] = useState({ to: '', note: '' });
  const [inspectionForm, setInspectionForm] = useState({
    date: '',
    location: '',
    minutesText: '',
    outcome: ''
  });
  const [clarificationForm, setClarificationForm] = useState({
    question: '',
    dueAt: ''
  });
  const [authorityForm, setAuthorityForm] = useState({
    authority: '',
    protocol: '',
    note: ''
  });

  // Load report detail
  const loadReportDetail = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/reports/${reportId}`);
      const data = await response.json();
      
      if (response.ok) {
        setReportDetail(data);
      } else {
        console.error('Errore caricamento dettaglio report:', (data as any).error);
      }
    } catch (error) {
      console.error('Errore caricamento dettaglio report:', error);
    } finally {
      setLoading(false);
    }
  };

  // Handle state transition
  const handleTransition = async () => {
    try {
      const response = await fetch(`/api/reports/${reportId}/transition`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(transitionForm),
      });

      if (response.ok) {
        setIsTransitionDialogOpen(false);
        setTransitionForm({ to: '', note: '' });
        loadReportDetail();
      } else {
        const error = await response.json();
        console.error('Errore transizione:', error);
      }
    } catch (error) {
      console.error('Errore transizione:', error);
    }
  };

  // Handle new inspection
  const handleCreateInspection = async () => {
    try {
      const response = await fetch(`/api/reports/${reportId}/inspections`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(inspectionForm),
      });

      if (response.ok) {
        setIsInspectionDialogOpen(false);
        setInspectionForm({ date: '', location: '', minutesText: '', outcome: '' });
        loadReportDetail();
      } else {
        const error = await response.json();
        console.error('Errore creazione sopralluogo:', error);
      }
    } catch (error) {
      console.error('Errore creazione sopralluogo:', error);
    }
  };

  // Handle clarification request
  const handleCreateClarification = async () => {
    try {
      const response = await fetch(`/api/reports/${reportId}/clarifications`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(clarificationForm),
      });

      if (response.ok) {
        setIsClarificationDialogOpen(false);
        setClarificationForm({ question: '', dueAt: '' });
        loadReportDetail();
      } else {
        const error = await response.json();
        console.error('Errore richiesta chiarimenti:', error);
      }
    } catch (error) {
      console.error('Errore richiesta chiarimenti:', error);
    }
  };

  // Handle authority notice
  const handleCreateAuthorityNotice = async () => {
    try {
      const response = await fetch(`/api/reports/${reportId}/authority-notices`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(authorityForm),
      });

      if (response.ok) {
        setIsAuthorityDialogOpen(false);
        setAuthorityForm({ authority: '', protocol: '', note: '' });
        loadReportDetail();
      } else {
        const error = await response.json();
        console.error('Errore segnalazione ente:', error);
      }
    } catch (error) {
      console.error('Errore segnalazione ente:', error);
    }
  };

  // Format date
  const formatDate = (dateStr: string) => {
    return format(new Date(dateStr), "dd MMM yyyy 'alle' HH:mm", { locale: it });
  };

  const formatDateOnly = (dateStr: string) => {
    return format(new Date(dateStr), "dd MMM yyyy", { locale: it });
  };

  // Effect
  useEffect(() => {
    if (reportId) {
      loadReportDetail();
    }
  }, [reportId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Caricamento dettaglio report...</span>
      </div>
    );
  }

  if (!reportDetail) {
    return (
      <div className="text-center py-12">
        <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Report non trovato</h3>
        <p className="text-gray-600 mb-4">Il report richiesto non esiste o non è accessibile.</p>
        <Button onClick={() => router.push('/dashboard/reports')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Torna alla Lista
        </Button>
      </div>
    );
  }

  const { report, actionLogs, inspections, clarificationRequests, authorityNotices, attachments, availableTransitions } = reportDetail;
  const statusConfig = STATUS_LABELS[report.status as keyof typeof STATUS_LABELS];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push('/dashboard/reports')}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Lista Report
          </Button>
          <Separator orientation="vertical" className="h-6" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{report.title}</h1>
            <p className="text-gray-600">{report.description}</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-3">
          <Badge className={statusConfig.color}>
            {statusConfig.label}
          </Badge>
          
          {availableTransitions.length > 0 && (
            <Dialog open={isTransitionDialogOpen} onOpenChange={setIsTransitionDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Edit className="h-4 w-4 mr-2" />
                  Cambia Stato
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Cambia Stato Report</DialogTitle>
                  <DialogDescription>
                    Seleziona il nuovo stato e aggiungi eventuali note.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div>
                    <Label>Nuovo Stato</Label>
                    <Select value={transitionForm.to} onValueChange={(value) => setTransitionForm({ ...transitionForm, to: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleziona nuovo stato" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableTransitions.map((status) => (
                          <SelectItem key={status} value={status}>
                            {STATUS_LABELS[status as keyof typeof STATUS_LABELS]?.label || status}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Note</Label>
                    <Textarea
                      value={transitionForm.note}
                      onChange={(e) => setTransitionForm({ ...transitionForm, note: e.target.value })}
                      placeholder="Motivazione del cambio stato..."
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsTransitionDialogOpen(false)}>
                    Annulla
                  </Button>
                  <Button 
                    onClick={handleTransition}
                    disabled={!transitionForm.to}
                  >
                    Conferma Transizione
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Azioni</p>
                <p className="text-xl font-bold">{report._count.actionLogs}</p>
              </div>
              <Activity className="h-5 w-5 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Sopralluoghi</p>
                <p className="text-xl font-bold">{report._count.inspections}</p>
              </div>
              <MapPin className="h-5 w-5 text-orange-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Chiarimenti</p>
                <p className="text-xl font-bold">{report._count.clarificationRequests}</p>
              </div>
              <MessageCircle className="h-5 w-5 text-purple-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Segnalazioni</p>
                <p className="text-xl font-bold">{report._count.authorityNotices}</p>
              </div>
              <Building className="h-5 w-5 text-red-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Allegati</p>
                <p className="text-xl font-bold">{report._count.attachments}</p>
              </div>
              <Paperclip className="h-5 w-5 text-gray-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
          <TabsTrigger value="inspections">Sopralluoghi</TabsTrigger>
          <TabsTrigger value="clarifications">Chiarimenti</TabsTrigger>
          <TabsTrigger value="authorities">Enti</TabsTrigger>
          <TabsTrigger value="attachments">Allegati</TabsTrigger>
        </TabsList>

        {/* Timeline Tab */}
        <TabsContent value="timeline">
          <Card>
            <CardHeader>
              <CardTitle>Timeline Attività</CardTitle>
              <CardDescription>
                Cronologia completa di tutte le azioni eseguite su questo report
              </CardDescription>
            </CardHeader>
            <CardContent>
              {actionLogs.length === 0 ? (
                <div className="text-center py-8">
                  <Activity className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-600">Nessuna attività registrata</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {actionLogs.map((log, index) => (
                    <div key={log.id} className="flex items-start space-x-3">
                      <div className="flex-shrink-0">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                          <Activity className="h-4 w-4 text-blue-600" />
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium text-gray-900">
                            {ACTION_TYPE_LABELS[log.type as keyof typeof ACTION_TYPE_LABELS] || log.type}
                          </p>
                          <p className="text-xs text-gray-500">
                            {formatDate(log.createdAt)}
                          </p>
                        </div>
                        <p className="text-sm text-gray-600 mt-1">
                          {log.message}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Inspections Tab */}
        <TabsContent value="inspections">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Sopralluoghi</CardTitle>
                <CardDescription>
                  Sopralluoghi effettuati per questo report
                </CardDescription>
              </div>
              <Dialog open={isInspectionDialogOpen} onOpenChange={setIsInspectionDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Nuovo Sopralluogo
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Registra Sopralluogo</DialogTitle>
                    <DialogDescription>
                      Inserisci i dettagli del sopralluogo effettuato.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Data e Ora</Label>
                        <Input
                          type="datetime-local"
                          value={inspectionForm.date}
                          onChange={(e) => setInspectionForm({ ...inspectionForm, date: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label>Località</Label>
                        <Input
                          value={inspectionForm.location}
                          onChange={(e) => setInspectionForm({ ...inspectionForm, location: e.target.value })}
                          placeholder="Es. Frantoio XYZ - Via Roma 123"
                        />
                      </div>
                    </div>
                    <div>
                      <Label>Verbale Sopralluogo</Label>
                      <Textarea
                        value={inspectionForm.minutesText}
                        onChange={(e) => setInspectionForm({ ...inspectionForm, minutesText: e.target.value })}
                        placeholder="Descrivi dettagliatamente le verifiche effettuate, i risultati e le eventuali non conformità riscontrate..."
                        rows={6}
                      />
                    </div>
                    <div>
                      <Label>Esito</Label>
                      <Input
                        value={inspectionForm.outcome}
                        onChange={(e) => setInspectionForm({ ...inspectionForm, outcome: e.target.value })}
                        placeholder="Es. CONFORME - Nessuna irregolarità riscontrata"
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsInspectionDialogOpen(false)}>
                      Annulla
                    </Button>
                    <Button onClick={handleCreateInspection}>
                      Registra Sopralluogo
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {inspections.length === 0 ? (
                <div className="text-center py-8">
                  <MapPin className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-600">Nessun sopralluogo registrato</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {inspections.map((inspection) => (
                    <Card key={inspection.id} className="border-l-4 border-l-orange-500">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-2">
                              <MapPin className="h-4 w-4 text-orange-600" />
                              <span className="font-medium">{inspection.location}</span>
                              <span className="text-sm text-gray-500">
                                {formatDate(inspection.date)}
                              </span>
                            </div>
                            {inspection.minutesText && (
                              <p className="text-sm text-gray-700 mb-2">
                                {inspection.minutesText}
                              </p>
                            )}
                            {inspection.outcome && (
                              <div className="inline-flex items-center px-2 py-1 rounded text-xs bg-green-100 text-green-800">
                                {inspection.outcome}
                              </div>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Clarifications Tab */}
        <TabsContent value="clarifications">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Richieste Chiarimenti</CardTitle>
                <CardDescription>
                  Richieste di chiarimenti e relative risposte
                </CardDescription>
              </div>
              <Dialog open={isClarificationDialogOpen} onOpenChange={setIsClarificationDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Richiedi Chiarimenti
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Richiesta Chiarimenti</DialogTitle>
                    <DialogDescription>
                      Inserisci la richiesta di chiarimenti da inviare.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div>
                      <Label>Domanda</Label>
                      <Textarea
                        value={clarificationForm.question}
                        onChange={(e) => setClarificationForm({ ...clarificationForm, question: e.target.value })}
                        placeholder="Descrivi chiaramente quali chiarimenti sono necessari..."
                        rows={4}
                      />
                    </div>
                    <div>
                      <Label>Scadenza (opzionale)</Label>
                      <Input
                        type="datetime-local"
                        value={clarificationForm.dueAt}
                        onChange={(e) => setClarificationForm({ ...clarificationForm, dueAt: e.target.value })}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsClarificationDialogOpen(false)}>
                      Annulla
                    </Button>
                    <Button onClick={handleCreateClarification}>
                      Invia Richiesta
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {clarificationRequests.length === 0 ? (
                <div className="text-center py-8">
                  <MessageCircle className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-600">Nessuna richiesta di chiarimenti</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {clarificationRequests.map((clarification) => (
                    <Card key={clarification.id} className="border-l-4 border-l-purple-500">
                      <CardContent className="p-4">
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-500">
                              Richiesta del {formatDate(clarification.requestedAt)}
                            </span>
                            {clarification.dueAt && (
                              <span className="text-xs px-2 py-1 bg-yellow-100 text-yellow-800 rounded">
                                Scadenza: {formatDateOnly(clarification.dueAt)}
                              </span>
                            )}
                          </div>
                          <p className="text-gray-800">{clarification.question}</p>
                          {clarification.feedback ? (
                            <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded">
                              <div className="flex items-center space-x-2 mb-2">
                                <CheckCircle className="h-4 w-4 text-green-600" />
                                <span className="text-sm font-medium text-green-800">
                                  Risposta del {formatDate(clarification.feedbackAt!)}
                                </span>
                              </div>
                              <p className="text-green-700">{clarification.feedback}</p>
                            </div>
                          ) : (
                            <div className="flex items-center space-x-2 text-yellow-600">
                              <Clock className="h-4 w-4" />
                              <span className="text-sm">In attesa di risposta</span>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Authority Notices Tab */}
        <TabsContent value="authorities">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Segnalazioni Enti</CardTitle>
                <CardDescription>
                  Segnalazioni inviate alle autorità competenti
                </CardDescription>
              </div>
              <Dialog open={isAuthorityDialogOpen} onOpenChange={setIsAuthorityDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Segnala a Ente
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Segnalazione Ente</DialogTitle>
                    <DialogDescription>
                      Invia una segnalazione all'autorità competente.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div>
                      <Label>Ente/Autorità</Label>
                      <Input
                        value={authorityForm.authority}
                        onChange={(e) => setAuthorityForm({ ...authorityForm, authority: e.target.value })}
                        placeholder="Es. ICQRF, Ministero dell'Agricoltura, Comune di Roma..."
                      />
                    </div>
                    <div>
                      <Label>Numero Protocollo (opzionale)</Label>
                      <Input
                        value={authorityForm.protocol}
                        onChange={(e) => setAuthorityForm({ ...authorityForm, protocol: e.target.value })}
                        placeholder="Es. PROT-2025-001234"
                      />
                    </div>
                    <div>
                      <Label>Note aggiuntive</Label>
                      <Textarea
                        value={authorityForm.note}
                        onChange={(e) => setAuthorityForm({ ...authorityForm, note: e.target.value })}
                        placeholder="Eventuali note aggiuntive per la segnalazione..."
                        rows={3}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsAuthorityDialogOpen(false)}>
                      Annulla
                    </Button>
                    <Button onClick={handleCreateAuthorityNotice}>
                      Invia Segnalazione
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {authorityNotices.length === 0 ? (
                <div className="text-center py-8">
                  <Building className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-600">Nessuna segnalazione a enti</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {authorityNotices.map((notice) => (
                    <Card key={notice.id} className="border-l-4 border-l-red-500">
                      <CardContent className="p-4">
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              <Building className="h-4 w-4 text-red-600" />
                              <span className="font-medium">{notice.authority}</span>
                            </div>
                            <span className="text-sm text-gray-500">
                              {formatDate(notice.sentAt)}
                            </span>
                          </div>
                          {notice.protocol && (
                            <p className="text-sm text-gray-600">
                              Protocollo: {notice.protocol}
                            </p>
                          )}
                          {notice.feedback ? (
                            <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded">
                              <div className="flex items-center space-x-2 mb-2">
                                <CheckCircle className="h-4 w-4 text-blue-600" />
                                <span className="text-sm font-medium text-blue-800">
                                  Feedback del {formatDate(notice.feedbackAt!)}
                                </span>
                              </div>
                              <p className="text-blue-700">{notice.feedback}</p>
                            </div>
                          ) : (
                            <div className="flex items-center space-x-2 text-orange-600">
                              <Clock className="h-4 w-4" />
                              <span className="text-sm">In attesa di feedback</span>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Attachments Tab */}
        <TabsContent value="attachments">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Allegati</CardTitle>
                <CardDescription>
                  Documenti e file allegati a questo report
                </CardDescription>
              </div>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Aggiungi Allegato
              </Button>
            </CardHeader>
            <CardContent>
              {attachments.length === 0 ? (
                <div className="text-center py-8">
                  <Paperclip className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-600">Nessun allegato</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {attachments.map((attachment) => (
                    <div key={attachment.id} className="flex items-center justify-between p-3 border rounded">
                      <div className="flex items-center space-x-3">
                        <Paperclip className="h-4 w-4 text-gray-600" />
                        <div>
                          <p className="text-sm font-medium">{attachment.filename}</p>
                          <p className="text-xs text-gray-500">
                            Caricato il {formatDate(attachment.uploadedAt)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button variant="ghost" size="sm">
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}