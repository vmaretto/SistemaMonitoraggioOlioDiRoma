# 🔄 Guida Migration Database

## Problema Riscontrato

```
Error: Unknown argument `originalName`
```

Questo errore indica che il database non è stato aggiornato dopo le modifiche allo schema Prisma. Il client Prisma sta usando uno schema vecchio.

---

## ✅ Soluzione: Applica la Migration

### Prerequisiti

- [ ] Ferma il server dev (`Ctrl+C` nel terminale dove è in esecuzione)
- [ ] Assicurati di avere PostgreSQL in esecuzione
- [ ] Backup del database (opzionale ma consigliato)

---

## 📝 Metodo 1: Manuale (Consigliato)

Esegui questi comandi **sul tuo Mac** nella directory del progetto:

```bash
cd /Users/vmaretto/Projects/SistemaMonitoraggioOlioDiRoma/sistema_monitoraggio_olio/app

# Step 1: Genera il client Prisma aggiornato
npx prisma generate

# Step 2: Applica le modifiche al database
npx prisma db push

# Step 3: Verifica che tutto sia OK
npx prisma validate

# Step 4: Riavvia il server
npm run dev
```

### Spiegazione Comandi

- **`prisma generate`**: Rigenera il client TypeScript con le nuove definizioni dello schema
- **`prisma db push`**: Sincronizza il database con lo schema Prisma (development)
- **`prisma validate`**: Verifica che lo schema sia corretto
- **`npm run dev`**: Riavvia il server Next.js

---

## 📝 Metodo 2: Con Migration File (Produzione)

Se vuoi creare un file di migration per tracciare le modifiche:

```bash
cd /Users/vmaretto/Projects/SistemaMonitoraggioOlioDiRoma/sistema_monitoraggio_olio/app

# Crea migration con nome descrittivo
npx prisma migrate dev --name add_attachment_fields

# Riavvia il server
npm run dev
```

Questo creerà un file in `prisma/migrations/` con le modifiche SQL.

---

## 📝 Metodo 3: Script Automatico

```bash
cd /Users/vmaretto/Projects/SistemaMonitoraggioOlioDiRoma/sistema_monitoraggio_olio/app

# Rendi eseguibile lo script
chmod +x scripts/migrate-db.sh

# Esegui lo script
./scripts/migrate-db.sh
```

Lo script ti guiderà passo-passo.

---

## 🔍 Verifica Post-Migration

Dopo aver applicato la migration, verifica che i nuovi campi esistano:

```bash
# Apri Prisma Studio per vedere il database
npx prisma studio
```

Oppure controlla via SQL:

```bash
# Connettiti al database PostgreSQL
psql -d <database_name> -U <username>

# Verifica la struttura della tabella
\d "Attachment"
```

Dovresti vedere questi campi:
- ✅ `id`
- ✅ `filename`
- ✅ `originalName` ← **NUOVO**
- ✅ `mimeType` ← **NUOVO**
- ✅ `size` ← **NUOVO**
- ✅ `url`
- ✅ `storagePath` ← **NUOVO**
- ✅ `tipo`
- ✅ `descrizione`
- ✅ `tags`
- ✅ `reportId`
- ✅ `inspectionId`
- ✅ `clarificationId`
- ✅ `authorityNoticeId`
- ✅ `stateChangeId`
- ✅ `uploadedBy`
- ✅ `uploadedAt`
- ✅ `entityType`
- ✅ `entityId`

---

## 🧪 Test Post-Migration

1. **Riavvia il server dev**:
   ```bash
   npm run dev
   ```

2. **Apri il browser**: `http://localhost:5000/dashboard/reports`

3. **Crea un nuovo report o apri uno esistente**

4. **Vai al tab "Allegati"**

5. **Prova l'upload**:
   - Drag & drop un file
   - Oppure clicca per selezionare

6. **Verifica**:
   - ✅ L'upload dovrebbe completarsi senza errori
   - ✅ Il file dovrebbe apparire nella lista
   - ✅ Dovresti vedere il nome originale del file
   - ✅ Puoi modificare metadata (tipo, descrizione, tags)

---

## ❌ Troubleshooting

### Errore: "Could not connect to the database"

**Soluzione**:
```bash
# Verifica che PostgreSQL sia in esecuzione
pg_ctl status

# O su macOS con Homebrew
brew services list | grep postgresql

# Avvia PostgreSQL se necessario
brew services start postgresql@14
```

### Errore: "Environment variable not found: DATABASE_URL"

**Soluzione**:
```bash
# Copia .env.example in .env se non esiste
cp .env.example .env

# Modifica .env con le tue credenziali database
nano .env
```

### Errore: "Prisma engines not downloaded"

**Soluzione**:
```bash
# Forza il download dei binari
npx prisma generate --force

# O usa questo se sei offline
PRISMA_SKIP_ENGINE_VALIDATION=1 npx prisma generate
```

### Errore persiste dopo migration

**Soluzione**:
1. Ferma completamente il server (anche processi in background)
2. Elimina la cache:
   ```bash
   rm -rf .next
   rm -rf node_modules/.cache
   ```
3. Rigenera il client:
   ```bash
   npx prisma generate
   npx prisma db push
   ```
4. Riavvia:
   ```bash
   npm run dev
   ```

---

## 📊 Modifiche Applicate

### Schema Prisma: Modello `Attachment`

```prisma
model Attachment {
  id         String   @id @default(cuid())
  filename   String
  originalName String  // ← AGGIUNTO
  mimeType   String   // ← AGGIUNTO
  size       Int      // ← AGGIUNTO
  url        String
  storagePath String  // ← AGGIUNTO

  // Categorizzazione
  tipo            AttachmentType  @default(GENERICO)
  descrizione     String?         @db.Text
  tags            String[]

  // Relazioni multiple (opzionali)
  reportId            String?
  report              Report?                @relation(...)

  inspectionId        String?
  inspection          Inspection?            @relation(...)

  clarificationId     String?
  clarification       ClarificationRequest?  @relation(...)

  authorityNoticeId   String?
  authorityNotice     AuthorityNotice?       @relation(...)

  stateChangeId       String?
  stateChange         ReportStateChange?     @relation(...)

  uploadedBy String
  uploadedAt DateTime @default(now())

  // Campi legacy per compatibilità
  entityType String?
  entityId   String?

  @@index([reportId])
  @@index([inspectionId])
  @@index([clarificationId])
  @@index([authorityNoticeId])
  @@index([stateChangeId])
  @@index([entityType, entityId])
}

enum AttachmentType {
  GENERICO
  FOTOGRAFIA
  CERTIFICATO
  ANALISI_LABORATORIO
  DOCUMENTO_UFFICIALE
  COMUNICAZIONE
  FATTURA
  CONTRATTO
  ETICHETTA
  SCREENSHOT
  REPORT_PDF
  ALTRO
}
```

### Campi Aggiunti

| Campo | Tipo | Descrizione |
|-------|------|-------------|
| `originalName` | `String` | Nome originale del file (es: "Screenshot 2025-10-27 (08.16.18).png") |
| `mimeType` | `String` | Tipo MIME (es: "image/png", "application/pdf") |
| `size` | `Int` | Dimensione in bytes |
| `storagePath` | `String` | Percorso relativo nel sistema di storage |

---

## 🚀 Prossimi Passi Dopo Migration

1. ✅ **Test Upload Allegati**
   - Carica immagini, PDF, documenti Word
   - Verifica preview inline
   - Testa download

2. ✅ **Test Metadata**
   - Modifica tipo documento
   - Aggiungi descrizione
   - Aggiungi tags

3. ✅ **Test Transizioni Stato**
   - Prova transizione a IN_VERIFICA con allegati
   - Verifica creazione automatica Inspection
   - Controlla che allegati siano collegati

4. ✅ **Test Delete**
   - Elimina allegato
   - Verifica che file venga rimosso da storage
   - Verifica che contatore si aggiorni

---

## 📞 Supporto

Se il problema persiste dopo aver seguito questa guida:

1. Verifica i log del server per altri errori
2. Controlla il file `.env` per configurazione corretta
3. Verifica che PostgreSQL sia in esecuzione
4. Prova a rifare la migration da zero (vedi sotto)

### Reset Completo Database (⚠️ ATTENZIONE: Elimina tutti i dati)

```bash
# Backup prima!
pg_dump -U postgres olio_monitoring > backup.sql

# Reset database
npx prisma migrate reset

# Applica tutte le migration
npx prisma migrate dev
```

---

**Autore**: Sistema Monitoraggio Olio - Team Development
**Data**: Ottobre 2024
**Versione**: 2.0.1
