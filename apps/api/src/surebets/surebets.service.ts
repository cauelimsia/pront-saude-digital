import { Injectable, NotFoundException } from "@nestjs/common";
import { getPrisma, Prisma } from "@rataria/database";
import { planStakes, type ArbitrageSelection } from "@rataria/odds-engine";
import { MARKET_OUTCOMES, type MarketType } from "@rataria/shared";
import type { ListSurebetsQuery, SimulateBody } from "./surebets.schemas";

const opportunityInclude = {
  event: { include: { competition: { include: { sport: true } } } },
  market: true,
  legs: { include: { bookmaker: true, selection: true } },
  validations: { orderBy: { createdAt: "desc" as const }, take: 5 },
} satisfies Prisma.SurebetOpportunityInclude;

@Injectable()
export class SurebetsService {
  async list(query: ListSurebetsQuery) {
    const prisma = getPrisma();
    const where: Prisma.SurebetOpportunityWhereInput = {
      status: query.status ?? "ACTIVE",
      ...(query.minProfit !== undefined && {
        profitPercent: { gte: new Prisma.Decimal(query.minProfit) },
      }),
      ...(query.minConfidence !== undefined && {
        confidenceScore: { gte: query.minConfidence },
      }),
      ...(query.sport && {
        event: { competition: { sport: { key: query.sport } } },
      }),
      ...(query.onlyViable && { status: "ACTIVE" as const }),
    };

    const [total, items] = await Promise.all([
      prisma.surebetOpportunity.count({ where }),
      prisma.surebetOpportunity.findMany({
        where,
        include: opportunityInclude,
        orderBy: [{ profitPercent: "desc" }, { detectedAt: "desc" }],
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
    ]);

    return {
      page: query.page,
      pageSize: query.pageSize,
      total,
      items: items.map(serializeOpportunity),
    };
  }

  async getById(id: string) {
    const prisma = getPrisma();
    const opportunity = await prisma.surebetOpportunity.findUnique({
      where: { id },
      include: opportunityInclude,
    });
    if (!opportunity) {
      throw new NotFoundException(`Oportunidade ${id} não encontrada`);
    }
    return serializeOpportunity(opportunity);
  }

  /**
   * Simulador de banca: recalcula a distribuição com o motor puro usando
   * as odds persistidas nas pernas — a interface nunca refaz a matemática.
   */
  async simulate(id: string, body: SimulateBody) {
    const prisma = getPrisma();
    const opportunity = await prisma.surebetOpportunity.findUnique({
      where: { id },
      include: opportunityInclude,
    });
    if (!opportunity) {
      throw new NotFoundException(`Oportunidade ${id} não encontrada`);
    }

    const selections: ArbitrageSelection[] = opportunity.legs.map((leg) => ({
      selectionKey: leg.selection.outcome,
      bookmakerKey: leg.bookmaker.key,
      odd: leg.odd.toString(),
    }));
    const expected = MARKET_OUTCOMES[opportunity.market.type as MarketType];

    const plan = planStakes(
      selections,
      {
        totalStake: body.totalStake,
        stakeIncrement: body.stakeIncrement ?? "0.01",
        minStakePerLeg: body.minStakePerLeg,
        maxStakePerLeg: body.maxStakePerLeg,
        minWorstProfit: body.minWorstProfit ?? "0",
      },
      expected,
    );

    return {
      opportunityId: opportunity.id,
      disclaimer:
        "Retorno estimado com base nas últimas odds conhecidas — sujeito a revalidação; odds podem mudar e mercados podem ser suspensos.",
      viable: plan.viable,
      viability: plan.viability,
      requestedStake: plan.requestedStake.toFixed(2),
      totalStaked: plan.totalStaked.toFixed(2),
      unallocated: plan.unallocated.toFixed(2),
      worstProfit: plan.worstProfit.toFixed(2),
      bestProfit: plan.bestProfit.toFixed(2),
      worstReturn: plan.worstReturn.toFixed(2),
      bestReturn: plan.bestReturn.toFixed(2),
      profitPercentAfterRounding: plan.profitPercentAfterRounding.toFixed(4),
      legs: plan.legs.map((leg) => ({
        selectionKey: leg.selectionKey,
        bookmakerKey: leg.bookmakerKey,
        odd: leg.odd.toString(),
        idealStake: leg.idealStake.toFixed(4),
        roundedStake: leg.roundedStake.toFixed(2),
        grossReturn: leg.grossReturn.toFixed(2),
        profitIfWins: leg.profit.toFixed(2),
      })),
    };
  }
}

type OpportunityWithRelations = Prisma.SurebetOpportunityGetPayload<{
  include: typeof opportunityInclude;
}>;

function serializeOpportunity(o: OpportunityWithRelations) {
  const now = Date.now();
  const oldestLegAt = Math.min(...o.legs.map((l) => l.oddsCollectedAt.getTime()));
  return {
    id: o.id,
    status: o.status,
    sport: {
      key: o.event.competition.sport.key,
      name: o.event.competition.sport.name,
    },
    competition: { name: o.event.competition.name, country: o.event.competition.country },
    event: {
      id: o.event.id,
      home: o.event.homeName,
      away: o.event.awayName,
      startsAt: o.event.startsAt.toISOString(),
      status: o.event.status,
    },
    market: {
      type: o.market.type,
      period: o.market.period,
      line: o.market.line?.toString() ?? null,
    },
    inverseSum: o.inverseSum.toString(),
    profitPercent: o.profitPercent.toString(),
    profitPercentRounded: o.profitPercentRounded.toString(),
    referenceStake: o.referenceStake.toString(),
    worstProfit: o.worstProfit.toString(),
    bestProfit: o.bestProfit.toString(),
    confidenceScore: o.confidenceScore,
    oddsAgeSeconds: Math.round((now - oldestLegAt) / 1000),
    detectedAt: o.detectedAt.toISOString(),
    lastValidatedAt: o.lastValidatedAt?.toISOString() ?? null,
    expiresAt: o.expiresAt.toISOString(),
    legs: o.legs.map((leg) => ({
      selection: leg.selection.outcome,
      selectionName: leg.selection.name,
      bookmaker: { key: leg.bookmaker.key, name: leg.bookmaker.name },
      odd: leg.odd.toString(),
      stakeRatio: leg.stakeRatio.toString(),
      suggestedStake: leg.suggestedStake.toString(),
      grossReturn: leg.grossReturn.toString(),
      oddsCollectedAt: leg.oddsCollectedAt.toISOString(),
    })),
    explanation: o.explanation,
    validations: o.validations.map((v) => ({
      result: v.result,
      details: v.details,
      at: v.createdAt.toISOString(),
    })),
  };
}
