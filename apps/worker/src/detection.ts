import { getPrisma, Prisma } from "@rataria/database";
import {
  calculateConfidence,
  detectArbitrage,
  planStakes,
  type ArbitrageSelection,
} from "@rataria/odds-engine";
import {
  canTransition,
  MARKET_OUTCOMES,
  SUREBET_EVENTS_CHANNEL,
  type AppEnv,
  type MarketType,
  type SurebetLiveEvent,
} from "@rataria/shared";
import type Redis from "ioredis";
import { logger } from "./logger";

interface BestOdd {
  selectionId: string;
  outcome: string;
  bookmakerId: string;
  bookmakerKey: string;
  providerKey: string;
  odd: Prisma.Decimal;
  collectedAt: Date;
}

interface MatchingContext {
  providerKeys: string[];
  minMatchScore: number;
  manualMatch: boolean;
  reversedProviders: string[];
}

/**
 * Qualidade do matching dos vínculos usados na oportunidade: provedores que
 * originaram o evento contam como score 100; vínculos AUTO/MANUAL usam o
 * score da decisão aprovada. Eventos sem vínculo aprovado nunca chegam aqui
 * (odds de PENDING_REVIEW não são persistidas).
 */
async function collectMatchingContext(
  eventId: string,
  providerKeys: string[],
): Promise<MatchingContext> {
  const prisma = getPrisma();
  const links = await prisma.providerEventLink.findMany({
    where: { eventId, providerKey: { in: providerKeys } },
    include: {
      matches: {
        where: { decision: { in: ["AUTO_APPROVED", "MANUALLY_APPROVED"] } },
        orderBy: { updatedAt: "desc" },
        take: 1,
      },
    },
  });

  let minMatchScore = 100;
  let manualMatch = false;
  const reversedProviders: string[] = [];
  for (const link of links) {
    if (link.reversedParticipants) reversedProviders.push(link.providerKey);
    if (link.status === "MANUALLY_LINKED") manualMatch = true;
    if (link.status === "AUTO_LINKED" || link.status === "MANUALLY_LINKED") {
      const score = link.matches[0]?.score ?? 100;
      if (score < minMatchScore) minMatchScore = score;
    }
  }
  return {
    providerKeys: [...providerKeys].sort(),
    minMatchScore,
    manualMatch,
    reversedProviders,
  };
}

export async function publishLiveEvent(redis: Redis, event: SurebetLiveEvent): Promise<void> {
  await redis.publish(SUREBET_EVENTS_CHANNEL, JSON.stringify(event));
}

/**
 * Detecção + revalidação para todos os mercados de um evento.
 *
 * Regras:
 * - Só considera snapshots dentro de MAX_ODDS_AGE_MS (odds velhas não publicam).
 * - Exige mercado completo (todos os resultados do tipo presentes).
 * - Recalcula a arbitragem e o plano de stakes ANTES de persistir como ativa.
 * - dedupeKey determinística ⇒ redetecção atualiza em vez de duplicar.
 * - Mercado que deixou de ter arbitragem invalida a oportunidade ativa.
 */
export async function runDetection(
  eventId: string,
  env: AppEnv,
  redis: Redis,
): Promise<void> {
  const prisma = getPrisma();
  const now = new Date();
  const freshAfter = new Date(now.getTime() - env.MAX_ODDS_AGE_MS);

  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: { markets: { include: { selections: true } } },
  });
  if (!event) return;

  for (const market of event.markets) {
    const expectedOutcomes = MARKET_OUTCOMES[market.type as MarketType];
    if (!expectedOutcomes) continue;

    const marketTradable =
      market.status === "OPEN" && event.status === "SCHEDULED" && event.startsAt > now;

    const bestBySelection = marketTradable
      ? await collectBestOdds(market.id, freshAfter)
      : new Map<string, BestOdd>();

    const arbSelections: ArbitrageSelection[] = [...bestBySelection.values()].map((b) => ({
      selectionKey: b.outcome,
      bookmakerKey: b.bookmakerKey,
      odd: b.odd.toString(),
    }));

    const complete =
      arbSelections.length === expectedOutcomes.length &&
      expectedOutcomes.every((o) => bestBySelection.has(o));

    const detection = complete ? detectArbitrage(arbSelections, expectedOutcomes) : null;
    const isArb =
      detection?.hasArbitrage === true &&
      detection.profitPercent.gte(env.MIN_PROFIT_PERCENT.toString());

    if (!isArb) {
      await invalidateActiveOpportunity(market.id, marketTradable, redis);
      continue;
    }

    // Plano de stakes para a banca de referência, com arredondamento real.
    const plan = planStakes(
      arbSelections,
      {
        totalStake: env.REFERENCE_BANKROLL.toString(),
        stakeIncrement: "0.01",
        minWorstProfit: "0",
      },
      expectedOutcomes,
    );

    const legs = [...bestBySelection.values()];
    const oldestOddsAgeSec = Math.max(
      ...legs.map((l) => (now.getTime() - l.collectedAt.getTime()) / 1000),
    );
    const distinctProviders = [...new Set(legs.map((l) => l.providerKey))];
    const matching = await collectMatchingContext(eventId, distinctProviders);
    const confidence = calculateConfidence({
      maxOddsAgeSeconds: oldestOddsAgeSec,
      providerCount: distinctProviders.length,
      bookmakerCount: new Set(legs.map((l) => l.bookmakerId)).size,
      profitPercent: detection!.profitPercent.toNumber(),
      secondsToEventStart: (event.startsAt.getTime() - now.getTime()) / 1000,
      revalidated: plan.viable,
      minMatchScore: matching.minMatchScore,
      manualMatch: matching.manualMatch,
    });

    const dedupeKey = [
      eventId,
      market.id,
      ...legs
        .map((l) => `${l.outcome}:${l.bookmakerKey}`)
        .sort((a, b) => a.localeCompare(b)),
    ].join("|");

    const status: "ACTIVE" | "UNEXECUTABLE" = plan.viable ? "ACTIVE" : "UNEXECUTABLE";
    const expiresAt = new Date(now.getTime() + env.OPPORTUNITY_TTL_MS);

    // Conteúdo é JSON puro (strings/números); o cast satisfaz o tipo do Prisma,
    // que não aceita interfaces sem index signature.
    const explanationData = {
      detection: {
        inverseSum: detection!.inverseSum.toFixed(12),
        payoutMultiplier: detection!.payoutMultiplier.toFixed(12),
        profitPercent: detection!.profitPercent.toFixed(4),
        formula: "inverseSum = Σ(1/odd_i); arbitragem quando inverseSum < 1",
      },
      stakePlan: {
        viability: plan.viability,
        requestedStake: plan.requestedStake.toFixed(2),
        totalStaked: plan.totalStaked.toFixed(2),
        worstProfit: plan.worstProfit.toFixed(2),
        bestProfit: plan.bestProfit.toFixed(2),
        note: "stakes arredondadas ao incremento de 0.01 e cenários recalculados",
      },
      confidence: {
        score: confidence.score,
        classification: confidence.classification,
        positiveFactors: confidence.positiveFactors,
        negativeFactors: confidence.negativeFactors,
        algorithmVersion: confidence.algorithmVersion,
      },
      matching: {
        providerKeys: matching.providerKeys,
        minMatchScore: matching.minMatchScore,
        manualMatch: matching.manualMatch,
        reversedProviders: matching.reversedProviders,
        note: "odds só se combinam entre eventos com associação aprovada (auto ou manual)",
      },
      disclaimer:
        "Oportunidade matemática detectada, sujeita a revalidação. Odds mudam rapidamente; não há garantia de lucro.",
    };
    const explanation = explanationData as unknown as Prisma.InputJsonValue;

    // Unicidade parcial: só considera o ciclo de vida NÃO-terminal. Uma
    // oportunidade EXPIRED/INVALIDATED não bloqueia a redetecção (ADR-0011).
    const existing = await prisma.surebetOpportunity.findFirst({
      where: {
        dedupeKey,
        status: { in: ["DETECTED", "VALIDATING", "ACTIVE", "STALE", "UNEXECUTABLE", "MANUAL_REVIEW"] },
      },
    });
    if (existing && existing.status !== status && !canTransition(existing.status, status)) {
      logger.warn(
        { opportunityId: existing.id, from: existing.status, to: status },
        "transição de estado não permitida — oportunidade mantida",
      );
      continue;
    }

    const commonData = {
      status,
      inverseSum: new Prisma.Decimal(detection!.inverseSum.toFixed(12)),
      payoutMultiplier: new Prisma.Decimal(detection!.payoutMultiplier.toFixed(12)),
      profitPercent: new Prisma.Decimal(detection!.profitPercent.toFixed(4)),
      referenceStake: new Prisma.Decimal(plan.requestedStake.toFixed(2)),
      totalStaked: new Prisma.Decimal(plan.totalStaked.toFixed(2)),
      worstProfit: new Prisma.Decimal(plan.worstProfit.toFixed(2)),
      bestProfit: new Prisma.Decimal(plan.bestProfit.toFixed(2)),
      profitPercentRounded: new Prisma.Decimal(plan.profitPercentAfterRounding.toFixed(4)),
      confidenceScore: confidence.score,
      explanation,
      providerKeys: matching.providerKeys,
      minMatchScore: matching.minMatchScore,
      manualMatch: matching.manualMatch,
      lastValidatedAt: now,
      expiresAt,
    };

    const opportunity = await prisma.$transaction(async (tx) => {
      const opp = existing
        ? await tx.surebetOpportunity.update({
            where: { id: existing.id },
            data: commonData,
          })
        : await tx.surebetOpportunity.create({
            data: {
              ...commonData,
              eventId,
              marketId: market.id,
              dedupeKey,
              detectedAt: now,
            },
          });

      await tx.surebetLeg.deleteMany({ where: { opportunityId: opp.id } });
      await tx.surebetLeg.createMany({
        data: legs.map((leg) => {
          const planLeg = plan.legs.find((p) => p.selectionKey === leg.outcome)!;
          return {
            opportunityId: opp.id,
            selectionId: leg.selectionId,
            bookmakerId: leg.bookmakerId,
            odd: leg.odd,
            stakeRatio: new Prisma.Decimal(planLeg.idealRatio.toFixed(12)),
            suggestedStake: new Prisma.Decimal(planLeg.roundedStake.toFixed(2)),
            grossReturn: new Prisma.Decimal(planLeg.grossReturn.toFixed(2)),
            oddsCollectedAt: leg.collectedAt,
          };
        }),
      });

      await tx.surebetValidation.create({
        data: {
          opportunityId: opp.id,
          result: plan.viable ? "CONFIRMED" : "REJECTED_UNPROFITABLE_ROUNDING",
          details: {
            oldestOddsAgeSec,
            maxOddsAgeMs: env.MAX_ODDS_AGE_MS,
            recalculatedProfitPercent: detection!.profitPercent.toFixed(4),
            stakePlanViability: plan.viability,
          },
        },
      });

      return opp;
    });

    logger.info(
      {
        opportunityId: opportunity.id,
        market: market.type,
        profitPercent: detection!.profitPercent.toFixed(4),
        worstProfit: plan.worstProfit.toFixed(2),
        status,
      },
      existing ? "oportunidade revalidada/atualizada" : "SUREBET detectada e ativada",
    );

    await publishLiveEvent(redis, {
      type: existing ? "opportunity.updated" : "opportunity.activated",
      opportunityId: opportunity.id,
      at: now.toISOString(),
    });
  }
}

async function collectBestOdds(
  marketId: string,
  freshAfter: Date,
): Promise<Map<string, BestOdd>> {
  const prisma = getPrisma();
  const snapshots = await prisma.oddsSnapshot.findMany({
    where: {
      selection: { marketId },
      collectedAt: { gte: freshAfter },
    },
    orderBy: { collectedAt: "desc" },
    include: {
      selection: true,
      bookmaker: true,
      provider: true,
    },
  });

  // Snapshot mais recente por par (seleção, casa).
  const latestByPair = new Map<string, (typeof snapshots)[number]>();
  for (const snap of snapshots) {
    const key = `${snap.selectionId}|${snap.bookmakerId}`;
    if (!latestByPair.has(key)) latestByPair.set(key, snap);
  }

  // Melhor odd por resultado entre as casas.
  const best = new Map<string, BestOdd>();
  for (const snap of latestByPair.values()) {
    const current = best.get(snap.selection.outcome);
    if (!current || snap.odd.gt(current.odd)) {
      best.set(snap.selection.outcome, {
        selectionId: snap.selectionId,
        outcome: snap.selection.outcome,
        bookmakerId: snap.bookmakerId,
        bookmakerKey: snap.bookmaker.key,
        providerKey: snap.provider.key,
        odd: snap.odd,
        collectedAt: snap.collectedAt,
      });
    }
  }
  return best;
}

async function invalidateActiveOpportunity(
  marketId: string,
  marketTradable: boolean,
  redis: Redis,
): Promise<void> {
  const prisma = getPrisma();
  const active = await prisma.surebetOpportunity.findFirst({
    where: { marketId, status: { in: ["ACTIVE", "UNEXECUTABLE", "DETECTED", "STALE"] } },
  });
  if (!active || !canTransition(active.status, "INVALIDATED")) return;

  await prisma.$transaction([
    prisma.surebetOpportunity.update({
      where: { id: active.id },
      data: { status: "INVALIDATED", lastValidatedAt: new Date() },
    }),
    prisma.surebetValidation.create({
      data: {
        opportunityId: active.id,
        result: marketTradable ? "REJECTED_NO_ARBITRAGE" : "REJECTED_MARKET_SUSPENDED",
        details: {
          reason: marketTradable
            ? "recalculo não encontrou mais arbitragem nas odds frescas"
            : "mercado suspenso, evento iniciado ou odds fora da idade máxima",
        },
      },
    }),
  ]);

  logger.info({ opportunityId: active.id }, "oportunidade invalidada na revalidação");
  await publishLiveEvent(redis, {
    type: "opportunity.expired",
    opportunityId: active.id,
    at: new Date().toISOString(),
  });
}
