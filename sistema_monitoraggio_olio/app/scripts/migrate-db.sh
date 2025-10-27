#!/bin/bash

# Script per applicare la migration del database dopo le modifiche allo schema Prisma
# Esegui questo script dalla directory sistema_monitoraggio_olio/app

echo "🔄 Applicazione Migration Database..."
echo ""

# Step 1: Ferma il server dev se è in esecuzione
echo "⚠️  IMPORTANTE: Assicurati di aver fermato il server dev (Ctrl+C) prima di continuare!"
echo ""
read -p "Premi INVIO per continuare..."
echo ""

# Step 2: Genera il client Prisma aggiornato
echo "📦 Step 1/3: Generazione Prisma Client..."
npx prisma generate
if [ $? -ne 0 ]; then
    echo "❌ Errore durante la generazione del client Prisma"
    exit 1
fi
echo "✅ Client Prisma generato con successo"
echo ""

# Step 3: Applica le modifiche al database
echo "🗄️  Step 2/3: Applicazione modifiche al database..."
echo ""
echo "Scegli il metodo di migration:"
echo "1) prisma db push (consigliato per development - più veloce)"
echo "2) prisma migrate dev (crea file di migration)"
echo ""
read -p "Scegli (1 o 2): " choice
echo ""

if [ "$choice" = "1" ]; then
    npx prisma db push
    if [ $? -ne 0 ]; then
        echo "❌ Errore durante db push"
        exit 1
    fi
elif [ "$choice" = "2" ]; then
    read -p "Nome della migration (es: add_attachment_fields): " migration_name
    npx prisma migrate dev --name "$migration_name"
    if [ $? -ne 0 ]; then
        echo "❌ Errore durante migrate dev"
        exit 1
    fi
else
    echo "❌ Scelta non valida"
    exit 1
fi
echo "✅ Database aggiornato con successo"
echo ""

# Step 4: Verifica lo schema
echo "🔍 Step 3/3: Verifica dello schema..."
npx prisma validate
if [ $? -ne 0 ]; then
    echo "⚠️  Warning: Lo schema potrebbe avere problemi"
else
    echo "✅ Schema valido"
fi
echo ""

echo "🎉 Migration completata con successo!"
echo ""
echo "📝 Prossimi passi:"
echo "   1. Riavvia il server dev: npm run dev"
echo "   2. Ricarica la pagina nel browser"
echo "   3. Prova nuovamente l'upload degli allegati"
echo ""
