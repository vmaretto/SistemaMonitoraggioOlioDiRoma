-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('USER', 'ANALYST', 'INSPECTOR', 'ADMIN');

-- CreateEnum
CREATE TYPE "ReportStatus" AS ENUM ('ANALISI', 'ARCHIVIATA', 'IN_CONTROLLO', 'VERIFICA_SOPRALLUOGO', 'VERIFICA_CHIARIMENTI', 'SEGNALATA_A_ENTE', 'IN_ATTESA_FEEDBACK_ENTE', 'CHIUSA');

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT NOT NULL,
    "password" TEXT,
    "emailVerified" TIMESTAMP(3),
    "image" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'USER',
    "organization" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "Keywords" (
    "id" TEXT NOT NULL,
    "keyword" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'primary',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Keywords_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContenutiMonitorati" (
    "id" TEXT NOT NULL,
    "fonte" TEXT NOT NULL,
    "piattaforma" TEXT NOT NULL,
    "testo" TEXT NOT NULL,
    "url" TEXT,
    "autore" TEXT,
    "sentiment" TEXT NOT NULL,
    "sentimentScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "keywords" TEXT[],
    "dataPost" TIMESTAMP(3) NOT NULL,
    "rilevanza" INTEGER NOT NULL DEFAULT 0,
    "isProcessed" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContenutiMonitorati_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EtichetteUfficiali" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "descrizione" TEXT,
    "imageUrl" TEXT NOT NULL,
    "cloudStoragePath" TEXT,
    "testoOcr" TEXT,
    "categoria" TEXT NOT NULL DEFAULT 'ufficiale',
    "denominazione" TEXT NOT NULL,
    "produttore" TEXT,
    "regioneProduzione" TEXT NOT NULL DEFAULT 'Lazio',
    "isAttiva" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EtichetteUfficiali_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificheEtichette" (
    "id" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "cloudStoragePath" TEXT,
    "testoOcr" TEXT,
    "risultatoMatching" TEXT NOT NULL,
    "percentualeMatch" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "etichettaRiferimento" TEXT,
    "violazioniRilevate" TEXT[],
    "note" TEXT,
    "stato" TEXT NOT NULL DEFAULT 'da_verificare',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VerificheEtichette_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Alert" (
    "id" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "priorita" TEXT NOT NULL DEFAULT 'medio',
    "titolo" TEXT NOT NULL,
    "descrizione" TEXT NOT NULL,
    "fonte" TEXT,
    "isRisolto" BOOLEAN NOT NULL DEFAULT false,
    "isNotificato" BOOLEAN NOT NULL DEFAULT false,
    "dataRisolto" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Alert_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Configurazioni" (
    "id" TEXT NOT NULL,
    "chiave" TEXT NOT NULL,
    "valore" TEXT NOT NULL,
    "descrizione" TEXT,
    "categoria" TEXT NOT NULL DEFAULT 'generale',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Configurazioni_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LogNotifiche" (
    "id" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "destinatario" TEXT NOT NULL,
    "oggetto" TEXT NOT NULL,
    "corpo" TEXT NOT NULL,
    "stato" TEXT NOT NULL DEFAULT 'inviata',
    "alertId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LogNotifiche_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Report" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" TEXT NOT NULL,
    "status" "ReportStatus" NOT NULL DEFAULT 'ANALISI',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Report_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActionLog" (
    "id" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "meta" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actorId" TEXT NOT NULL,

    CONSTRAINT "ActionLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Inspection" (
    "id" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "inspectorId" TEXT NOT NULL,
    "location" TEXT,
    "minutesText" TEXT,
    "outcome" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Inspection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClarificationRequest" (
    "id" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "requestedBy" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "dueAt" TIMESTAMP(3),
    "feedbackAt" TIMESTAMP(3),
    "feedback" TEXT,
    "outcome" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClarificationRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuthorityNotice" (
    "id" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sentBy" TEXT NOT NULL,
    "authority" TEXT NOT NULL,
    "protocol" TEXT,
    "feedbackAt" TIMESTAMP(3),
    "feedback" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AuthorityNotice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Attachment" (
    "id" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "uploadedBy" TEXT NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Attachment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_token_key" ON "VerificationToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_identifier_token_key" ON "VerificationToken"("identifier", "token");

-- CreateIndex
CREATE UNIQUE INDEX "Keywords_keyword_key" ON "Keywords"("keyword");

-- CreateIndex
CREATE UNIQUE INDEX "Configurazioni_chiave_key" ON "Configurazioni"("chiave");

-- CreateIndex
CREATE INDEX "Attachment_entityType_entityId_idx" ON "Attachment"("entityType", "entityId");

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VerificheEtichette" ADD CONSTRAINT "VerificheEtichette_etichettaRiferimento_fkey" FOREIGN KEY ("etichettaRiferimento") REFERENCES "EtichetteUfficiali"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActionLog" ADD CONSTRAINT "ActionLog_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "Report"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Inspection" ADD CONSTRAINT "Inspection_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "Report"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClarificationRequest" ADD CONSTRAINT "ClarificationRequest_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "Report"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuthorityNotice" ADD CONSTRAINT "AuthorityNotice_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "Report"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attachment" ADD CONSTRAINT "Attachment_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "Report"("id") ON DELETE CASCADE ON UPDATE CASCADE;
