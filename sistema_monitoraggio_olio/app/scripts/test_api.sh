#!/bin/bash

# Script di test per API Sistema Tracciabilità Ispettori
# Testa tutti gli endpoint implementati per il workflow dei report

BASE_URL="http://localhost:5000"
API_BASE="$BASE_URL/api"

# Colori per output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Variabili per memorizzare ID creati durante i test
CREATED_REPORT_ID=""
CREATED_INSPECTION_ID=""
CREATED_CLARIFICATION_ID=""
CREATED_AUTHORITY_NOTICE_ID=""
CREATED_ATTACHMENT_ID=""

# Funzioni di utilità
print_header() {
    echo -e "\n${BLUE}=== $1 ===${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

test_endpoint() {
    local method=$1
    local endpoint=$2
    local data=$3
    local expected_status=$4
    local description=$5

    echo -e "\n${YELLOW}Testing: $description${NC}"
    echo "Method: $method"
    echo "Endpoint: $endpoint"
    
    if [ -n "$data" ]; then
        echo "Data: $data"
        response=$(curl -s -w "\n%{http_code}" -X $method "$endpoint" \
                   -H "Content-Type: application/json" \
                   -d "$data")
    else
        response=$(curl -s -w "\n%{http_code}" -X $method "$endpoint")
    fi

    response_body=$(echo "$response" | head -n -1)
    http_code=$(echo "$response" | tail -n 1)

    echo "Response Code: $http_code"
    echo "Response: $response_body" | jq '.' 2>/dev/null || echo "$response_body"

    if [ "$http_code" -eq "$expected_status" ]; then
        print_success "Test passed (expected $expected_status, got $http_code)"
    else
        print_error "Test failed (expected $expected_status, got $http_code)"
    fi

    # Estrai ID se necessario
    if [ "$method" = "POST" ] && [ "$http_code" -eq "201" ]; then
        case "$endpoint" in
            *"/reports")
                CREATED_REPORT_ID=$(echo "$response_body" | jq -r '.report.id' 2>/dev/null)
                echo "Created Report ID: $CREATED_REPORT_ID"
                ;;
            *"/inspections")
                CREATED_INSPECTION_ID=$(echo "$response_body" | jq -r '.inspection.id' 2>/dev/null)
                echo "Created Inspection ID: $CREATED_INSPECTION_ID"
                ;;
            *"/clarifications")
                CREATED_CLARIFICATION_ID=$(echo "$response_body" | jq -r '.clarification.id' 2>/dev/null)
                echo "Created Clarification ID: $CREATED_CLARIFICATION_ID"
                ;;
            *"/authority-notices")
                CREATED_AUTHORITY_NOTICE_ID=$(echo "$response_body" | jq -r '.authorityNotice.id' 2>/dev/null)
                echo "Created Authority Notice ID: $CREATED_AUTHORITY_NOTICE_ID"
                ;;
            *"/attachments")
                CREATED_ATTACHMENT_ID=$(echo "$response_body" | jq -r '.attachment.id' 2>/dev/null)
                echo "Created Attachment ID: $CREATED_ATTACHMENT_ID"
                ;;
        esac
    fi

    return $http_code
}

print_header "SETUP - Recupero ID report esistenti dal seed"

# Recupera lista report per ottenere ID di test
echo -e "\n${YELLOW}Recuperando report esistenti...${NC}"
reports_response=$(curl -s "$API_BASE/reports" | jq '.')
echo "$reports_response"

# Estrai alcuni ID dai report esistenti per i test
SEED_REPORT_ANALISI=$(echo "$reports_response" | jq -r '.reports[] | select(.status=="ANALISI") | .id' | head -n 1)
SEED_REPORT_IN_CONTROLLO=$(echo "$reports_response" | jq -r '.reports[] | select(.status=="IN_CONTROLLO") | .id' | head -n 1)
SEED_REPORT_VERIFICA_SOPRALLUOGO=$(echo "$reports_response" | jq -r '.reports[] | select(.status=="VERIFICA_SOPRALLUOGO") | .id' | head -n 1)
SEED_REPORT_IN_ATTESA_FEEDBACK=$(echo "$reports_response" | jq -r '.reports[] | select(.status=="IN_ATTESA_FEEDBACK_ENTE") | .id' | head -n 1)

echo "Report ANALISI: $SEED_REPORT_ANALISI"
echo "Report IN_CONTROLLO: $SEED_REPORT_IN_CONTROLLO"
echo "Report VERIFICA_SOPRALLUOGO: $SEED_REPORT_VERIFICA_SOPRALLUOGO"
echo "Report IN_ATTESA_FEEDBACK: $SEED_REPORT_IN_ATTESA_FEEDBACK"

print_header "TEST 1: GESTIONE REPORT BASE"

# 1.1 Lista tutti i report
test_endpoint "GET" "$API_BASE/reports" "" 200 "Lista tutti i report"

# 1.2 Lista report filtrati per stato
test_endpoint "GET" "$API_BASE/reports?status=ANALISI" "" 200 "Lista report in ANALISI"

# 1.3 Crea nuovo report
test_endpoint "POST" "$API_BASE/reports" '{
    "title": "Test Report API",
    "description": "Report creato tramite test automatizzato delle API"
}' 201 "Crea nuovo report"

# 1.4 Dettaglio report (usa ID appena creato)
if [ -n "$CREATED_REPORT_ID" ]; then
    test_endpoint "GET" "$API_BASE/reports/$CREATED_REPORT_ID" "" 200 "Dettaglio report creato"
fi

print_header "TEST 2: TRANSIZIONI DI STATO"

# 2.1 Transizioni disponibili per report in ANALISI
if [ -n "$SEED_REPORT_ANALISI" ]; then
    test_endpoint "GET" "$API_BASE/reports/$SEED_REPORT_ANALISI/transition" "" 200 "Transizioni disponibili report ANALISI"
fi

# 2.2 Transizione ANALISI -> IN_CONTROLLO
if [ -n "$SEED_REPORT_ANALISI" ]; then
    test_endpoint "POST" "$API_BASE/reports/$SEED_REPORT_ANALISI/transition" '{
        "to": "IN_CONTROLLO",
        "note": "Test transizione automatizzata - analisi completata"
    }' 200 "Transizione ANALISI -> IN_CONTROLLO"
fi

# 2.3 Transizione non consentita (dovrebbe fallire)
if [ -n "$CREATED_REPORT_ID" ]; then
    test_endpoint "POST" "$API_BASE/reports/$CREATED_REPORT_ID/transition" '{
        "to": "CHIUSA",
        "note": "Test transizione non consentita"
    }' 400 "Transizione non consentita (ANALISI -> CHIUSA)"
fi

print_header "TEST 3: SOPRALLUOGHI"

# 3.1 Crea sopralluogo per report in controllo
if [ -n "$SEED_REPORT_IN_CONTROLLO" ]; then
    test_endpoint "POST" "$API_BASE/reports/$SEED_REPORT_IN_CONTROLLO/inspections" '{
        "date": "2025-01-15T10:00:00Z",
        "location": "Frantoio Test - Via API Test 123",
        "minutesText": "Verbale di test automatizzato: Controllo effettuato tramite API. Tutte le verifiche completate con esito positivo.",
        "outcome": "CONFORME - Test API completato"
    }' 201 "Crea sopralluogo con verbale"
fi

# 3.2 Lista sopralluoghi per report
if [ -n "$SEED_REPORT_VERIFICA_SOPRALLUOGO" ]; then
    test_endpoint "GET" "$API_BASE/reports/$SEED_REPORT_VERIFICA_SOPRALLUOGO/inspections" "" 200 "Lista sopralluoghi report"
fi

# 3.3 Chiudi report da sopralluogo
if [ -n "$SEED_REPORT_VERIFICA_SOPRALLUOGO" ]; then
    test_endpoint "POST" "$API_BASE/reports/$SEED_REPORT_VERIFICA_SOPRALLUOGO/close-from-inspection" '{
        "note": "Test chiusura da API - sopralluogo completato con esito positivo"
    }' 200 "Chiudi report da sopralluogo"
fi

print_header "TEST 4: RICHIESTE CHIARIMENTI"

# 4.1 Crea richiesta chiarimenti
if [ -n "$SEED_REPORT_IN_CONTROLLO" ]; then
    test_endpoint "POST" "$API_BASE/reports/$SEED_REPORT_IN_CONTROLLO/clarifications" '{
        "question": "Test API: Richiedere chiarimenti su conformità etichettatura prodotto XYZ?",
        "dueAt": "2025-02-01T12:00:00Z"
    }' 201 "Crea richiesta chiarimenti"
fi

# 4.2 Lista chiarimenti per report  
if [ -n "$SEED_REPORT_IN_CONTROLLO" ]; then
    test_endpoint "GET" "$API_BASE/reports/$SEED_REPORT_IN_CONTROLLO/clarifications" "" 200 "Lista chiarimenti report"
fi

print_header "TEST 5: SEGNALAZIONI ENTE"

# 5.1 Crea segnalazione a ente
if [ -n "$SEED_REPORT_IN_CONTROLLO" ]; then
    test_endpoint "POST" "$API_BASE/reports/$SEED_REPORT_IN_CONTROLLO/authority-notices" '{
        "authority": "ICQRF - Test API",
        "protocol": "TEST-API-001",
        "note": "Segnalazione automatizzata per test API"
    }' 201 "Crea segnalazione ente"
fi

# 5.2 Lista segnalazioni per report
if [ -n "$SEED_REPORT_IN_ATTESA_FEEDBACK" ]; then
    test_endpoint "GET" "$API_BASE/reports/$SEED_REPORT_IN_ATTESA_FEEDBACK/authority-notices" "" 200 "Lista segnalazioni ente"
fi

print_header "TEST 6: ALLEGATI"

# 6.1 Aggiungi allegato a report
if [ -n "$CREATED_REPORT_ID" ]; then
    test_endpoint "POST" "$API_BASE/attachments" '{
        "reportId": "'$CREATED_REPORT_ID'",
        "entityType": "REPORT",
        "entityId": "'$CREATED_REPORT_ID'",
        "filename": "test-document-api.pdf",
        "url": "/uploads/test/test-document-api.pdf"
    }' 201 "Aggiungi allegato a report"
fi

# 6.2 Lista allegati per report
if [ -n "$CREATED_REPORT_ID" ]; then
    test_endpoint "GET" "$API_BASE/reports/$CREATED_REPORT_ID/attachments" "" 200 "Lista allegati report"
fi

# 6.3 Lista tutti gli allegati con filtri
test_endpoint "GET" "$API_BASE/attachments?entityType=REPORT" "" 200 "Lista allegati filtrati per tipo"

print_header "TEST 7: VALIDAZIONI E CASI EDGE"

# 7.1 Crea report con dati mancanti (dovrebbe fallire)
test_endpoint "POST" "$API_BASE/reports" '{
    "description": "Report senza titolo"
}' 400 "Validazione creazione report (titolo mancante)"

# 7.2 Dettaglio report inesistente
test_endpoint "GET" "$API_BASE/reports/report-inesistente-123" "" 404 "Report inesistente"

# 7.3 Transizione su report inesistente
test_endpoint "POST" "$API_BASE/reports/report-inesistente-123/transition" '{
    "to": "IN_CONTROLLO"
}' 404 "Transizione su report inesistente"

# 7.4 Sopralluogo su report stato non valido
if [ -n "$CREATED_REPORT_ID" ]; then
    test_endpoint "POST" "$API_BASE/reports/$CREATED_REPORT_ID/inspections" '{
        "date": "2025-01-15T10:00:00Z",
        "location": "Test Location"
    }' 400 "Sopralluogo su stato non valido"
fi

print_header "RIEPILOGO TEST"

echo -e "\n${GREEN}Test completati!${NC}"
echo "Script di test API per Sistema Tracciabilità Ispettori"
echo ""
echo "ID creati durante i test:"
echo "- Report: $CREATED_REPORT_ID"
echo "- Inspection: $CREATED_INSPECTION_ID"
echo "- Clarification: $CREATED_CLARIFICATION_ID"
echo "- Authority Notice: $CREATED_AUTHORITY_NOTICE_ID"
echo "- Attachment: $CREATED_ATTACHMENT_ID"
echo ""
echo -e "${YELLOW}Nota: Alcuni test potrebbero modificare lo stato dei report di seed.${NC}"
echo -e "${YELLOW}Per ripristinare i dati originali, esegui: npm run seed${NC}"

print_header "COMANDI CURL MANUALI"

echo "
# Lista report
curl -s $API_BASE/reports | jq

# Crea report
curl -s -X POST $API_BASE/reports \\
  -H 'Content-Type: application/json' \\
  -d '{\"title\":\"Nuovo Report\",\"description\":\"Descrizione test\"}' | jq

# Transizione stato (sostituire REPORT_ID)
curl -s -X POST $API_BASE/reports/REPORT_ID/transition \\
  -H 'Content-Type: application/json' \\
  -d '{\"to\":\"IN_CONTROLLO\",\"note\":\"Analisi completata\"}' | jq

# Crea sopralluogo (sostituire REPORT_ID)
curl -s -X POST $API_BASE/reports/REPORT_ID/inspections \\
  -H 'Content-Type: application/json' \\
  -d '{\"date\":\"2025-06-30T10:00:00Z\",\"location\":\"Frantoio X\",\"minutesText\":\"Verbale...\"}' | jq

# Chiudi da sopralluogo (sostituire REPORT_ID)
curl -s -X POST $API_BASE/reports/REPORT_ID/close-from-inspection \\
  -H 'Content-Type: application/json' \\
  -d '{\"note\":\"Sopralluogo completato con esito positivo\"}' | jq
"

echo -e "\n${GREEN}Test script completato! 🎉${NC}"