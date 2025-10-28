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

// Import dei componenti migliorati
import { AttachmentManager, AttachmentFile } from '@/components/reports/attachment-manager';
import { StateTransitionDialog, StateTransitionData } from '@/components/reports/state-transition-dialog';

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
  originalName: string;
  mimeType: string;
  size: number;
  url: string;
  tipo?: string;
  descrizione?: string;
  tags?: string[];
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
const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  BOZZA: { label: 'Bozza', color: 'bg-gray-100 text-gray-800' },
  IN_LAVORAZIONE: { label: 'In Lavorazione', color: 'bg-blue-100 text-blue-800' },
  IN_VERIFICA: { label: 'In Verifica', color: 'bg-orange-100 text-orange-800' },
  RICHIESTA_CHIARIMENTI: { label: 'Richiesta Chiarimenti', color: 'bg-purple-100 text-purple-800' },
  SEGNALATO_AUTORITA: { label: 'Segnalato ad Autorità', color: 'bg-red-100 text-red-800' },
  CHIUSO: { label: 'Chiuso', color: 'bg-green-100 text-green-800' },
  ARCHIVIATO: { label: 'Archiviato', color: 'bg-gray-100 text-gray-800' }
};

const ACTION_TYPE_LABELS = {
  'CREAZIONE': 'Report creato',
  'TRANSIZIONE': 'Cambio stato',
  'TRANSIZIONE_STATO': 'Cambio stato',
  'SOPRALLUOGO': 'Sopralluogo registrato',
  'RICHIESTA_CHIARIMENTI': 'Chiarimenti richiesti',
  'FEEDBACK_CHIARIMENTI': 'Feedback ricevuto',
  'INVIO_A_ENTE': 'Segnalato a ente',
  'FEEDBACK_ENTE': 'Feedback ente',
  'CHIUSURA': 'Report chiuso',
  'ALLEGATO_AGGIUNTO': 'Allegato aggiunto',
  'ALLEGATO_RIMOSSO': 'Allegato rimosso',
  'ALLEGATO_MODIFICATO': 'Allegato modificato'
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

  // State transition dialog
  const [isTransitionDialogOpen, setIsTransitionDialogOpen] = useState(false);
  const [targetTransitionStatus, setTargetTransitionStatus] = useState<string | null>(null);

  // Attachments
  const [attachments, setAttachments] = useState<AttachmentFile[]>([]);

  // Dialog states per vecchie funzionalità legacy
  const [isInspectionDialogOpen, setIsInspectionDialogOpen] = useState(false);
  const [isClarificationDialogOpen, setIsClarificationDialogOpen] = useState(false);
  const [isAuthorityDialogOpen, setIsAuthorityDialogOpen] = useState(false);

  // Form states legacy
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

        // Converti gli allegati nel formato atteso da AttachmentManager
        const convertedAttachments: AttachmentFile[] = (data.attachments || []).map((att: Attachment) => ({
          id: att.id,
          filename: att.filename,
          originalName: att.originalName || att.filename,
          mimeType: att.mimeType || 'application/octet-stream',
          size: att.size || 0,
          url: att.url,
          tipo: att.tipo,
          descrizione: att.descrizione,
          tags: att.tags,
          uploadedAt: new Date(att.uploadedAt),
          uploadedBy: att.uploadedBy
        }));
        setAttachments(convertedAttachments);
      } else {
        console.error('Errore caricamento dettaglio report:', (data as any).error);
      }
    } catch (error) {
      console.error('Errore caricamento dettaglio report:', error);
    } finally {
      setLoading(false);
    }
  };

  // Handle state transition con nuovo componente
  const handleStateTransition = async (data: StateTransitionData) => {
    if (!targetTransitionStatus) return;

    try {
      const response = await fetch(`/api/reports/${reportId}/transition`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetStatus: targetTransitionStatus,
          ...data
        }),
      });

      if (response.ok) {
        setIsTransitionDialogOpen(false);
        setTargetTransitionStatus(null);
        await loadReportDetail();
      } else {
        const error = await response.json();
        console.error('Errore transizione:', error);
        alert(`Errore: ${error.error || 'Transizione fallita'}`);
      }
    } catch (error) {
      console.error('Errore transizione:', error);
      alert('Errore durante la transizione di stato');
    }
  };

  // Open transition dialog per uno stato specifico
  const openTransitionDialog = (targetStatus: string) => {
    setTargetTransitionStatus(targetStatus);
    setIsTransitionDialogOpen(true);
  };

  // Handle new inspection legacy
  const handleCreateInspection = async () => {
    try {
      // Validazione input
      if (!inspectionForm.date || inspectionForm.date.trim() === '') {
        alert('Per favore seleziona data e ora del sopralluogo');
        return;
      }

      // Converti datetime-local (YYYY-MM-DDTHH:mm) in formato ISO (YYYY-MM-DDTHH:mm:ss.sssZ)
      const dateValue = new Date(inspectionForm.date).toISOString();

      const response = await fetch(`/api/reports/${reportId}/inspections`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...inspectionForm,
          date: dateValue
        }),
      });

      if (response.ok) {
        setIsInspectionDialogOpen(false);
        setInspectionForm({ date: '', location: '', minutesText: '', outcome: '' });
        loadReportDetail();
        alert('Sopralluogo registrato con successo. Lo stato del report è stato aggiornato a "In Verifica".');
      } else {
        const error = await response.json();
        console.error('Errore creazione sopralluogo:', error);
        alert(`Errore: ${error.error || 'Impossibile creare il sopralluogo'}\n${error.details || ''}`);
      }
    } catch (error) {
      console.error('Errore creazione sopralluogo:', error);
      alert('Errore di connessione. Riprova più tardi.');
    }
  };

  // Handle clarification request legacy
  const handleCreateClarification = async () => {
    try {
      if (!clarificationForm.question || clarificationForm.question.trim() === '') {
        alert('Per favore inserisci una domanda per la richiesta di chiarimenti');
        return;
      }

      const response = await fetch(`/api/reports/${reportId}/clarifications`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(clarificationForm),
      });

      if (response.ok) {
        setIsClarificationDialogOpen(false);
        setClarificationForm({ question: '', dueAt: '' });
        loadReportDetail();
        alert('Richiesta chiarimenti inviata con successo. Lo stato del report è stato aggiornato a "Richiesta Chiarimenti".');
      } else {
        const error = await response.json();
        console.error('Errore richiesta chiarimenti:', error);
        alert(`Errore: ${error.error || 'Impossibile inviare la richiesta'}\n${error.details || ''}`);
      }
    } catch (error) {
      console.error('Errore richiesta chiarimenti:', error);
      alert('Errore di connessione. Riprova più tardi.');
    }
  };

  // Handle authority notice legacy
  const handleCreateAuthorityNotice = async () => {
    try {
      if (!authorityForm.authority || authorityForm.authority.trim() === '') {
        alert('Per favore inserisci il nome dell\'ente/autorità');
        return;
      }

      const response = await fetch(`/api/reports/${reportId}/authority-notices`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(authorityForm),
      });

      if (response.ok) {
        setIsAuthorityDialogOpen(false);
        setAuthorityForm({ authority: '', protocol: '', note: '' });
        loadReportDetail();
        alert('Segnalazione all\'ente inviata con successo. Lo stato del report è stato aggiornato a "Segnalato Autorità".');
      } else {
        const error = await response.json();
        console.error('Errore segnalazione ente:', error);
        alert(`Errore: ${error.error || 'Impossibile inviare la segnalazione'}\n${error.details || ''}`);
      }
    } catch (error) {
      console.error('Errore segnalazione ente:', error);
      alert('Errore di connessione. Riprova più tardi.');
    }
  };

  // Handle attachments change
  const handleAttachmentsChange = (newAttachments: AttachmentFile[]) => {
    setAttachments(newAttachments);
    // Ricarica i dettagli per aggiornare il count
    loadReportDetail();
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

  const { report, actionLogs, inspections, clarificationRequests, authorityNotices, availableTransitions } = reportDetail;
  const statusConfig = STATUS_LABELS[report.status] || { label: report.status, color: 'bg-gray-100 text-gray-800' };

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

          {availableTransitions && availableTransitions.length > 0 && (
            <Select onValueChange={openTransitionDialog}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Cambia Stato" />
              </SelectTrigger>
              <SelectContent>
                {availableTransitions.map((status) => (
                  <SelectItem key={status} value={status}>
                    {STATUS_LABELS[status]?.label || status}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
                <p className="text-xl font-bold">{attachments.length}</p>
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
                        <Label>Data e Ora *</Label>
                        <Input
                          type="datetime-local"
                          value={inspectionForm.date}
                          onChange={(e) => setInspectionForm({ ...inspectionForm, date: e.target.value })}
                          required
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

        {/* Attachments Tab - INTEGRATO CON AttachmentManager */}
        <TabsContent value="attachments">
          <Card>
            <CardHeader>
              <CardTitle>Allegati</CardTitle>
              <CardDescription>
                Documenti e file allegati a questo report. Carica nuovi file tramite drag & drop o seleziona manualmente.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AttachmentManager
                reportId={reportId}
                context="report"
                attachments={attachments}
                onAttachmentsChange={handleAttachmentsChange}
                maxFileSize={10}
                acceptedFileTypes={['image/*', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* State Transition Dialog - INTEGRATO CON StateTransitionDialog */}
      {targetTransitionStatus && (
        <StateTransitionDialog
          open={isTransitionDialogOpen}
          onOpenChange={setIsTransitionDialogOpen}
          reportId={reportId}
          currentStatus={report.status}
          targetStatus={targetTransitionStatus}
          onConfirm={handleStateTransition}
        />
      )}
    </div>
  );
}
