'use client';

import React, { useState, useEffect } from 'react';
import { X, Upload, FileText, AlertCircle, Trash2, Save } from 'lucide-react';
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
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

interface Etichetta {
  id: string;
  nome: string;
  descrizione?: string;
  denominazione: string;
  categoria: string;
  produttore?: string;
  comune?: string;
  regioneProduzione: string;
  tipoEtichetta: string;
  imageFronteUrl?: string;
  imageRetroUrl?: string;
  isAttiva: boolean;
  createdAt: string;
}

interface DetailEtichettaModalProps {
  isOpen: boolean;
  onClose: () => void;
  etichetta: Etichetta | null;
  onSuccess: () => void;
}

export default function DetailEtichettaModal({
  isOpen,
  onClose,
  etichetta,
  onSuccess,
}: DetailEtichettaModalProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [formData, setFormData] = useState<Partial<Etichetta>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Inizializza formData quando l'etichetta cambia
  useEffect(() => {
    if (etichetta) {
      setFormData({
        nome: etichetta.nome,
        descrizione: etichetta.descrizione || '',
        denominazione: etichetta.denominazione,
        categoria: etichetta.categoria,
        produttore: etichetta.produttore || '',
        comune: etichetta.comune || '',
        regioneProduzione: etichetta.regioneProduzione,
        tipoEtichetta: etichetta.tipoEtichetta,
        isAttiva: etichetta.isAttiva,
      });
    }
  }, [etichetta]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.nome?.trim()) {
      newErrors.nome = 'Il nome è obbligatorio';
    }

    if (!formData.denominazione?.trim()) {
      newErrors.denominazione = 'La denominazione è obbligatoria';
    }

    if (!formData.categoria) {
      newErrors.categoria = 'La categoria è obbligatoria';
    }

    if (!formData.regioneProduzione?.trim()) {
      newErrors.regioneProduzione = 'La regione è obbligatoria';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!etichetta) return;
    
    if (!validateForm()) {
      toast.error('Compila tutti i campi obbligatori');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(`/api/etichette/${etichetta.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Errore durante il salvataggio');
      }

      toast.success('Etichetta aggiornata con successo!');
      setIsEditing(false);
      onSuccess();
    } catch (error) {
      console.error('Errore update:', error);
      toast.error(error instanceof Error ? error.message : 'Errore durante il salvataggio');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!etichetta) return;

    const conferma = confirm(
      `Sei sicuro di voler eliminare l'etichetta "${etichetta.nome}"?\n\nQuesta azione non può essere annullata.`
    );

    if (!conferma) return;

    setIsDeleting(true);

    try {
      const response = await fetch(`/api/etichette/${etichetta.id}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Errore durante l\'eliminazione');
      }

      toast.success('Etichetta eliminata con successo!');
      handleClose();
      onSuccess();
    } catch (error) {
      console.error('Errore delete:', error);
      toast.error(error instanceof Error ? error.message : 'Errore durante l\'eliminazione');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleClose = () => {
    setIsEditing(false);
    setErrors({});
    onClose();
  };

  const getCategoriaColor = (categoria: string) => {
    switch (categoria) {
      case 'DOP':
        return 'bg-yellow-100 text-yellow-700 border-yellow-300';
      case 'IGP':
        return 'bg-blue-100 text-blue-700 border-blue-300';
      case 'Biologici':
        return 'bg-green-100 text-green-700 border-green-300';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-300';
    }
  };

  if (!isOpen || !etichetta) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b sticky top-0 bg-white z-10">
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold text-gray-900">
              {isEditing ? 'Modifica Etichetta' : 'Dettaglio Etichetta'}
            </h2>
            <Badge className={getCategoriaColor(etichetta.categoria)}>
              {etichetta.categoria}
            </Badge>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleClose}
            disabled={isLoading || isDeleting}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Immagini */}
          <div className="grid grid-cols-2 gap-4">
            {/* Immagine Fronte */}
            <div className="space-y-2">
              <Label>Immagine Fronte</Label>
              <div className="border-2 border-gray-200 rounded-lg p-4 bg-gray-50">
                {etichetta.imageFronteUrl || etichetta.imageUrl ? (
                  <img
                    src={etichetta.imageFronteUrl || etichetta.imageUrl}
                    alt="Fronte"
                    className="w-full h-48 object-contain rounded"
                  />
                ) : (
                  <div className="w-full h-48 flex items-center justify-center text-gray-400">
                    <FileText size={48} />
                  </div>
                )}
              </div>
            </div>

            {/* Immagine Retro */}
            <div className="space-y-2">
              <Label>Immagine Retro</Label>
              <div className="border-2 border-gray-200 rounded-lg p-4 bg-gray-50">
                {etichetta.imageRetroUrl ? (
                  <img
                    src={etichetta.imageRetroUrl}
                    alt="Retro"
                    className="w-full h-48 object-contain rounded"
                  />
                ) : (
                  <div className="w-full h-48 flex items-center justify-center text-gray-400">
                    <p className="text-sm">Nessuna immagine retro</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Form Fields */}
          <div className="space-y-4">
            {/* Categoria e Tipo */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Categoria</Label>
                {isEditing ? (
                  <Select
                    value={formData.categoria}
                    onValueChange={(value) => setFormData({ ...formData, categoria: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="DOP">DOP</SelectItem>
                      <SelectItem value="IGP">IGP</SelectItem>
                      <SelectItem value="Biologici">Biologici</SelectItem>
                      <SelectItem value="ufficiale">Ufficiale</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <Input value={etichetta.categoria} disabled />
                )}
              </div>

              <div className="space-y-2">
                <Label>Tipo</Label>
                {isEditing ? (
                  <Select
                    value={formData.tipoEtichetta}
                    onValueChange={(value) => setFormData({ ...formData, tipoEtichetta: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="etichetta">Etichetta</SelectItem>
                      <SelectItem value="contenitore">Contenitore</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <Input value={etichetta.tipoEtichetta} disabled />
                )}
              </div>
            </div>

            {/* Nome */}
            <div className="space-y-2">
              <Label>Nome *</Label>
              {isEditing ? (
                <>
                  <Input
                    value={formData.nome}
                    onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                    className={errors.nome ? 'border-red-500' : ''}
                  />
                  {errors.nome && (
                    <p className="text-sm text-red-600 flex items-center gap-1">
                      <AlertCircle size={14} />
                      {errors.nome}
                    </p>
                  )}
                </>
              ) : (
                <Input value={etichetta.nome} disabled />
              )}
            </div>

            {/* Denominazione */}
            <div className="space-y-2">
              <Label>Denominazione *</Label>
              {isEditing ? (
                <>
                  <Input
                    value={formData.denominazione}
                    onChange={(e) => setFormData({ ...formData, denominazione: e.target.value })}
                    className={errors.denominazione ? 'border-red-500' : ''}
                  />
                  {errors.denominazione && (
                    <p className="text-sm text-red-600 flex items-center gap-1">
                      <AlertCircle size={14} />
                      {errors.denominazione}
                    </p>
                  )}
                </>
              ) : (
                <Input value={etichetta.denominazione} disabled />
              )}
            </div>

            {/* Produttore e Comune */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Produttore</Label>
                {isEditing ? (
                  <Input
                    value={formData.produttore || ''}
                    onChange={(e) => setFormData({ ...formData, produttore: e.target.value })}
                  />
                ) : (
                  <Input value={etichetta.produttore || '-'} disabled />
                )}
              </div>

              <div className="space-y-2">
                <Label>Comune</Label>
                {isEditing ? (
                  <Input
                    value={formData.comune || ''}
                    onChange={(e) => setFormData({ ...formData, comune: e.target.value })}
                  />
                ) : (
                  <Input value={etichetta.comune || '-'} disabled />
                )}
              </div>
            </div>

            {/* Regione */}
            <div className="space-y-2">
              <Label>Regione di Produzione *</Label>
              {isEditing ? (
                <>
                  <Input
                    value={formData.regioneProduzione}
                    onChange={(e) => setFormData({ ...formData, regioneProduzione: e.target.value })}
                    className={errors.regioneProduzione ? 'border-red-500' : ''}
                  />
                  {errors.regioneProduzione && (
                    <p className="text-sm text-red-600 flex items-center gap-1">
                      <AlertCircle size={14} />
                      {errors.regioneProduzione}
                    </p>
                  )}
                </>
              ) : (
                <Input value={etichetta.regioneProduzione} disabled />
              )}
            </div>

            {/* Descrizione */}
            <div className="space-y-2">
              <Label>Descrizione</Label>
              {isEditing ? (
                <Textarea
                  value={formData.descrizione || ''}
                  onChange={(e) => setFormData({ ...formData, descrizione: e.target.value })}
                  rows={3}
                />
              ) : (
                <Textarea value={etichetta.descrizione || '-'} disabled rows={3} />
              )}
            </div>

            {/* Stato Attiva */}
            {isEditing && (
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isAttiva"
                  checked={formData.isAttiva}
                  onChange={(e) => setFormData({ ...formData, isAttiva: e.target.checked })}
                  className="w-4 h-4"
                />
                <Label htmlFor="isAttiva" className="cursor-pointer">
                  Etichetta attiva
                </Label>
              </div>
            )}

            {/* Info Timestamp */}
            {!isEditing && (
              <div className="pt-4 border-t text-sm text-gray-600">
                <p>Data creazione: {new Date(etichetta.createdAt).toLocaleString('it-IT')}</p>
                <p>Stato: {etichetta.isAttiva ? '✅ Attiva' : '❌ Disattivata'}</p>
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex justify-between items-center p-6 border-t bg-gray-50">
          <div>
            {isEditing && (
              <Button
                variant="destructive"
                onClick={handleDelete}
                disabled={isLoading || isDeleting}
                className="gap-2"
              >
                {isDeleting ? (
                  <>
                    <span className="animate-spin">⏳</span>
                    Eliminazione...
                  </>
                ) : (
                  <>
                    <Trash2 size={18} />
                    Elimina Etichetta
                  </>
                )}
              </Button>
            )}
          </div>

          <div className="flex gap-3">
            {isEditing ? (
              <>
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsEditing(false);
                    setErrors({});
                    // Reset formData
                    if (etichetta) {
                      setFormData({
                        nome: etichetta.nome,
                        descrizione: etichetta.descrizione || '',
                        denominazione: etichetta.denominazione,
                        categoria: etichetta.categoria,
                        produttore: etichetta.produttore || '',
                        comune: etichetta.comune || '',
                        regioneProduzione: etichetta.regioneProduzione,
                        tipoEtichetta: etichetta.tipoEtichetta,
                        isAttiva: etichetta.isAttiva,
                      });
                    }
                  }}
                  disabled={isLoading || isDeleting}
                >
                  Annulla
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={isLoading || isDeleting}
                  className="gap-2"
                >
                  {isLoading ? (
                    <>
                      <span className="animate-spin">⏳</span>
                      Salvataggio...
                    </>
                  ) : (
                    <>
                      <Save size={18} />
                      Salva Modifiche
                    </>
                  )}
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" onClick={handleClose}>
                  Chiudi
                </Button>
                <Button onClick={() => setIsEditing(true)} className="gap-2">
                  ✏️ Modifica
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}




