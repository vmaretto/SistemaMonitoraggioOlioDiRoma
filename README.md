# Sistema Monitoraggio Olio di Roma

## Requisiti
- Node.js >= 18
- npm

## Setup locale
1. Clona il repository e passa alla directory principale.
2. Entra nella cartella dell'applicazione:
   ```bash
   cd sistema_monitoraggio_olio/app
   ```
3. Installa le dipendenze:
   ```bash
   npm install
   ```

## Configurazione ambiente
1. Copia `example.env` in `.env` e aggiorna i valori delle variabili:
   ```bash
   cp example.env .env
   ```
2. Compila le variabili richieste nel file `.env`.

## Comandi
- Avvio sviluppo: `npm run dev`
- Build produzione: `npm run build`
- Avvio produzione: `npm start`

## Note di deploy
Esegui `npm run build` e poi `npm start` sull'ambiente di produzione. Assicurati di configurare correttamente le variabili d'ambiente.
