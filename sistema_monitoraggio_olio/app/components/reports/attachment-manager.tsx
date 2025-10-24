'use client';

import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
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
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import {
  Upload,
  X,
  FileText,
  Image as ImageIcon,
  Download,
  Eye,
  Edit2,
  Trash2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface AttachmentFile {
  id?: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  url: string;
  storagePath?: string;
  tipo?: string;
  descrizione?: string;
  tags?: string[];
  uploadedAt?: Date;
  uploadedBy?: string;
  // Per file locali non ancora caricati
  file?: File;
  preview?: string;
}

interface AttachmentManagerProps {
  reportId?: string;
  inspectionId?: string;
  clarificationId?: string;
  authorityNoticeId?: string;
  stateChangeId?: string;
  context?: string;
  attachments: AttachmentFile[];
  onAttachmentsChange: (attachments: AttachmentFile[]) => void;
  maxFileSize?: number; // MB
  acceptedFileTypes?: string[];
  disabled?: boolean;
}

const ATTACHMENT_TYPES = [
  { value: 'GENERICO', label: 'Generico' },
  { value: 'FOTOGRAFIA', label: 'Fotografia' },
  { value: 'CERTIFICATO', label: 'Certificato' },
  { value: 'ANALISI_LABORATORIO', label: 'Analisi Laboratorio' },
  { value: 'DOCUMENTO_UFFICIALE', label: 'Documento Ufficiale' },
  { value: 'COMUNICAZIONE', label: 'Comunicazione' },
  { value: 'FATTURA', label: 'Fattura' },
  { value: 'CONTRATTO', label: 'Contratto' },
  { value: 'ETICHETTA', label: 'Etichetta' },
  { value: 'SCREENSHOT', label: 'Screenshot' },
  { value: 'REPORT_PDF', label: 'Report PDF' },
  { value: 'ALTRO', label: 'Altro' },
];

export function AttachmentManager({
  reportId,
  inspectionId,
  clarificationId,
  authorityNoticeId,
  stateChangeId,
  context = 'report',
  attachments,
  onAttachmentsChange,
  maxFileSize = 10,
  acceptedFileTypes = ['image/*', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  disabled = false,
}: AttachmentManagerProps) {
  const [uploading, setUploading] = useState(false);
  const [editingAttachment, setEditingAttachment] = useState<AttachmentFile | null>(null);
  const [previewAttachment, setPreviewAttachment] = useState<AttachmentFile | null>(null);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (disabled) return;

    setUploading(true);

    try {
      const formData = new FormData();
      acceptedFiles.forEach(file => {
        formData.append('files', file);
      });
      formData.append('context', context);
      if (reportId) formData.append('reportId', reportId);
      if (inspectionId) formData.append('inspectionId', inspectionId);
      if (clarificationId) formData.append('clarificationId', clarificationId);
      if (authorityNoticeId) formData.append('authorityNoticeId', authorityNoticeId);
      if (stateChangeId) formData.append('stateChangeId', stateChangeId);

      const response = await fetch('/api/attachments', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Errore durante l\'upload');
      }

      const result = await response.json();

      if (result.success) {
        onAttachmentsChange([...attachments, ...result.data]);
      }
    } catch (error) {
      console.error('Errore upload:', error);
      alert('Errore durante l\'upload dei file');
    } finally {
      setUploading(false);
    }
  }, [attachments, context, reportId, inspectionId, clarificationId, authorityNoticeId, stateChangeId, onAttachmentsChange, disabled]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: acceptedFileTypes.reduce((acc, type) => {
      acc[type] = [];
      return acc;
    }, {} as Record<string, string[]>),
    maxSize: maxFileSize * 1024 * 1024,
    disabled: disabled || uploading,
  });

  const handleDelete = async (attachment: AttachmentFile) => {
    if (disabled) return;

    if (!confirm(`Sei sicuro di voler eliminare "${attachment.originalName}"?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/attachments?id=${attachment.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Errore durante l\'eliminazione');
      }

      onAttachmentsChange(attachments.filter(a => a.id !== attachment.id));
    } catch (error) {
      console.error('Errore eliminazione:', error);
      alert('Errore durante l\'eliminazione del file');
    }
  };

  const handleUpdateMetadata = async (attachment: AttachmentFile, updates: Partial<AttachmentFile>) => {
    if (disabled) return;

    try {
      const response = await fetch('/api/attachments', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: attachment.id,
          tipo: updates.tipo,
          descrizione: updates.descrizione,
          tags: updates.tags,
        }),
      });

      if (!response.ok) {
        throw new Error('Errore durante l\'aggiornamento');
      }

      const result = await response.json();

      if (result.success) {
        onAttachmentsChange(
          attachments.map(a => a.id === attachment.id ? result.data : a)
        );
        setEditingAttachment(null);
      }
    } catch (error) {
      console.error('Errore aggiornamento:', error);
      alert('Errore durante l\'aggiornamento del file');
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) {
      return <ImageIcon className="h-5 w-5" />;
    }
    return <FileText className="h-5 w-5" />;
  };

  const isImage = (mimeType: string) => mimeType.startsWith('image/');

  return (
    <div className="space-y-4">
      {/* Upload Area */}
      {!disabled && (
        <div
          {...getRootProps()}
          className={cn(
            "border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors",
            isDragActive ? "border-primary bg-primary/5" : "border-gray-300 hover:border-primary/50",
            uploading && "opacity-50 cursor-not-allowed"
          )}
        >
          <input {...getInputProps()} />
          <Upload className="h-12 w-12 mx-auto mb-4 text-gray-400" />
          <p className="text-sm font-medium mb-1">
            {isDragActive ? "Rilascia i file qui..." : "Trascina file qui o clicca per selezionare"}
          </p>
          <p className="text-xs text-gray-500">
            Dimensione massima: {maxFileSize}MB
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Tipi supportati: Immagini, PDF, Word
          </p>
        </div>
      )}

      {/* Attachments List */}
      {attachments.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Allegati ({attachments.length})</h4>
          <div className="grid grid-cols-1 gap-3">
            {attachments.map((attachment) => (
              <Card key={attachment.id} className="p-4">
                <div className="flex items-start gap-4">
                  {/* Icon/Preview */}
                  <div className="flex-shrink-0">
                    {isImage(attachment.mimeType) ? (
                      <div className="w-16 h-16 rounded overflow-hidden bg-gray-100 flex items-center justify-center">
                        <img
                          src={attachment.url}
                          alt={attachment.originalName}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="w-16 h-16 rounded bg-gray-100 flex items-center justify-center">
                        {getFileIcon(attachment.mimeType)}
                      </div>
                    )}
                  </div>

                  {/* File Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {attachment.originalName}
                        </p>
                        <p className="text-xs text-gray-500">
                          {formatFileSize(attachment.size)}
                        </p>
                      </div>

                      {/* Actions */}
                      {!disabled && (
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setPreviewAttachment(attachment)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setEditingAttachment(attachment)}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(attachment)}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      )}
                    </div>

                    {/* Metadata */}
                    {(attachment.tipo || attachment.tags || attachment.descrizione) && (
                      <div className="mt-2 space-y-1">
                        {attachment.tipo && attachment.tipo !== 'GENERICO' && (
                          <Badge variant="secondary" className="text-xs">
                            {ATTACHMENT_TYPES.find(t => t.value === attachment.tipo)?.label || attachment.tipo}
                          </Badge>
                        )}
                        {attachment.tags && attachment.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {attachment.tags.map((tag, i) => (
                              <Badge key={i} variant="outline" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        )}
                        {attachment.descrizione && (
                          <p className="text-xs text-gray-600 line-clamp-2">
                            {attachment.descrizione}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={!!editingAttachment} onOpenChange={() => setEditingAttachment(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifica Allegato</DialogTitle>
            <DialogDescription>
              Aggiorna i metadati dell'allegato
            </DialogDescription>
          </DialogHeader>
          {editingAttachment && (
            <EditAttachmentForm
              attachment={editingAttachment}
              onSave={(updates) => handleUpdateMetadata(editingAttachment, updates)}
              onCancel={() => setEditingAttachment(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={!!previewAttachment} onOpenChange={() => setPreviewAttachment(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>{previewAttachment?.originalName}</DialogTitle>
          </DialogHeader>
          {previewAttachment && (
            <div className="mt-4">
              {isImage(previewAttachment.mimeType) ? (
                <img
                  src={previewAttachment.url}
                  alt={previewAttachment.originalName}
                  className="w-full h-auto max-h-[70vh] object-contain"
                />
              ) : previewAttachment.mimeType === 'application/pdf' ? (
                <iframe
                  src={previewAttachment.url}
                  className="w-full h-[70vh]"
                  title={previewAttachment.originalName}
                />
              ) : (
                <div className="text-center p-8">
                  <FileText className="h-16 w-16 mx-auto mb-4 text-gray-400" />
                  <p className="text-sm text-gray-600 mb-4">
                    Anteprima non disponibile per questo tipo di file
                  </p>
                  <Button asChild>
                    <a href={previewAttachment.url} download target="_blank" rel="noopener noreferrer">
                      <Download className="h-4 w-4 mr-2" />
                      Scarica File
                    </a>
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Edit Attachment Form Component
function EditAttachmentForm({
  attachment,
  onSave,
  onCancel,
}: {
  attachment: AttachmentFile;
  onSave: (updates: Partial<AttachmentFile>) => void;
  onCancel: () => void;
}) {
  const [tipo, setTipo] = useState(attachment.tipo || 'GENERICO');
  const [descrizione, setDescrizione] = useState(attachment.descrizione || '');
  const [tagsInput, setTagsInput] = useState((attachment.tags || []).join(', '));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      tipo,
      descrizione,
      tags: tagsInput.split(',').map(t => t.trim()).filter(Boolean),
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label>Tipo Documento</Label>
        <Select value={tipo} onValueChange={setTipo}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ATTACHMENT_TYPES.map(type => (
              <SelectItem key={type.value} value={type.value}>
                {type.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label>Descrizione</Label>
        <Textarea
          value={descrizione}
          onChange={(e) => setDescrizione(e.target.value)}
          placeholder="Descrizione opzionale del documento..."
          rows={3}
        />
      </div>

      <div>
        <Label>Tag (separati da virgola)</Label>
        <Input
          value={tagsInput}
          onChange={(e) => setTagsInput(e.target.value)}
          placeholder="es: importante, urgente, 2024"
        />
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Annulla
        </Button>
        <Button type="submit">
          Salva
        </Button>
      </div>
    </form>
  );
}
