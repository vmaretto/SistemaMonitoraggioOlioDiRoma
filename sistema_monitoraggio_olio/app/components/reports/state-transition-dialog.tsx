'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
} from '@/components/ui/dialog';
import { AttachmentManager, AttachmentFile } from './attachment-manager';

interface StateTransitionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reportId: string;
  currentStatus: string;
  targetStatus: string;
  onConfirm: (data: StateTransitionData) => Promise<void>;
}

export interface StateTransitionData {
  motivo: string;
  note?: string;
  attachmentIds?: string[];
  metadata?: any;
}

export function StateTransitionDialog({
  open,
  onOpenChange,
  reportId,
  currentStatus,
  targetStatus,
  onConfirm,
}: StateTransitionDialogProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [motivo, setMotivo] = useState('');
  const [note, setNote] = useState('');
  const [attachments, setAttachments] = useState<AttachmentFile[]>([]);
  const [metadata, setMetadata] = useState<any>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!motivo.trim()) {
      alert('Il motivo è obbligatorio');
      return;
    }

    setLoading(true);
    try {
      await onConfirm({
        motivo,
        note,
        attachmentIds: attachments.map(a => a.id).filter(Boolean) as string[],
        metadata: getMetadataForTransition(),
      });
      onOpenChange(false);
      router.refresh();
    } catch (error) {
      console.error('Errore transizione:', error);
      alert('Errore durante la transizione di stato');
    } finally {
      setLoading(false);
    }
  };

  const getMetadataForTransition = () => {
    // Determina il tipo di metadata basato sulla transizione
    if (targetStatus === 'IN_VERIFICA') {
      return {
        type: 'inspection',
        ...metadata,
      };
    } else if (targetStatus === 'RICHIESTA_CHIARIMENTI') {
      return {
        type: 'clarification',
        ...metadata,
      };
    } else if (targetStatus === 'SEGNALATO_AUTORITA') {
      return {
        type: 'authority_notice',
        ...metadata,
      };
    } else if (targetStatus === 'CHIUSO') {
      return {
        type: 'close',
        motivoChiusura: motivo,
      };
    }
    return undefined;
  };

  const renderDynamicForm = () => {
    if (targetStatus === 'IN_VERIFICA') {
      return <InspectionForm metadata={metadata} setMetadata={setMetadata} />;
    } else if (targetStatus === 'RICHIESTA_CHIARIMENTI') {
      return <ClarificationForm metadata={metadata} setMetadata={setMetadata} />;
    } else if (targetStatus === 'SEGNALATO_AUTORITA') {
      return <AuthorityNoticeForm metadata={metadata} setMetadata={setMetadata} />;
    } else if (targetStatus === 'CHIUSO') {
      return <CloseForm motivo={motivo} setMotivo={setMotivo} />;
    }
    return null;
  };

  const getDialogTitle = () => {
    const titles: Record<string, string> = {
      IN_LAVORAZIONE: 'Avvia Lavorazione',
      IN_VERIFICA: 'Pianifica Ispezione',
      RICHIESTA_CHIARIMENTI: 'Richiedi Chiarimenti',
      SEGNALATO_AUTORITA: 'Segnala ad Autorità',
      CHIUSO: 'Chiudi Report',
      ARCHIVIATO: 'Archivia Report',
    };
    return titles[targetStatus] || 'Cambio Stato';
  };

  const getDialogDescription = () => {
    const descriptions: Record<string, string> = {
      IN_LAVORAZIONE: 'Compila i dettagli per avviare la lavorazione del report',
      IN_VERIFICA: 'Pianifica un\'ispezione fornendo i dettagli necessari',
      RICHIESTA_CHIARIMENTI: 'Crea una richiesta di chiarimenti da inviare al destinatario',
      SEGNALATO_AUTORITA: 'Prepara una segnalazione da inviare all\'autorità competente',
      CHIUSO: 'Fornisci il motivo della chiusura del report (minimo 20 caratteri)',
      ARCHIVIATO: 'Il report verrà archiviato definitivamente',
    };
    return descriptions[targetStatus] || 'Completa il form per procedere';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{getDialogTitle()}</DialogTitle>
            <DialogDescription>{getDialogDescription()}</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Form dinamico basato su targetStatus */}
            {renderDynamicForm()}

            {/* Campo Motivo (per tutti tranne CHIUSO che ha il suo form) */}
            {targetStatus !== 'CHIUSO' && (
              <div>
                <Label>Motivo *</Label>
                <Textarea
                  value={motivo}
                  onChange={(e) => setMotivo(e.target.value)}
                  placeholder="Descrivi il motivo del cambio di stato..."
                  rows={3}
                  required
                />
              </div>
            )}

            {/* Note aggiuntive */}
            <div>
              <Label>Note aggiuntive</Label>
              <Textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Aggiungi eventuali note..."
                rows={2}
              />
            </div>

            {/* Allegati */}
            <div>
              <Label>Allegati</Label>
              <AttachmentManager
                reportId={reportId}
                context="state_change"
                attachments={attachments}
                onAttachmentsChange={setAttachments}
                maxFileSize={10}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Annulla
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Elaborazione...' : 'Conferma'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Form Ispezione
function InspectionForm({ metadata, setMetadata }: { metadata: any; setMetadata: (m: any) => void }) {
  return (
    <div className="space-y-4 p-4 border rounded-lg bg-gray-50">
      <h4 className="font-medium text-sm">Dettagli Ispezione</h4>

      <div>
        <Label>Tipo Ispezione *</Label>
        <Select
          value={metadata.tipoIspezione || ''}
          onValueChange={(value) => setMetadata({ ...metadata, tipoIspezione: value })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Seleziona tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="DOCUMENTALE">Documentale</SelectItem>
            <SelectItem value="VISITA_LUOGO">Visita sul Luogo</SelectItem>
            <SelectItem value="CAMPIONAMENTO">Campionamento</SelectItem>
            <SelectItem value="VERIFICA_ETICHETTA">Verifica Etichetta</SelectItem>
            <SelectItem value="AUDIT_COMPLETO">Audit Completo</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label>Data Ispezione *</Label>
        <Input
          type="date"
          value={metadata.dataIspezione || ''}
          onChange={(e) => setMetadata({ ...metadata, dataIspezione: e.target.value })}
          required
        />
      </div>

      <div>
        <Label>Luogo</Label>
        <Input
          value={metadata.luogo || ''}
          onChange={(e) => setMetadata({ ...metadata, luogo: e.target.value })}
          placeholder="es: Via Roma 1, Roma"
        />
      </div>

      <div>
        <Label>Ispettore</Label>
        <Input
          value={metadata.ispettore || ''}
          onChange={(e) => setMetadata({ ...metadata, ispettore: e.target.value })}
          placeholder="Nome ispettore"
        />
      </div>
    </div>
  );
}

// Form Chiarimenti
function ClarificationForm({ metadata, setMetadata }: { metadata: any; setMetadata: (m: any) => void }) {
  const [domandeText, setDomandeText] = useState('');

  return (
    <div className="space-y-4 p-4 border rounded-lg bg-gray-50">
      <h4 className="font-medium text-sm">Richiesta Chiarimenti</h4>

      <div>
        <Label>Destinatario *</Label>
        <Select
          value={metadata.destinatario || ''}
          onValueChange={(value) => setMetadata({ ...metadata, destinatario: value })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Seleziona destinatario" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="PRODUTTORE">Produttore</SelectItem>
            <SelectItem value="DISTRIBUTORE">Distributore</SelectItem>
            <SelectItem value="RIVENDITORE">Rivenditore</SelectItem>
            <SelectItem value="IMPORTATORE">Importatore</SelectItem>
            <SelectItem value="ENTE_CERTIFICAZIONE">Ente Certificazione</SelectItem>
            <SelectItem value="ALTRO">Altro</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label>Email Destinatario</Label>
        <Input
          type="email"
          value={metadata.emailDestinatario || ''}
          onChange={(e) => setMetadata({ ...metadata, emailDestinatario: e.target.value })}
          placeholder="email@example.com"
        />
      </div>

      <div>
        <Label>Oggetto *</Label>
        <Input
          value={metadata.oggetto || ''}
          onChange={(e) => setMetadata({ ...metadata, oggetto: e.target.value })}
          placeholder="Oggetto della richiesta"
          required
        />
      </div>

      <div>
        <Label>Domande (una per riga) *</Label>
        <Textarea
          value={domandeText}
          onChange={(e) => {
            setDomandeText(e.target.value);
            setMetadata({
              ...metadata,
              domande: e.target.value.split('\n').filter(Boolean),
            });
          }}
          placeholder="Inserisci le domande, una per riga..."
          rows={4}
          required
        />
      </div>

      <div>
        <Label>Data Scadenza</Label>
        <Input
          type="date"
          value={metadata.dataScadenza || ''}
          onChange={(e) => setMetadata({ ...metadata, dataScadenza: e.target.value })}
        />
      </div>
    </div>
  );
}

// Form Segnalazione Autorità
function AuthorityNoticeForm({ metadata, setMetadata }: { metadata: any; setMetadata: (m: any) => void }) {
  const [violazioniText, setViolazioniText] = useState('');

  return (
    <div className="space-y-4 p-4 border rounded-lg bg-gray-50">
      <h4 className="font-medium text-sm">Segnalazione Autorità</h4>

      <div>
        <Label>Autorità *</Label>
        <Select
          value={metadata.autorita || ''}
          onValueChange={(value) => setMetadata({ ...metadata, autorita: value })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Seleziona autorità" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ICQRF">ICQRF</SelectItem>
            <SelectItem value="ASL">ASL</SelectItem>
            <SelectItem value="GUARDIA_FINANZA">Guardia di Finanza</SelectItem>
            <SelectItem value="CARABINIERI_NAS">Carabinieri NAS</SelectItem>
            <SelectItem value="COMUNE">Comune</SelectItem>
            <SelectItem value="REGIONE">Regione</SelectItem>
            <SelectItem value="ALTRO">Altro</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label>Denominazione *</Label>
        <Input
          value={metadata.denominazione || ''}
          onChange={(e) => setMetadata({ ...metadata, denominazione: e.target.value })}
          placeholder="es: ICQRF - Ufficio di Roma"
          required
        />
      </div>

      <div>
        <Label>Email Autorità</Label>
        <Input
          type="email"
          value={metadata.emailAutorita || ''}
          onChange={(e) => setMetadata({ ...metadata, emailAutorita: e.target.value })}
          placeholder="email@autorita.it"
        />
      </div>

      <div>
        <Label>Oggetto Segnalazione *</Label>
        <Input
          value={metadata.oggetto || ''}
          onChange={(e) => setMetadata({ ...metadata, oggetto: e.target.value })}
          placeholder="Oggetto della segnalazione"
          required
        />
      </div>

      <div>
        <Label>Violazioni Rilevate (una per riga) *</Label>
        <Textarea
          value={violazioniText}
          onChange={(e) => {
            setViolazioniText(e.target.value);
            setMetadata({
              ...metadata,
              violazioni: e.target.value.split('\n').filter(Boolean),
            });
          }}
          placeholder="Inserisci le violazioni rilevate, una per riga..."
          rows={4}
          required
        />
      </div>

      <div>
        <Label>Gravità *</Label>
        <Select
          value={metadata.gravita || ''}
          onValueChange={(value) => setMetadata({ ...metadata, gravita: value })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Seleziona gravità" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="INFORMATIVA">Informativa</SelectItem>
            <SelectItem value="BASSA">Bassa</SelectItem>
            <SelectItem value="MEDIA">Media</SelectItem>
            <SelectItem value="ALTA">Alta</SelectItem>
            <SelectItem value="CRITICA">Critica</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

// Form Chiusura
function CloseForm({ motivo, setMotivo }: { motivo: string; setMotivo: (m: string) => void }) {
  return (
    <div className="space-y-4 p-4 border rounded-lg bg-gray-50">
      <h4 className="font-medium text-sm">Chiusura Report</h4>
      <div>
        <Label>Motivo Chiusura * (minimo 20 caratteri)</Label>
        <Textarea
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
          placeholder="Descrivi in dettaglio il motivo della chiusura del report..."
          rows={5}
          required
          minLength={20}
        />
        <p className="text-xs text-gray-500 mt-1">
          {motivo.length} / 20 caratteri minimi
        </p>
      </div>
    </div>
  );
}
