-- CreateEnum
CREATE TYPE "ProviderKind" AS ENUM ('MOCK', 'REST');

-- CreateEnum
CREATE TYPE "EventStatus" AS ENUM ('SCHEDULED', 'LIVE', 'SUSPENDED', 'FINISHED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "MarketType" AS ENUM ('MATCH_WINNER_2WAY', 'ONE_X_TWO', 'TOTALS', 'BTTS');

-- CreateEnum
CREATE TYPE "MarketPeriod" AS ENUM ('FULL_TIME', 'FIRST_HALF');

-- CreateEnum
CREATE TYPE "MarketStatus" AS ENUM ('OPEN', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "IngestionStatus" AS ENUM ('RUNNING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "OpportunityStatus" AS ENUM ('DETECTED', 'VALIDATING', 'ACTIVE', 'STALE', 'INVALIDATED', 'EXPIRED', 'UNEXECUTABLE', 'MANUAL_REVIEW');

-- CreateEnum
CREATE TYPE "ValidationResult" AS ENUM ('CONFIRMED', 'REJECTED_STALE_ODDS', 'REJECTED_NO_ARBITRAGE', 'REJECTED_MARKET_SUSPENDED', 'REJECTED_UNPROFITABLE_ROUNDING');

-- CreateTable
CREATE TABLE "Provider" (
    "id" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "kind" "ProviderKind" NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Provider_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProviderHealthLog" (
    "id" UUID NOT NULL,
    "providerId" UUID NOT NULL,
    "healthy" BOOLEAN NOT NULL,
    "latencyMs" INTEGER NOT NULL,
    "message" TEXT,
    "checkedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProviderHealthLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Bookmaker" (
    "id" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Bookmaker_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Sport" (
    "id" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Sport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Competition" (
    "id" UUID NOT NULL,
    "sportId" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "country" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Competition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Event" (
    "id" UUID NOT NULL,
    "competitionId" UUID NOT NULL,
    "homeName" TEXT NOT NULL,
    "awayName" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "status" "EventStatus" NOT NULL DEFAULT 'SCHEDULED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProviderEventLink" (
    "id" UUID NOT NULL,
    "eventId" UUID NOT NULL,
    "providerKey" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProviderEventLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Market" (
    "id" UUID NOT NULL,
    "eventId" UUID NOT NULL,
    "type" "MarketType" NOT NULL,
    "period" "MarketPeriod" NOT NULL DEFAULT 'FULL_TIME',
    "line" DECIMAL(10,3),
    "status" "MarketStatus" NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Market_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Selection" (
    "id" UUID NOT NULL,
    "marketId" UUID NOT NULL,
    "outcome" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Selection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IngestionBatch" (
    "id" UUID NOT NULL,
    "providerId" UUID NOT NULL,
    "cycle" INTEGER NOT NULL,
    "status" "IngestionStatus" NOT NULL DEFAULT 'RUNNING',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "oddsCount" INTEGER NOT NULL DEFAULT 0,
    "errorMessage" TEXT,

    CONSTRAINT "IngestionBatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OddsSnapshot" (
    "id" UUID NOT NULL,
    "selectionId" UUID NOT NULL,
    "bookmakerId" UUID NOT NULL,
    "providerId" UUID NOT NULL,
    "ingestionBatchId" UUID NOT NULL,
    "odd" DECIMAL(12,4) NOT NULL,
    "collectedAt" TIMESTAMP(3) NOT NULL,
    "providerTimestamp" TIMESTAMP(3) NOT NULL,
    "latencyMs" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OddsSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SurebetOpportunity" (
    "id" UUID NOT NULL,
    "eventId" UUID NOT NULL,
    "marketId" UUID NOT NULL,
    "dedupeKey" TEXT NOT NULL,
    "status" "OpportunityStatus" NOT NULL DEFAULT 'DETECTED',
    "inverseSum" DECIMAL(18,12) NOT NULL,
    "payoutMultiplier" DECIMAL(18,12) NOT NULL,
    "profitPercent" DECIMAL(9,4) NOT NULL,
    "referenceStake" DECIMAL(14,2) NOT NULL,
    "totalStaked" DECIMAL(14,2) NOT NULL,
    "worstProfit" DECIMAL(14,2) NOT NULL,
    "bestProfit" DECIMAL(14,2) NOT NULL,
    "profitPercentRounded" DECIMAL(9,4) NOT NULL,
    "confidenceScore" INTEGER NOT NULL,
    "explanation" JSONB NOT NULL,
    "detectedAt" TIMESTAMP(3) NOT NULL,
    "lastValidatedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SurebetOpportunity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SurebetLeg" (
    "id" UUID NOT NULL,
    "opportunityId" UUID NOT NULL,
    "selectionId" UUID NOT NULL,
    "bookmakerId" UUID NOT NULL,
    "odd" DECIMAL(12,4) NOT NULL,
    "stakeRatio" DECIMAL(18,12) NOT NULL,
    "suggestedStake" DECIMAL(14,2) NOT NULL,
    "grossReturn" DECIMAL(14,2) NOT NULL,
    "oddsCollectedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SurebetLeg_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SurebetValidation" (
    "id" UUID NOT NULL,
    "opportunityId" UUID NOT NULL,
    "result" "ValidationResult" NOT NULL,
    "details" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SurebetValidation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Provider_key_key" ON "Provider"("key");

-- CreateIndex
CREATE INDEX "ProviderHealthLog_providerId_checkedAt_idx" ON "ProviderHealthLog"("providerId", "checkedAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "Bookmaker_key_key" ON "Bookmaker"("key");

-- CreateIndex
CREATE UNIQUE INDEX "Sport_key_key" ON "Sport"("key");

-- CreateIndex
CREATE UNIQUE INDEX "Competition_sportId_key_key" ON "Competition"("sportId", "key");

-- CreateIndex
CREATE INDEX "Event_startsAt_idx" ON "Event"("startsAt");

-- CreateIndex
CREATE INDEX "Event_competitionId_startsAt_idx" ON "Event"("competitionId", "startsAt");

-- CreateIndex
CREATE INDEX "ProviderEventLink_eventId_idx" ON "ProviderEventLink"("eventId");

-- CreateIndex
CREATE UNIQUE INDEX "ProviderEventLink_providerKey_externalId_key" ON "ProviderEventLink"("providerKey", "externalId");

-- CreateIndex
CREATE INDEX "Market_eventId_idx" ON "Market"("eventId");

-- CreateIndex
CREATE UNIQUE INDEX "Market_eventId_type_period_line_key" ON "Market"("eventId", "type", "period", "line");

-- CreateIndex
CREATE UNIQUE INDEX "Selection_marketId_outcome_key" ON "Selection"("marketId", "outcome");

-- CreateIndex
CREATE INDEX "IngestionBatch_providerId_startedAt_idx" ON "IngestionBatch"("providerId", "startedAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "IngestionBatch_providerId_cycle_key" ON "IngestionBatch"("providerId", "cycle");

-- CreateIndex
CREATE INDEX "OddsSnapshot_selectionId_bookmakerId_collectedAt_idx" ON "OddsSnapshot"("selectionId", "bookmakerId", "collectedAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "OddsSnapshot_providerId_bookmakerId_selectionId_providerTim_key" ON "OddsSnapshot"("providerId", "bookmakerId", "selectionId", "providerTimestamp");

-- CreateIndex
CREATE UNIQUE INDEX "SurebetOpportunity_dedupeKey_key" ON "SurebetOpportunity"("dedupeKey");

-- CreateIndex
CREATE INDEX "SurebetOpportunity_status_profitPercent_idx" ON "SurebetOpportunity"("status", "profitPercent" DESC);

-- CreateIndex
CREATE INDEX "SurebetOpportunity_status_expiresAt_idx" ON "SurebetOpportunity"("status", "expiresAt");

-- CreateIndex
CREATE INDEX "SurebetOpportunity_eventId_idx" ON "SurebetOpportunity"("eventId");

-- CreateIndex
CREATE UNIQUE INDEX "SurebetLeg_opportunityId_selectionId_key" ON "SurebetLeg"("opportunityId", "selectionId");

-- CreateIndex
CREATE INDEX "SurebetValidation_opportunityId_createdAt_idx" ON "SurebetValidation"("opportunityId", "createdAt" DESC);

-- AddForeignKey
ALTER TABLE "ProviderHealthLog" ADD CONSTRAINT "ProviderHealthLog_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "Provider"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Competition" ADD CONSTRAINT "Competition_sportId_fkey" FOREIGN KEY ("sportId") REFERENCES "Sport"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_competitionId_fkey" FOREIGN KEY ("competitionId") REFERENCES "Competition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProviderEventLink" ADD CONSTRAINT "ProviderEventLink_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Market" ADD CONSTRAINT "Market_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Selection" ADD CONSTRAINT "Selection_marketId_fkey" FOREIGN KEY ("marketId") REFERENCES "Market"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IngestionBatch" ADD CONSTRAINT "IngestionBatch_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "Provider"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OddsSnapshot" ADD CONSTRAINT "OddsSnapshot_selectionId_fkey" FOREIGN KEY ("selectionId") REFERENCES "Selection"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OddsSnapshot" ADD CONSTRAINT "OddsSnapshot_bookmakerId_fkey" FOREIGN KEY ("bookmakerId") REFERENCES "Bookmaker"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OddsSnapshot" ADD CONSTRAINT "OddsSnapshot_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "Provider"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OddsSnapshot" ADD CONSTRAINT "OddsSnapshot_ingestionBatchId_fkey" FOREIGN KEY ("ingestionBatchId") REFERENCES "IngestionBatch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SurebetOpportunity" ADD CONSTRAINT "SurebetOpportunity_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SurebetOpportunity" ADD CONSTRAINT "SurebetOpportunity_marketId_fkey" FOREIGN KEY ("marketId") REFERENCES "Market"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SurebetLeg" ADD CONSTRAINT "SurebetLeg_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "SurebetOpportunity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SurebetLeg" ADD CONSTRAINT "SurebetLeg_selectionId_fkey" FOREIGN KEY ("selectionId") REFERENCES "Selection"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SurebetLeg" ADD CONSTRAINT "SurebetLeg_bookmakerId_fkey" FOREIGN KEY ("bookmakerId") REFERENCES "Bookmaker"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SurebetValidation" ADD CONSTRAINT "SurebetValidation_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "SurebetOpportunity"("id") ON DELETE CASCADE ON UPDATE CASCADE;
