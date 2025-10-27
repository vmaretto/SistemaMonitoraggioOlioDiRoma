# 🚨 QUICK FIX: Errore Upload Allegati

## Errore

```
Unknown argument `originalName`
```

## Causa

Il database non è sincronizzato con lo schema Prisma aggiornato.

---

## ✅ SOLUZIONE RAPIDA (5 minuti)

### 1. Ferma il Server

Nel terminale dove è in esecuzione il server, premi:
```
Ctrl + C
```

### 2. Esegui Migration

```bash
cd /Users/vmaretto/Projects/SistemaMonitoraggioOlioDiRoma/sistema_monitoraggio_olio/app

# Rigenera client Prisma
npx prisma generate

# Sincronizza database
npx prisma db push
```

### 3. Riavvia Server

```bash
npm run dev
```

### 4. Testa

1. Apri: `http://localhost:5000/dashboard/reports`
2. Crea o apri un report
3. Vai al tab "Allegati"
4. Prova l'upload di un file

---

## ✅ Se Funziona

Dovresti vedere:
- ✅ Upload completato senza errori
- ✅ File visualizzato nella lista
- ✅ Nome originale del file preservato
- ✅ Possibilità di modificare metadata

---

## ❌ Se Non Funziona

### Opzione A: Reset Cache

```bash
# Ferma server
Ctrl + C

# Elimina cache
rm -rf .next
rm -rf node_modules/.cache

# Rigenera tutto
npx prisma generate
npx prisma db push

# Riavvia
npm run dev
```

### Opzione B: Verifica Database

```bash
# Apri Prisma Studio
npx prisma studio

# Vai su Model "Attachment"
# Verifica che esistano questi campi:
# - originalName
# - mimeType
# - size
# - storagePath
```

### Opzione C: Consulta Guida Completa

Leggi: [MIGRATION-GUIDE.md](./MIGRATION-GUIDE.md)

---

## 🔍 Verifica Rapida

Dopo la migration, esegui:

```bash
# Dovrebbe stampare lo schema senza errori
npx prisma validate
```

Se vedi:
```
✔ Prisma schema is valid
```

✅ Tutto OK!

---

## 📝 Note

- **Non serve riavviare PostgreSQL**
- **Non serve reinstallare dipendenze**
- **I dati esistenti non vengono persi**
- La migration aggiunge solo nuove colonne

---

**Tempo stimato**: 3-5 minuti
**Difficoltà**: Bassa
**Rischio**: Nessuno (non elimina dati)
