import { getPrisma, Prisma, type MarketPeriod, type MarketType } from "@rataria/database";
import {
  providerOddsPayloadSchema,
  type OddsProvider,
  type ProviderOddsPayload,
} from "@rataria/provider-sdk";
import { logger } from "./logger";
import { resolveProviderEvent } from "./matching";

export interface IngestionResult {
  batchId: string;
  cycle: number;
  snapshotsInserted: number;
  eventIds: string[];
  /** Representações aguardando revisão manual (odds retidas). */
  pendingReview: number;
}

/** Resultados dependentes de mando: remapeados quando a ordem está invertida. */
const HOME_AWAY_MARKETS = new Set<string>(["MATCH_WINNER_2WAY", "ONE_X_TWO"]);

function remapOutcome(outcome: string, marketType: string, reversed: boolean): string {
  if (!reversed || !HOME_AWAY_MARKETS.has(marketType)) return outcome;
  if (outcome === "HOME") return "AWAY";
  if (outcome === "AWAY") return "HOME";
  return outcome; // DRAW e demais não mudam
}

/**
 * Pipeline de ingestão: coleta → validação (Zod) → matching/normalização
 * (upserts) → snapshots com dedupe por unique composto.
 *
 * Idempotente: repetir o mesmo ciclo reutiliza o batch (unique providerId+cycle)
 * e `skipDuplicates` impede snapshots repetidos. Eventos aguardando revisão
 * manual NÃO têm odds persistidas (nunca alimentam surebets).
 */
export async function runIngestion(
  provider: OddsProvider,
  cycle: number,
): Promise<IngestionResult> {
  const prisma = getPrisma();
  const startedAt = Date.now();

  const providerRow = await prisma.provider.findUnique({
    where: { key: provider.providerId },
  });
  if (!providerRow || !providerRow.enabled) {
    throw new Error(`Provedor ${provider.providerId} ausente do banco ou desabilitado`);
  }

  const raw = await provider.getOdds({ cycle });
  const latencyMs = Date.now() - startedAt;

  const parsed = providerOddsPayloadSchema.safeParse(raw);
  if (!parsed.success) {
    logger.error(
      { providerId: provider.providerId, issues: parsed.error.issues.slice(0, 5) },
      "payload do provedor rejeitado na validação",
    );
    throw new Error(`Payload inválido do provedor ${provider.providerId}`);
  }
  const payload: ProviderOddsPayload = parsed.data;

  const batch = await prisma.ingestionBatch.upsert({
    where: { providerId_cycle: { providerId: providerRow.id, cycle } },
    update: { status: "RUNNING", errorMessage: null },
    create: { providerId: providerRow.id, cycle, status: "RUNNING" },
  });

  try {
    const normalized = await normalize(payload);

    const snapshotRows: Prisma.OddsSnapshotCreateManyInput[] = [];
    for (const entry of payload.odds) {
      if (entry.marketStatus !== "OPEN") continue; // mercados suspensos não entram
      const meta = normalized.eventMetaByExternal.get(entry.eventExternalId);
      if (!meta) continue; // pendente de revisão ou desconhecido: odds retidas
      const marketKey = `${meta.eventId}|${entry.marketType}|${entry.period}|${entry.line ?? ""}`;
      const market = normalized.marketByKey.get(marketKey);
      if (!market) continue;
      const bookmakerId = normalized.bookmakerIdByKey.get(entry.bookmakerKey);
      if (!bookmakerId) continue;

      for (const outcome of entry.outcomes) {
        const canonicalOutcome = remapOutcome(
          outcome.outcome,
          entry.marketType,
          meta.reversedParticipants,
        );
        const selectionId = market.selectionIdByOutcome.get(canonicalOutcome);
        if (!selectionId) continue;
        snapshotRows.push({
          selectionId,
          bookmakerId,
          providerId: providerRow.id,
          ingestionBatchId: batch.id,
          odd: new Prisma.Decimal(outcome.odd),
          collectedAt: payload.generatedAt,
          providerTimestamp: entry.providerTimestamp,
          latencyMs,
        });
      }
    }

    const inserted = await prisma.oddsSnapshot.createMany({
      data: snapshotRows,
      skipDuplicates: true,
    });

    await prisma.ingestionBatch.update({
      where: { id: batch.id },
      data: { status: "COMPLETED", finishedAt: new Date(), oddsCount: inserted.count },
    });

    logger.info(
      {
        batchId: batch.id,
        cycle,
        providerId: provider.providerId,
        snapshots: inserted.count,
        pendingReview: normalized.pendingReview,
        latencyMs,
      },
      "ingestão concluída",
    );

    return {
      batchId: batch.id,
      cycle,
      snapshotsInserted: inserted.count,
      eventIds: [...new Set([...normalized.eventMetaByExternal.values()].map((m) => m.eventId))],
      pendingReview: normalized.pendingReview,
    };
  } catch (error) {
    await prisma.ingestionBatch.update({
      where: { id: batch.id },
      data: {
        status: "FAILED",
        finishedAt: new Date(),
        errorMessage: error instanceof Error ? error.message : String(error),
      },
    });
    throw error;
  }
}

interface EventMeta {
  eventId: string;
  reversedParticipants: boolean;
}

interface NormalizedRefs {
  eventMetaByExternal: Map<string, EventMeta>;
  bookmakerIdByKey: Map<string, string>;
  marketByKey: Map<string, { id: string; selectionIdByOutcome: Map<string, string> }>;
  pendingReview: number;
}

const OUTCOME_LABELS: Record<string, (home: string, away: string) => string> = {
  HOME: (home) => home,
  AWAY: (_h, away) => away,
  DRAW: () => "Empate",
  OVER: () => "Mais de",
  UNDER: () => "Menos de",
  YES: () => "Sim",
  NO: () => "Não",
};

async function normalize(payload: ProviderOddsPayload): Promise<NormalizedRefs> {
  const prisma = getPrisma();

  const sportByExternal = new Map<string, { id: string; key: string }>();
  for (const sport of payload.sports) {
    const row = await prisma.sport.upsert({
      where: { key: sport.key },
      update: { name: sport.name },
      create: { key: sport.key, name: sport.name },
    });
    sportByExternal.set(sport.externalId, { id: row.id, key: row.key });
  }

  const competitionByExternal = new Map<
    string,
    { competitionId: string; competitionName: string; sportKey: string; country: string | null }
  >();
  for (const comp of payload.competitions) {
    const sport = sportByExternal.get(comp.sportExternalId);
    if (!sport) continue;
    const row = await prisma.competition.upsert({
      where: { sportId_key: { sportId: sport.id, key: comp.key } },
      update: { name: comp.name, country: comp.country },
      create: { sportId: sport.id, key: comp.key, name: comp.name, country: comp.country },
    });
    competitionByExternal.set(comp.externalId, {
      competitionId: row.id,
      competitionName: row.name,
      sportKey: sport.key,
      country: row.country,
    });
  }

  const eventMetaByExternal = new Map<string, EventMeta>();
  let pendingReview = 0;
  for (const event of payload.events) {
    const competition = competitionByExternal.get(event.competitionExternalId);
    if (!competition) continue;

    const resolved = await resolveProviderEvent(payload.providerId, event, competition);
    if (resolved.pendingReview || !resolved.eventId) {
      pendingReview += 1;
      continue;
    }
    eventMetaByExternal.set(event.externalId, {
      eventId: resolved.eventId,
      reversedParticipants: resolved.reversedParticipants,
    });
  }

  const bookmakerIdByKey = new Map<string, string>();
  const marketByKey = new Map<string, { id: string; selectionIdByOutcome: Map<string, string> }>();

  for (const entry of payload.odds) {
    if (!bookmakerIdByKey.has(entry.bookmakerKey)) {
      const bookmaker = await prisma.bookmaker.upsert({
        where: { key: entry.bookmakerKey },
        update: { name: entry.bookmakerName },
        create: { key: entry.bookmakerKey, name: entry.bookmakerName },
      });
      bookmakerIdByKey.set(bookmaker.key, bookmaker.id);
    }

    const meta = eventMetaByExternal.get(entry.eventExternalId);
    if (!meta) continue;
    const providerEvent = payload.events.find((e) => e.externalId === entry.eventExternalId)!;
    // Para rotular seleções canônicas com o nome certo quando a ordem do
    // provedor está invertida em relação ao evento canônico.
    const canonicalHome = meta.reversedParticipants
      ? providerEvent.awayName
      : providerEvent.homeName;
    const canonicalAway = meta.reversedParticipants
      ? providerEvent.homeName
      : providerEvent.awayName;

    const marketKey = `${meta.eventId}|${entry.marketType}|${entry.period}|${entry.line ?? ""}`;
    let market = marketByKey.get(marketKey);
    if (!market) {
      const line = entry.line === null ? null : new Prisma.Decimal(entry.line);
      // Unique composto com coluna nullable não deduplica NULLs no Postgres —
      // find-or-create explícito (worker de ingestão é único e sequencial).
      const existing = await prisma.market.findFirst({
        where: {
          eventId: meta.eventId,
          type: entry.marketType as MarketType,
          period: entry.period as MarketPeriod,
          line: line === null ? null : { equals: line },
        },
        include: { selections: true },
      });
      const row =
        existing ??
        (await prisma.market.create({
          data: {
            eventId: meta.eventId,
            type: entry.marketType as MarketType,
            period: entry.period as MarketPeriod,
            line,
            status: "OPEN",
          },
          include: { selections: true },
        }));
      market = {
        id: row.id,
        selectionIdByOutcome: new Map(row.selections.map((s) => [s.outcome, s.id])),
      };
      marketByKey.set(marketKey, market);
    }

    for (const outcome of entry.outcomes) {
      const canonicalOutcome = remapOutcome(
        outcome.outcome,
        entry.marketType,
        meta.reversedParticipants,
      );
      if (!market.selectionIdByOutcome.has(canonicalOutcome)) {
        const label = OUTCOME_LABELS[canonicalOutcome]?.(canonicalHome, canonicalAway);
        const selection = await prisma.selection.upsert({
          where: {
            marketId_outcome: { marketId: market.id, outcome: canonicalOutcome },
          },
          update: {},
          create: {
            marketId: market.id,
            outcome: canonicalOutcome,
            name: label ?? canonicalOutcome,
          },
        });
        market.selectionIdByOutcome.set(canonicalOutcome, selection.id);
      }
    }
  }

  return { eventMetaByExternal, bookmakerIdByKey, marketByKey, pendingReview };
}
