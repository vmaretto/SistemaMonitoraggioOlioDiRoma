# Configurazione Rete e API - Sistema Monitoraggio Olio di Roma

## Stato Configurazione

### Completato

- **File .env.local creato** con configurazione di rete completa
- **Porta configurata**: 3000 (standard Next.js)
- **Host configurato**: localhost (per sviluppo locale)
- **NextAuth URL corretto**: http://localhost:3000
- **Script di test aggiornato**: usa la porta corretta (PORT variabile)
- **File .env.example aggiornato**: porta corretta documentata
- **Dipendenze npm installate**: tutte le librerie necessarie

### Configurazione Server di Rete

Il server Next.js è configurato per ascoltare su:

```
URL: http://localhost:3000
Host: localhost
Environment: development
```

## Avvio del Server

### 1. Prerequisiti

Prima di avviare il server, assicurati che:

#### Database PostgreSQL

Il database deve essere accessibile. Verifica la stringa di connessione in `.env.local`:

```bash
DATABASE_URL="postgresql://user:password@localhost:5432/olio_monitoring"
```

#### Generare Prisma Client

**IMPORTANTE**: Se riscontri errori di rete (403) durante il download dei binari Prisma:

```bash
# Ignora errori di checksum (per ambienti offline/firewall)
export PRISMA_ENGINES_CHECKSUM_IGNORE_MISSING=1

# Genera il client Prisma
npx prisma generate

# Sincronizza lo schema con il database
npx prisma db push
```

#### Seed Database (Opzionale)

Per popolare il database con dati di test:

```bash
npm run seed
```

### 2. Avvio Ambiente Sviluppo

```bash
# Naviga nella directory dell'app
cd /home/user/SistemaMonitoraggioOlioDiRoma/sistema_monitoraggio_olio/app

# Avvia il server di sviluppo
npm run dev
```

Il server sarà disponibile su: **http://localhost:3000**

### 3. Avvio Produzione

```bash
# Build per produzione
npm run build

# Avvia server produzione
npm start
```

## Configurazione API SERP

### Provider Configurati

Il sistema supporta 3 provider per il monitoraggio web:

#### 1. SerpAPI - Google News
- **Endpoint**: https://serpapi.com/search.json
- **Variabile**: `SERPAPI_KEY`
- **Uso**: Monitoraggio notizie in tempo reale
- **Rate Limit**: 100 req/min, 10.000 req/ora

#### 2. SerpAPI - Reddit
- **Endpoint**: https://serpapi.com/search.json
- **Variabile**: `SERPAPI_KEY` (stessa chiave)
- **Uso**: Tracking discussioni community
- **Rate Limit**: 100 req/min, 10.000 req/ora

#### 3. Webz.io
- **Endpoint**: https://api.webz.io/filterWebContent
- **Variabile**: `WEBZIO_TOKEN`
- **Uso**: Filtraggio contenuti web avanzato

### Modalità Mock (Testing)

Per testare il sistema **senza chiavi API reali**, il sistema usa automaticamente dati mock:

```bash
# In .env.local
SERPAPI_MOCK=1    # Usa fixture per SerpAPI
WEBZIO_MOCK=1     # Usa fixture per Webz.io
AWARIO_MOCK=1     # Usa fixture per Awario
```

I dati mock sono in `/src/mocks/`:
- `serpapi.google_news.fixture.json`
- `serpapi.reddit.fixture.json`
- `webzio.fixture.json`

### Configurazione Chiavi API Reali

Per usare le API reali, segui questi passaggi:

#### 1. Ottieni le Chiavi API

- **SerpAPI**: https://serpapi.com/manage-api-key
- **Webz.io**: https://webz.io/auth/register

#### 2. Aggiorna .env.local

```bash
# Inserisci le chiavi reali
SERPAPI_KEY=la_tua_chiave_serpapi_qui
WEBZIO_TOKEN=il_tuo_token_webzio_qui

# Disabilita mock mode
SERPAPI_MOCK=0
WEBZIO_MOCK=0
```

#### 3. Riavvia il Server

```bash
# Ctrl+C per fermare il server
# Poi riavvia
npm run dev
```

## Test delle API

### Test Automatizzato

Il sistema include uno script di test completo:

```bash
# Lo script usa automaticamente la porta da .env.local (3000)
./scripts/test_api.sh
```

Lo script testa:
- 32+ endpoint API
- Creazione/lettura/aggiornamento report
- Transizioni di stato
- Sopralluoghi
- Richieste chiarimenti
- Segnalazioni a enti
- Gestione allegati

### Test Manuale Endpoint Specifici

#### Test Providers (con Mock)

```bash
# Test connettività provider con mock attivo
curl -X POST http://localhost:3000/api/providers/test \
  -H 'Content-Type: application/json' \
  -d '{"providers": ["serpapi_google_news", "webzio"], "mockMode": true}' | jq
```

#### Ricerca Diretta su Provider

```bash
# Ricerca diretta (richiede API key o mock mode attivo)
curl -X POST http://localhost:3000/api/providers/search \
  -H 'Content-Type: application/json' \
  -d '{
    "provider": "serpapi_google_news",
    "query": "olio DOP Roma",
    "size": 10
  }' | jq
```

#### Ingestion Multi-Provider

```bash
# Avvia ingestion completa con profilo configurato
curl -X POST http://localhost:3000/api/ingestion/run \
  -H 'Content-Type: application/json' \
  -d '{
    "profileId": "brand_monitoring",
    "mockMode": true
  }' | jq
```

### Profili di Ricerca Preconfigurati

Il sistema include 5 profili intelligenti in `/src/config/searchProfiles.ts`:

1. **brand_monitoring** (Priorità: 9)
   - Monitora: DOP Sabina, IGP Colli Albani, DOP Roma
   - Frequenza: ogni 2 ore

2. **evocazioni_monitoring** (Priorità: 8)
   - Rileva uso improprio/evocativo dei nomi protetti
   - Frequenza: ogni 3 ore

3. **criticita_monitoring** (Priorità: 10) - MASSIMA
   - Contraffazioni, problemi qualità, controlli autorità
   - Frequenza: ogni 1 ora

4. **trend_mercato** (Priorità: 6)
   - Tendenze mercato, export, sostenibilità
   - Frequenza: ogni 6 ore

5. **international_monitoring** (Priorità: 5)
   - Presenza mercato internazionale
   - Frequenza: ogni 8 ore

## Monitoraggio Server

### Verifica Stato Server

```bash
# Check se il server risponde
curl -I http://localhost:3000

# Dovrebbe restituire:
# HTTP/1.1 200 OK
# X-Powered-By: Next.js
```

### Log del Server

I log sono visibili direttamente nel terminale dove hai eseguito `npm run dev`.

Cerca:
- `Ready in XXXms` - Server pronto
- Errori Prisma - Problemi database
- Errori API - Problemi con provider esterni

## Risoluzione Problemi

### Problema: "Prisma Client not initialized"

**Causa**: Prisma non ha generato i client

**Soluzione**:
```bash
export PRISMA_ENGINES_CHECKSUM_IGNORE_MISSING=1
npx prisma generate
npm run dev
```

### Problema: Errore 403 download Prisma binaries

**Causa**: Firewall o restrizioni di rete

**Soluzione**: Imposta variabile d'ambiente per ignorare checksum
```bash
export PRISMA_ENGINES_CHECKSUM_IGNORE_MISSING=1
```

### Problema: "Connection refused" su porta 3000

**Causa**: Server non avviato o porta in uso

**Soluzione**:
```bash
# Verifica processo sulla porta 3000
lsof -i :3000

# Uccidi processo se necessario
kill -9 <PID>

# Riavvia server
npm run dev
```

### Problema: API restituiscono errori 500

**Possibili cause**:
1. Database non configurato → Verifica `DATABASE_URL`
2. Prisma non generato → Esegui `npx prisma generate`
3. Chiavi API mancanti e mock disabilitato → Abilita mock o aggiungi chiavi

### Problema: Rate limit API provider

**Causa**: Troppe richieste ai provider esterni

**Soluzione**:
- Usa mock mode per testing: `SERPAPI_MOCK=1`
- Riduci frequenza ingestion nei profili
- Verifica limiti del tuo piano API

## Configurazione Avanzata

### Ascolto su Rete Esterna

Per rendere il server accessibile dall'esterno (non solo localhost):

```bash
# In .env.local
HOST=0.0.0.0
PORT=3000
```

**ATTENZIONE**: Assicurati di avere misure di sicurezza appropriate!

### HTTPS (Produzione)

Per produzione, usa un reverse proxy come Nginx o Apache:

```nginx
server {
    listen 443 ssl;
    server_name your-domain.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### Variabili d'Ambiente Produzione

```bash
# .env.production
NODE_ENV=production
PORT=3000
HOST=0.0.0.0

NEXTAUTH_URL=https://your-domain.com
NEXTAUTH_SECRET=<genera-chiave-sicura-con-openssl>

DATABASE_URL=postgresql://user:pass@prod-host:5432/db

SERPAPI_KEY=<chiave-produzione>
WEBZIO_TOKEN=<token-produzione>

SERPAPI_MOCK=0
WEBZIO_MOCK=0
```

## Architettura API

### Flusso Ingestion

```
1. POST /api/ingestion/run
   ↓
2. MultiProviderIngestionService carica profilo
   ↓
3. ProviderRegistry crea istanze provider
   ↓
4. Provider.search() → HTTP calls a SerpAPI/Webz.io
   ↓
5. normalize.ts standardizza risultati
   ↓
6. Prisma salva in PostgreSQL
```

### Registry Pattern

Il sistema usa un pattern registry centralizzato:

```typescript
// src/integrations/registry.ts
const registry = new ProviderRegistry();

// Auto-configura da environment
registry.registerFromEnv();

// Ottieni provider
const googleNews = registry.getProvider('serpapi_google_news');
const results = await googleNews.search('olio DOP Roma');
```

### Rate Limiting

I provider hanno rate limiting automatico:

```typescript
// Configurazione in serpapiProviders.ts
{
  maxRequestsPerMinute: 100,
  maxRequestsPerHour: 10000,
  retryAttempts: 3,
  retryDelay: 1000 // ms con exponential backoff
}
```

## Endpoint API Principali

### Monitoraggio & Ingestion

| Endpoint | Metodo | Descrizione |
|----------|--------|-------------|
| `/api/ingestion/run` | POST | Avvia ingestion multi-provider |
| `/api/providers/search` | POST | Ricerca diretta su provider |
| `/api/providers/test` | GET/POST | Test connettività provider |
| `/api/contenuti` | GET/POST | Gestione contenuti monitorati |

### Etichette & Verifiche

| Endpoint | Metodo | Descrizione |
|----------|--------|-------------|
| `/api/etichette` | GET/POST | Gestione etichette ufficiali |
| `/api/etichette/verify` | POST | Verifica etichetta |
| `/api/verifiche` | GET/POST | Record verifiche |

### Alert & Notifiche

| Endpoint | Metodo | Descrizione |
|----------|--------|-------------|
| `/api/alert` | GET/POST | Gestione alert |
| `/api/notifiche` | GET | Lista notifiche |
| `/api/notifiche/send` | POST | Invia notifica |

### Report Ispettori

| Endpoint | Metodo | Descrizione |
|----------|--------|-------------|
| `/api/reports` | GET/POST | Gestione report |
| `/api/reports/[id]` | GET/PUT | Dettaglio report |
| `/api/reports/[id]/transition` | POST | Cambio stato report |
| `/api/reports/[id]/inspections` | GET/POST | Sopralluoghi |
| `/api/reports/[id]/clarifications` | GET/POST | Richieste chiarimenti |
| `/api/reports/[id]/authority-notices` | GET/POST | Segnalazioni enti |

### Analytics & Export

| Endpoint | Metodo | Descrizione |
|----------|--------|-------------|
| `/api/sentiment-analysis` | POST | Analisi sentiment |
| `/api/dashboard/stats` | GET | Statistiche dashboard |
| `/api/export/csv` | GET | Export dati CSV |

## Supporto e Documentazione

### File Importanti

- **Configurazione**: `.env.local`, `.env.example`
- **Schema Database**: `prisma/schema.prisma`
- **Provider Config**: `src/config/searchProfiles.ts`
- **Registry**: `src/integrations/registry.ts`
- **SerpAPI Implementation**: `src/integrations/serpapiProviders.ts`
- **Mock Data**: `src/mocks/*.fixture.json`

### Comandi Utili

```bash
# Installa dipendenze
npm install --legacy-peer-deps

# Genera Prisma client
npx prisma generate

# Sincronizza schema DB
npx prisma db push

# Seed database
npm run seed

# Dev server
npm run dev

# Build produzione
npm run build

# Start produzione
npm start

# Lint
npm run lint

# Test API
./scripts/test_api.sh
```

## Prossimi Passi

1. **Risolvi Problema Prisma**: Configura correttamente i binari Prisma
2. **Setup Database**: Assicurati che PostgreSQL sia accessibile
3. **Ottieni Chiavi API**: Registrati su SerpAPI e Webz.io
4. **Test Completo**: Esegui `./scripts/test_api.sh`
5. **Configura Profili**: Personalizza i profili di ricerca in `searchProfiles.ts`
6. **Monitoring**: Configura monitoraggio per l'ambiente produzione

---

**Configurazione completata con successo!**

Il server è configurato per ascoltare su **http://localhost:3000** con supporto completo per SerpAPI, Webz.io e modalità mock per testing.

Per assistenza: vedi documentazione Next.js e Prisma
