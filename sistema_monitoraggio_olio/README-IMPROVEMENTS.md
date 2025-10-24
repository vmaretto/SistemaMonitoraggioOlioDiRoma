# Sistema Monitoraggio Olio di Roma - Miglioramenti Report System

## 📋 Panoramica

Questo documento descrive i miglioramenti implementati al sistema di gestione dei report, includendo un sistema completo di gestione allegati, workflow strutturato per le transizioni di stato, e nuove entità per tracciare ispezioni, chiarimenti e segnalazioni alle autorità.

## 🆕 Modifiche Implementate

### 1. Schema Database Esteso

#### Modelli Aggiornati

**Report**
- Nuovi campi: `priorita`, `tipo`, `scadenza`, `motivoChiusura`, `dataChiusura`
- Nuove relazioni: `stateChanges`, `feedbacks`
- Nuovi enum: `ReportPriority`, `ReportType`
- Nuovi stati workflow: `BOZZA`, `IN_LAVORAZIONE`, `IN_VERIFICA`, `RICHIESTA_CHIARIMENTI`, `SEGNALATO_AUTORITA`, `CHIUSO`, `ARCHIVIATO`

**Attachment** (Completamente rivisitato)
- Campi completi per gestione file: `filename`, `originalName`, `mimeType`, `size`, `url`, `storagePath`
- Categorizzazione: `tipo` (12 tipi predefiniti), `descrizione`, `tags`
- Relazioni multiple: supporto per `Report`, `Inspection`, `ClarificationRequest`, `AuthorityNotice`, `ReportStateChange`
- Enum `AttachmentType`: GENERICO, FOTOGRAFIA, CERTIFICATO, ANALISI_LABORATORIO, etc.

**Inspection** (Esteso)
- Nuovi campi workflow: `tipo`, `stato`, `esito`, `risultati`, `noteInterne`, `raccomandazioni`
- Follow-up: `richiedeFollowUp`, `dataFollowUp`
- Enum: `InspectionType`, `InspectionStatus`, `InspectionOutcome`
- Relazione allegati

**ClarificationRequest** (Esteso)
- Campi completi: `destinatario`, `emailDestinatario`, `oggetto`, `domande`, `stato`
- Gestione risposta: `dataRisposta`, `risposta`, `risposte` (JSON)
- Timeline: `dataInvio`, `dataScadenza`
- Enum: `ClarificationRecipient`, `ClarificationStatus`

**AuthorityNotice** (Esteso)
- Dettagli autorità: `autorita`, `denominazione`, `emailAutorita`
- Contenuto: `oggetto`, `testo`, `violazioni`, `gravita`
- Workflow: `stato`, `dataInvio`, `dataRiscontro`, `numeroProtocollo`
- Esito: `esito`, `azioniIntraprese`
- Enum: `AuthorityType`, `NoticeSeverity`, `AuthorityNoticeStatus`

#### Nuovi Modelli

**ReportStateChange**
- Storico completo transizioni di stato
- Campi: `statoPrec`, `statoNuovo`, `motivo`, `note`, `metadata`, `userId`
- Supporto allegati specifici per transizione
- Metadata JSON per dati contestuali

**ReportFeedback**
- Sistema feedback strutturato
- Campi: `tipo`, `testo`, `valutazione`, `userId`
- Enum: `FeedbackType`

### 2. Servizio Storage (`lib/storage-service.ts`)

#### Funzionalità
- **Storage Flessibile**: Supporto storage locale e S3/compatibili (MinIO, Cloudflare R2)
- **Upload Files**: Upload singolo e multiplo con validazione
- **Gestione File**: Delete, signed URLs, metadata
- **Validazione**: Tipo MIME, dimensione, estensioni
- **Organizzazione**: Path strutturati per contesto e data

#### Configurazione
```env
USE_LOCAL_STORAGE=true          # true per locale, false per S3
LOCAL_STORAGE_PATH=./uploads    # Path storage locale

# S3 Config (se USE_LOCAL_STORAGE=false)
AWS_REGION=eu-west-1
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
S3_BUCKET_NAME=...
S3_ENDPOINT=...
```

#### API Esportate
```typescript
uploadFile(options): Promise<UploadFileResult>
uploadFiles(filesOptions): Promise<UploadFileResult[]>
deleteFile(options): Promise<void>
getSignedFileUrl(storagePath, expiresIn): Promise<string>
validateFile(file, options): FileValidationResult
```

### 3. API Routes

#### POST /api/attachments
Upload file con metadata

**Request**: FormData
- `files`: File[] (multipli)
- `context`: string (report, inspection, etc.)
- `reportId`, `inspectionId`, etc.: string (opzionali)
- `tipo`: AttachmentType
- `descrizione`: string
- `tags`: string[]

**Response**:
```json
{
  "success": true,
  "data": [...],
  "message": "N file caricati con successo"
}
```

#### GET /api/attachments
Recupera allegati con filtri

**Query Params**: `reportId`, `inspectionId`, `clarificationId`, `authorityNoticeId`, `stateChangeId`, `context`

#### PATCH /api/attachments
Aggiorna metadata allegato

**Request Body**:
```json
{
  "id": "attachment_id",
  "tipo": "CERTIFICATO",
  "descrizione": "...",
  "tags": ["tag1", "tag2"]
}
```

#### DELETE /api/attachments
Elimina allegato (file + database)

**Query Params**: `id=attachment_id`

#### POST /api/reports/[id]/transition
Esegue transizione di stato con creazione automatica entità

**Request Body**:
```json
{
  "targetStatus": "IN_VERIFICA",
  "motivo": "...",
  "note": "...",
  "attachmentIds": [...],
  "metadata": {
    "type": "inspection",
    "tipoIspezione": "DOCUMENTALE",
    "dataIspezione": "2024-10-25",
    "luogo": "...",
    "ispettore": "..."
  }
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "report": {...},
    "stateChange": {...},
    "createdEntity": {...}
  }
}
```

#### GET /api/reports/[id]/transition
Recupera storico transizioni e stato corrente

**Response**:
```json
{
  "success": true,
  "data": {
    "currentStatus": "IN_LAVORAZIONE",
    "availableTransitions": ["IN_VERIFICA", "RICHIESTA_CHIARIMENTI", ...],
    "stateChanges": [...],
    "inspections": [...],
    "clarifications": [...],
    "authorityNotices": [...]
  }
}
```

### 4. Componenti React

#### AttachmentManager (`components/reports/attachment-manager.tsx`)

Componente completo per gestione allegati con:
- **Drag & Drop**: Upload intuitivo con react-dropzone
- **Upload Multiplo**: Caricamento simultaneo file
- **Preview**: Anteprima immagini e PDF inline
- **Metadata Editing**: Form per tipo, descrizione, tags
- **Download**: Scaricamento diretto file
- **Delete**: Rimozione con conferma
- **Validazione**: Tipo e dimensione file

**Utilizzo**:
```tsx
import { AttachmentManager } from '@/components/reports/attachment-manager';

<AttachmentManager
  reportId={reportId}
  context="report"
  attachments={attachments}
  onAttachmentsChange={setAttachments}
  maxFileSize={10}
  acceptedFileTypes={['image/*', 'application/pdf']}
/>
```

#### StateTransitionDialog (`components/reports/state-transition-dialog.tsx`)

Dialog dinamico per transizioni di stato con:
- **Form Dinamici**: Basati su stato target
- **Form Ispezione**: Tipo, data, luogo, ispettore
- **Form Chiarimenti**: Destinatario, oggetto, domande, scadenza
- **Form Autorità**: Autorità, violazioni, gravità
- **Form Chiusura**: Motivo dettagliato (min 20 caratteri)
- **Allegati**: Integrazione AttachmentManager
- **Validazione**: Zod schema validation

**Utilizzo**:
```tsx
import { StateTransitionDialog } from '@/components/reports/state-transition-dialog';

<StateTransitionDialog
  open={showDialog}
  onOpenChange={setShowDialog}
  reportId={reportId}
  currentStatus={report.status}
  targetStatus={targetStatus}
  onConfirm={handleTransition}
/>
```

## 🔄 Workflow Report

### Diagramma Stati

```
BOZZA
  ↓
IN_LAVORAZIONE
  ↓ ↘ ↘
IN_VERIFICA  RICHIESTA_CHIARIMENTI  SEGNALATO_AUTORITA
  ↓               ↓                       ↓
  ↓               ↓                       ↓
  ↘               ↓                       ↙
        CHIUSO ← ← ← ← ← ← ← ← ← ← ←
          ↓
      ARCHIVIATO
```

### Transizioni con Entità Create

1. **IN_LAVORAZIONE → IN_VERIFICA**: Crea `Inspection` (PIANIFICATA)
2. **IN_LAVORAZIONE → RICHIESTA_CHIARIMENTI**: Crea `ClarificationRequest` (INVIATA)
3. **IN_LAVORAZIONE → SEGNALATO_AUTORITA**: Crea `AuthorityNotice` (PREPARATA)
4. **Qualsiasi → CHIUSO**: Aggiorna `Report.dataChiusura` e `motivoChiusura`

## 📦 Dipendenze Aggiunte

```json
{
  "@aws-sdk/client-s3": "^3.x",
  "@aws-sdk/s3-request-presigner": "^3.x"
}
```

Già presenti (utilizzate):
- `react-dropzone`: Upload drag & drop
- `react-hook-form`: Form management
- `zod`: Validation
- `date-fns`: Date utilities

## 🚀 Setup e Deployment

### 1. Installazione Dipendenze

```bash
cd sistema_monitoraggio_olio/app
npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner --legacy-peer-deps
```

### 2. Configurazione Ambiente

Copia `.env.example` in `.env` e configura:

```bash
# Storage locale (default)
USE_LOCAL_STORAGE=true
LOCAL_STORAGE_PATH=./uploads

# O S3/Cloud
USE_LOCAL_STORAGE=false
AWS_REGION=eu-west-1
AWS_ACCESS_KEY_ID=your_key
AWS_SECRET_ACCESS_KEY=your_secret
S3_BUCKET_NAME=your_bucket
```

### 3. Database Migration

```bash
# Genera Prisma Client
npx prisma generate

# Applica migration (crea tabelle/colonne)
npx prisma db push

# O crea migration nominata
npx prisma migrate dev --name add_improved_report_system
```

### 4. Storage Setup

#### Storage Locale
```bash
mkdir -p ./uploads
chmod 755 ./uploads
```

#### S3/Cloud
1. Crea bucket S3 (o equivalente)
2. Configura IAM policy per upload/delete
3. Abilita CORS se necessario
4. Aggiorna variabili `.env`

### 5. Deploy

Il sistema è compatibile con:
- **Vercel**: Usa S3 per storage
- **AWS**: EC2/Elastic Beanstalk + S3
- **Self-hosted**: Docker con volume per uploads o S3

## 📚 Esempi di Utilizzo

### Esempio 1: Upload Allegato da Report

```tsx
'use client';

import { useState } from 'react';
import { AttachmentManager, AttachmentFile } from '@/components/reports/attachment-manager';

export default function ReportDetailPage({ reportId }: { reportId: string }) {
  const [attachments, setAttachments] = useState<AttachmentFile[]>([]);

  return (
    <div>
      <h2>Allegati Report</h2>
      <AttachmentManager
        reportId={reportId}
        context="report"
        attachments={attachments}
        onAttachmentsChange={setAttachments}
        maxFileSize={10}
      />
    </div>
  );
}
```

### Esempio 2: Transizione Stato con Ispezione

```tsx
'use client';

import { useState } from 'react';
import { StateTransitionDialog } from '@/components/reports/state-transition-dialog';
import { Button } from '@/components/ui/button';

export default function ReportActions({ report }: { report: any }) {
  const [showDialog, setShowDialog] = useState(false);

  const handleTransition = async (data: any) => {
    const response = await fetch(`/api/reports/${report.id}/transition`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        targetStatus: 'IN_VERIFICA',
        ...data
      })
    });

    if (response.ok) {
      // Refresh data
      window.location.reload();
    }
  };

  return (
    <>
      <Button onClick={() => setShowDialog(true)}>
        Pianifica Ispezione
      </Button>

      <StateTransitionDialog
        open={showDialog}
        onOpenChange={setShowDialog}
        reportId={report.id}
        currentStatus={report.status}
        targetStatus="IN_VERIFICA"
        onConfirm={handleTransition}
      />
    </>
  );
}
```

### Esempio 3: Recupero Storico Transizioni

```tsx
'use client';

import { useEffect, useState } from 'react';

export default function ReportHistory({ reportId }: { reportId: string }) {
  const [history, setHistory] = useState<any>(null);

  useEffect(() => {
    fetch(`/api/reports/${reportId}/transition`)
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setHistory(data.data);
        }
      });
  }, [reportId]);

  if (!history) return <div>Caricamento...</div>;

  return (
    <div>
      <h3>Stato Corrente: {history.currentStatus}</h3>

      <h4>Storico Transizioni</h4>
      {history.stateChanges.map((change: any) => (
        <div key={change.id}>
          <p>{change.statoPrec} → {change.statoNuovo}</p>
          <p>{change.motivo}</p>
          <p>{new Date(change.createdAt).toLocaleString()}</p>
        </div>
      ))}

      <h4>Ispezioni</h4>
      {history.inspections.map((insp: any) => (
        <div key={insp.id}>
          <p>{insp.tipo} - {insp.stato}</p>
          <p>{new Date(insp.date).toLocaleDateString()}</p>
        </div>
      ))}
    </div>
  );
}
```

## 🔒 Sicurezza

### Validazione File
- **MIME type**: Verifica tipo file
- **Dimensione**: Limite configurabile per contesto
- **Estensione**: Whitelist estensioni permesse

### Storage
- **S3 Bucket**: Privato, accesso via signed URLs
- **IAM Policy**: Permessi minimi necessari
- **Encryption**: Supporto encryption at rest

### API Routes
- **Authentication**: Tutte le route richiedono sessione
- **Authorization**: Verifica ownership per delete/update
- **Validation**: Zod schema per input

## 🐛 Troubleshooting

### Prisma Generate Fallisce
```bash
# Ignora checksum errors (ambiente offline)
PRISMA_ENGINES_CHECKSUM_IGNORE_MISSING=1 npx prisma generate
```

### Upload Fallisce
1. Verifica variabili `.env`
2. Controlla permessi directory uploads (locale)
3. Verifica credenziali S3 (cloud)
4. Controlla dimensione file vs limite

### Stati Legacy
Il sistema supporta retrocompatibilità con stati vecchi:
- `ANALISI` → mappato a `IN_LAVORAZIONE`
- `ARCHIVIATA` → mappato a `ARCHIVIATO`
- `CHIUSA` → mappato a `CHIUSO`

## 📈 Metriche e Monitoraggio

### ActionLog
Ogni operazione crea entry in `ActionLog`:
- Upload allegato
- Delete allegato
- Transizione stato
- Creazione entità

### ReportStateChange
Storico completo transizioni con:
- Stati precedente/nuovo
- Motivo e note
- Metadata contestuale
- Allegati specifici

## 🎯 Prossimi Sviluppi

Possibili estensioni future:
1. **Email Notifications**: Alert su transizioni
2. **PDF Export**: Report completo con allegati
3. **OCR Integration**: Estrazione testo da immagini
4. **Digital Signature**: Firma documenti
5. **Mobile App**: Upload foto da campo
6. **Analytics Dashboard**: KPI e trend

## 📞 Supporto

Per problemi o domande:
- Consulta questa documentazione
- Verifica schema Prisma (`prisma/schema.prisma`)
- Controlla log applicazione
- Apri issue su GitHub

---

**Versione**: 2.0.0
**Data Implementazione**: Ottobre 2024
**Autore**: Claude Code Implementation
