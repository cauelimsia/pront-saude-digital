-- CreateEnum
CREATE TYPE "ProviderEventLinkStatus" AS ENUM ('AUTO_LINKED', 'MANUALLY_LINKED', 'NEW_EVENT', 'PENDING_REVIEW');

-- CreateEnum
CREATE TYPE "MatchDecision" AS ENUM ('AUTO_APPROVED', 'REVIEW_REQUIRED', 'REJECTED', 'MANUALLY_APPROVED', 'MANUALLY_REJECTED', 'SUPERSEDED');

-- CreateEnum
CREATE TYPE "ReviewStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "AliasKind" AS ENUM ('PARTICIPANT', 'COMPETITION');

-- CreateEnum
CREATE TYPE "AliasStatus" AS ENUM ('APPROVED', 'PENDING');

-- DropForeignKey
ALTER TABLE "ProviderEventLink" DROP CONSTRAINT "ProviderEventLink_eventId_fkey";

-- DropIndex
DROP INDEX "SurebetOpportunity_dedupeKey_key";

-- AlterTable
ALTER TABLE "ProviderEventLink" ADD COLUMN     "awayNameNormalized" TEXT,
ADD COLUMN     "awayNameOriginal" TEXT,
ADD COLUMN     "competitionNameOriginal" TEXT,
ADD COLUMN     "homeNameNormalized" TEXT,
ADD COLUMN     "homeNameOriginal" TEXT,
ADD COLUMN     "normalizerVersion" TEXT,
ADD COLUMN     "reversedParticipants" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "startsAt" TIMESTAMP(3),
ADD COLUMN     "status" "ProviderEventLinkStatus" NOT NULL DEFAULT 'NEW_EVENT',
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "eventId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "SurebetOpportunity" ADD COLUMN     "manualMatch" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "minMatchScore" INTEGER,
ADD COLUMN     "providerKeys" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- CreateTable
CREATE TABLE "EventMatch" (
    "id" UUID NOT NULL,
    "providerEventLinkId" UUID NOT NULL,
    "candidateEventId" UUID NOT NULL,
    "algorithmVersion" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "decision" "MatchDecision" NOT NULL,
    "reversedParticipants" BOOLEAN NOT NULL DEFAULT false,
    "features" JSONB NOT NULL,
    "explanation" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EventMatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventMatchReview" (
    "id" UUID NOT NULL,
    "eventMatchId" UUID NOT NULL,
    "status" "ReviewStatus" NOT NULL DEFAULT 'PENDING',
    "decidedBy" TEXT,
    "note" TEXT,
    "decidedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EventMatchReview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NameAlias" (
    "id" UUID NOT NULL,
    "kind" "AliasKind" NOT NULL,
    "canonicalValue" TEXT NOT NULL,
    "canonicalNormalized" TEXT NOT NULL,
    "aliasValue" TEXT NOT NULL,
    "aliasNormalized" TEXT NOT NULL,
    "status" "AliasStatus" NOT NULL DEFAULT 'APPROVED',
    "source" TEXT NOT NULL,
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3),
    "evidence" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NameAlias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" UUID NOT NULL,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "actor" TEXT NOT NULL,
    "details" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EventMatch_decision_createdAt_idx" ON "EventMatch"("decision", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "EventMatch_candidateEventId_idx" ON "EventMatch"("candidateEventId");

-- CreateIndex
CREATE UNIQUE INDEX "EventMatch_providerEventLinkId_candidateEventId_algorithmVe_key" ON "EventMatch"("providerEventLinkId", "candidateEventId", "algorithmVersion");

-- CreateIndex
CREATE UNIQUE INDEX "EventMatchReview_eventMatchId_key" ON "EventMatchReview"("eventMatchId");

-- CreateIndex
CREATE INDEX "EventMatchReview_status_createdAt_idx" ON "EventMatchReview"("status", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "NameAlias_kind_aliasNormalized_idx" ON "NameAlias"("kind", "aliasNormalized");

-- CreateIndex
CREATE UNIQUE INDEX "NameAlias_kind_aliasNormalized_canonicalNormalized_key" ON "NameAlias"("kind", "aliasNormalized", "canonicalNormalized");

-- CreateIndex
CREATE INDEX "AuditLog_entity_entityId_idx" ON "AuditLog"("entity", "entityId");

-- CreateIndex
CREATE INDEX "ProviderEventLink_status_idx" ON "ProviderEventLink"("status");

-- CreateIndex
CREATE INDEX "SurebetOpportunity_dedupeKey_idx" ON "SurebetOpportunity"("dedupeKey");

-- AddForeignKey
ALTER TABLE "ProviderEventLink" ADD CONSTRAINT "ProviderEventLink_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventMatch" ADD CONSTRAINT "EventMatch_providerEventLinkId_fkey" FOREIGN KEY ("providerEventLinkId") REFERENCES "ProviderEventLink"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventMatch" ADD CONSTRAINT "EventMatch_candidateEventId_fkey" FOREIGN KEY ("candidateEventId") REFERENCES "Event"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventMatchReview" ADD CONSTRAINT "EventMatchReview_eventMatchId_fkey" FOREIGN KEY ("eventMatchId") REFERENCES "EventMatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Unicidade parcial do dedupeKey: apenas oportunidades em estados não-terminais.
-- Redetecção após EXPIRED/INVALIDATED cria um novo ciclo de vida (ADR-0011).
CREATE UNIQUE INDEX "SurebetOpportunity_dedupeKey_active_key"
  ON "SurebetOpportunity"("dedupeKey")
  WHERE "status" IN ('DETECTED', 'VALIDATING', 'ACTIVE', 'STALE', 'UNEXECUTABLE', 'MANUAL_REVIEW');
