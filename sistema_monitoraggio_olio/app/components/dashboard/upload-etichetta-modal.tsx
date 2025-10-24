'use client';

import React, { useState } from 'react';
import { X, Upload, FileText, AlertCircle } from 'lucide-react';
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
import { toast } from 'sonner';

interface UploadEtichettaModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface FormData {
  nome: string;
  descrizione: string;
  denominazione: string;
  categoria: string;
  produttore: string;
  comune: string;
  regioneProduzione: string;
  tipoEtichetta: string;
  imageFronte: File | null;
  imageRetro: File | null;
}

export default function UploadEtichettaModal({
  isOpen,
  onClose,
  onSuccess,
}: UploadEtichettaModalProps) {
  const [formData, setFormData] = useState<FormData>({
    nome: '',
    descrizione: '',
    denominazione: '',
    categoria: 'DOP',
    produttore: '',
    comune: '',
    regioneProduzione: 'Lazio',
    tipoEtichetta: 'etichetta',
    imageFronte: null,
    imageRetro: null,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [previewFronte, setPreviewFronte] = useState<string | null>(null);
  const [previewRetro, setPreviewRetro] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [dragActiveFronte, setDragActiveFronte] = useState(false);
  const [dragActiveRetro, setDragActiveRetro] = useState(false);

  const handleFileChange = (file: File | null, type: 'fronte' | 'retro') => {
    if (!file) return;

    console.log(`📷 File selezionato (${type}):`, {
      name: file.name,
      type: file.type,
      size: file.size
    });

    // Validazione
    const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp'];
    const maxSize = 10 * 1024 * 1024; // 10MB

    if (!validTypes.includes(file.type)) {
      console.error(`❌ Formato non valido (${type}):`, file.type);
      setErrors({ 
        ...errors, 
        [type === 'fronte' ? 'imageFronte' : 'imageRetro']: 'Formato non valido. Usa PNG, JPG, GIF o WEBP.' 
      });
      return;
    }

    if (file.size > maxSize) {
      console.error(`❌ File troppo grande (${type}):`, file.size);
      setErrors({ 
        ...errors, 
        [type === 'fronte' ? 'imageFronte' : 'imageRetro']: 'File troppo grande (max 10MB).' 
      });
      return;
    }

    // Rimuovi errore se presente
    const newErrors = { ...errors };
    delete newErrors[type === 'fronte' ? 'imageFronte' : 'imageRetro'];
    setErrors(newErrors);

    // Aggiorna stato
    if (type === 'fronte') {
      setFormData({ ...formData, imageFronte: file });
    } else {
      setFormData({ ...formData, imageRetro: file });
    }

    // Crea preview
    const reader = new FileReader();
    reader.onloadend = () => {
      if (type === 'fronte') {
        setPreviewFronte(reader.result as string);
      } else {
        setPreviewRetro(reader.result as string);
      }
      console.log(`✅ Preview creata (${type})`);
    };
    reader.readAsDataURL(file);
  };

  const handleDrag = (e: React.DragEvent, type: 'fronte' | 'retro') => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      if (type === 'fronte') {
        setDragActiveFronte(true);
      } else {
        setDragActiveRetro(true);
      }
    } else if (e.type === 'dragleave') {
      if (type === 'fronte') {
        setDragActiveFronte(false);
      } else {
        setDragActiveRetro(false);
      }
    }
  };

  const handleDrop = (e: React.DragEvent, type: 'fronte' | 'retro') => {
    e.preventDefault();
    e.stopPropagation();
    if (type === 'fronte') {
      setDragActiveFronte(false);
    } else {
      setDragActiveRetro(false);
    }

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileChange(e.dataTransfer.files[0], type);
    }
  };

  const validateForm = (): boolean => {
    console.log('🔍 Validazione form...');
    const newErrors: Record<string, string> = {};

    if (!formData.nome.trim()) {
      newErrors.nome = 'Il nome è obbligatorio';
    }

    if (!formData.denominazione.trim()) {
      newErrors.denominazione = 'La denominazione è obbligatoria';
    }

    if (!formData.categoria) {
      newErrors.categoria = 'La categoria è obbligatoria';
    }

    if (!formData.regioneProduzione.trim()) {
      newErrors.regioneProduzione = 'La regione di produzione è obbligatoria';
    }

    if (!formData.imageFronte) {
      newErrors.imageFronte = "L'immagine fronte è obbligatoria";
    }

    setErrors(newErrors);
    
    const isValid = Object.keys(newErrors).length === 0;
    console.log(isValid ? '✅ Form valido' : '❌ Form non valido:', newErrors);
    
    return isValid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('🚀 handleSubmit chiamato');

    if (!validateForm()) {
      toast.error('Compila tutti i campi obbligatori');
      return;
    }

    setIsLoading(true);
    console.log('📤 Preparazione invio dati...');

    try {
      const formDataToSend = new FormData();
      formDataToSend.append('nome', formData.nome);
      formDataToSend.append('descrizione', formData.descrizione);
      formDataToSend.append('denominazione', formData.denominazione);
      formDataToSend.append('categoria', formData.categoria);
      formDataToSend.append('produttore', formData.produttore);
      formDataToSend.append('comune', formData.comune);
      formDataToSend.append('regioneProduzione', formData.regioneProduzione);
      formDataToSend.append('tipoEtichetta', formData.tipoEtichetta);

      if (formData.imageFronte) {
        formDataToSend.append('imageFronte', formData.imageFronte);
        console.log('✅ Immagine fronte aggiunta al FormData');
      }
      if (formData.imageRetro) {
        formDataToSend.append('imageRetro', formData.imageRetro);
        console.log('✅ Immagine retro aggiunta al FormData');
      }

      console.log('📡 Invio richiesta POST a /api/etichette...');
      
      const response = await fetch('/api/etichette', {
        method: 'POST',
        body: formDataToSend,
      });

      console.log('📥 Risposta ricevuta:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok
      });

      const result = await response.json();
      console.log('📦 Dati risposta:', result);

      if (!response.ok) {
        throw new Error(result.error || 'Errore durante il caricamento');
      }

      console.log('✅ Upload completato con successo!');
      toast.success('Etichetta caricata con successo!');
      handleClose();
      onSuccess();
      
    } catch (error) {
      console.error('💥 Errore durante upload:', error);
      toast.error(error instanceof Error ? error.message : 'Errore durante il caricamento');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    console.log('🔒 Chiusura modal');
    setFormData({
      nome: '',
      descrizione: '',
      denominazione: '',
      categoria: 'DOP',
      produttore: '',
      comune: '',
      regioneProduzione: 'Lazio',
      tipoEtichetta: 'etichetta',
      imageFronte: null,
      imageRetro: null,
    });
    setErrors({});
    setPreviewFronte(null);
    setPreviewRetro(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b sticky top-0 bg-white z-10">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              Carica Etichetta Ufficiale
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Inserisci i dati dell'etichetta certificata per il repository
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleClose}
            disabled={isLoading}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Categoria e Tipo */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="categoria">
                Categoria <span className="text-red-500">*</span>
              </Label>
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
              {errors.categoria && (
                <p className="text-sm text-red-600 flex items-center gap-1">
                  <AlertCircle size={14} />
                  {errors.categoria}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="tipoEtichetta">
                Tipo <span className="text-red-500">*</span>
              </Label>
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
            </div>
          </div>

          {/* Nome */}
          <div className="space-y-2">
            <Label htmlFor="nome">
              Nome <span className="text-red-500">*</span>
            </Label>
            <Input
              id="nome"
              value={formData.nome}
              onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
              placeholder="es. Etichetta Olio Sabina DOP"
              className={errors.nome ? 'border-red-500' : ''}
            />
            {errors.nome && (
              <p className="text-sm text-red-600 flex items-center gap-1">
                <AlertCircle size={14} />
                {errors.nome}
              </p>
            )}
          </div>

          {/* Denominazione */}
          <div className="space-y-2">
            <Label htmlFor="denominazione">
              Denominazione <span className="text-red-500">*</span>
            </Label>
            <Input
              id="denominazione"
              value={formData.denominazione}
              onChange={(e) => setFormData({ ...formData, denominazione: e.target.value })}
              placeholder="es. Sabina DOP"
              className={errors.denominazione ? 'border-red-500' : ''}
            />
            {errors.denominazione && (
              <p className="text-sm text-red-600 flex items-center gap-1">
                <AlertCircle size={14} />
                {errors.denominazione}
              </p>
            )}
          </div>

          {/* Produttore e Comune */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="produttore">Produttore</Label>
              <Input
                id="produttore"
                value={formData.produttore}
                onChange={(e) => setFormData({ ...formData, produttore: e.target.value })}
                placeholder="Nome del produttore"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="comune">Comune</Label>
              <Input
                id="comune"
                value={formData.comune}
                onChange={(e) => setFormData({ ...formData, comune: e.target.value })}
                placeholder="es. Rieti"
              />
            </div>
          </div>

          {/* Regione */}
          <div className="space-y-2">
            <Label htmlFor="regioneProduzione">
              Regione di Produzione <span className="text-red-500">*</span>
            </Label>
            <Input
              id="regioneProduzione"
              value={formData.regioneProduzione}
              onChange={(e) => setFormData({ ...formData, regioneProduzione: e.target.value })}
              placeholder="es. Lazio"
              className={errors.regioneProduzione ? 'border-red-500' : ''}
            />
            {errors.regioneProduzione && (
              <p className="text-sm text-red-600 flex items-center gap-1">
                <AlertCircle size={14} />
                {errors.regioneProduzione}
              </p>
            )}
          </div>

          {/* Descrizione */}
          <div className="space-y-2">
            <Label htmlFor="descrizione">Descrizione</Label>
            <Textarea
              id="descrizione"
              value={formData.descrizione}
              onChange={(e) => setFormData({ ...formData, descrizione: e.target.value })}
              rows={3}
              placeholder="Eventuali note aggiuntive sull'etichetta..."
            />
          </div>

          {/* Upload Immagini */}
          <div className="grid grid-cols-2 gap-4">
            {/* Immagine Fronte */}
            <div className="space-y-2">
              <Label>
                Immagine Fronte <span className="text-red-500">*</span>
              </Label>
              <div
                onDragEnter={(e) => handleDrag(e, 'fronte')}
                onDragLeave={(e) => handleDrag(e, 'fronte')}
                onDragOver={(e) => handleDrag(e, 'fronte')}
                onDrop={(e) => handleDrop(e, 'fronte')}
                className={`border-2 border-dashed rounded-lg p-4 text-center transition-colors ${
                  dragActiveFronte
                    ? 'border-blue-500 bg-blue-50'
                    : errors.imageFronte
                    ? 'border-red-500 bg-red-50'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                <input
                  type="file"
                  id="file-fronte"
                  accept="image/*"
                  onChange={(e) => handleFileChange(e.target.files?.[0] || null, 'fronte')}
                  className="hidden"
                />

                {previewFronte ? (
                  <div className="space-y-2">
                    <img
                      src={previewFronte}
                      alt="Preview Fronte"
                      className="max-h-32 mx-auto rounded"
                    />
                    <div className="flex items-center justify-center gap-2 text-xs text-gray-600">
                      <FileText size={14} />
                      <span>{formData.imageFronte?.name}</span>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setFormData({ ...formData, imageFronte: null });
                        setPreviewFronte(null);
                      }}
                      className="text-red-600"
                    >
                      Rimuovi
                    </Button>
                  </div>
                ) : (
                  <>
                    <Upload className="mx-auto mb-2 text-gray-400" size={32} />
                    <p className="text-sm text-gray-700 mb-2">
                      Trascina qui o clicca
                    </p>
                    <Label
                      htmlFor="file-fronte"
                      className="inline-block px-3 py-1.5 bg-blue-500 text-white rounded text-sm cursor-pointer hover:bg-blue-600"
                    >
                      Seleziona
                    </Label>
                  </>
                )}
              </div>
              {errors.imageFronte && (
                <p className="text-sm text-red-600 flex items-center gap-1">
                  <AlertCircle size={14} />
                  {errors.imageFronte}
                </p>
              )}
            </div>

            {/* Immagine Retro */}
            <div className="space-y-2">
              <Label>Immagine Retro (opzionale)</Label>
              <div
                onDragEnter={(e) => handleDrag(e, 'retro')}
                onDragLeave={(e) => handleDrag(e, 'retro')}
                onDragOver={(e) => handleDrag(e, 'retro')}
                onDrop={(e) => handleDrop(e, 'retro')}
                className={`border-2 border-dashed rounded-lg p-4 text-center transition-colors ${
                  dragActiveRetro
                    ? 'border-blue-500 bg-blue-50'
                    : errors.imageRetro
                    ? 'border-red-500 bg-red-50'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                <input
                  type="file"
                  id="file-retro"
                  accept="image/*"
                  onChange={(e) => handleFileChange(e.target.files?.[0] || null, 'retro')}
                  className="hidden"
                />

                {previewRetro ? (
                  <div className="space-y-2">
                    <img
                      src={previewRetro}
                      alt="Preview Retro"
                      className="max-h-32 mx-auto rounded"
                    />
                    <div className="flex items-center justify-center gap-2 text-xs text-gray-600">
                      <FileText size={14} />
                      <span>{formData.imageRetro?.name}</span>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setFormData({ ...formData, imageRetro: null });
                        setPreviewRetro(null);
                      }}
                      className="text-red-600"
                    >
                      Rimuovi
                    </Button>
                  </div>
                ) : (
                  <>
                    <Upload className="mx-auto mb-2 text-gray-400" size={32} />
                    <p className="text-sm text-gray-700 mb-2">
                      Trascina qui o clicca
                    </p>
                    <Label
                      htmlFor="file-retro"
                      className="inline-block px-3 py-1.5 bg-blue-500 text-white rounded text-sm cursor-pointer hover:bg-blue-600"
                    >
                      Seleziona
                    </Label>
                  </>
                )}
              </div>
              {errors.imageRetro && (
                <p className="text-sm text-red-600 flex items-center gap-1">
                  <AlertCircle size={14} />
                  {errors.imageRetro}
                </p>
              )}
            </div>
          </div>

          {/* Footer Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isLoading}
            >
              Annulla
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
              className="flex items-center gap-2"
            >
              {isLoading ? (
                <>
                  <span className="animate-spin">⏳</span>
                  Caricamento...
                </>
              ) : (
                <>
                  <Upload size={18} />
                  Carica Etichetta
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}




