import { getPrisma, Prisma, type MarketPeriod, type MarketType } from "@rataria/database";
import {
  providerOddsPayloadSchema,
  type OddsProvider,
  type ProviderOddsPayload,
} from "@rataria/provider-sdk";
import { logger } from "./logger";

export interface IngestionResult {
  batchId: string;
  cycle: number;
  snapshotsInserted: number;
  eventIds: string[];
}

/**
 * Pipeline de ingestão: coleta → validação (Zod) → normalização (upserts)
 * → snapshots com dedupe por unique composto.
 *
 * Idempotente: repetir o mesmo ciclo reutiliza o batch (unique providerId+cycle)
 * e `skipDuplicates` impede snapshots repetidos.
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

  // Validação de payload na fronteira da ingestão.
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
    const normalized = await normalize(payload, providerRow.id);

    const snapshotRows: Prisma.OddsSnapshotCreateManyInput[] = [];
    for (const entry of payload.odds) {
      if (entry.marketStatus !== "OPEN") continue; // mercados suspensos não entram
      const eventId = normalized.eventIdByExternal.get(entry.eventExternalId);
      if (!eventId) continue;
      const marketKey = `${eventId}|${entry.marketType}|${entry.period}|${entry.line ?? ""}`;
      const market = normalized.marketByKey.get(marketKey);
      if (!market) continue;
      const bookmakerId = normalized.bookmakerIdByKey.get(entry.bookmakerKey);
      if (!bookmakerId) continue;

      for (const outcome of entry.outcomes) {
        const selectionId = market.selectionIdByOutcome.get(outcome.outcome);
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
      data: {
        status: "COMPLETED",
        finishedAt: new Date(),
        oddsCount: inserted.count,
      },
    });

    logger.info(
      {
        batchId: batch.id,
        cycle,
        providerId: provider.providerId,
        snapshots: inserted.count,
        latencyMs,
      },
      "ingestão concluída",
    );

    return {
      batchId: batch.id,
      cycle,
      snapshotsInserted: inserted.count,
      eventIds: [...normalized.eventIdByExternal.values()],
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

interface NormalizedRefs {
  eventIdByExternal: Map<string, string>;
  bookmakerIdByKey: Map<string, string>;
  marketByKey: Map<string, { id: string; selectionIdByOutcome: Map<string, string> }>;
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

async function normalize(
  payload: ProviderOddsPayload,
  providerRowId: string,
): Promise<NormalizedRefs> {
  const prisma = getPrisma();
  void providerRowId;

  const sportIdByExternal = new Map<string, string>();
  for (const sport of payload.sports) {
    const row = await prisma.sport.upsert({
      where: { key: sport.key },
      update: { name: sport.name },
      create: { key: sport.key, name: sport.name },
    });
    sportIdByExternal.set(sport.externalId, row.id);
  }

  const competitionIdByExternal = new Map<string, string>();
  for (const comp of payload.competitions) {
    const sportId = sportIdByExternal.get(comp.sportExternalId);
    if (!sportId) continue;
    const row = await prisma.competition.upsert({
      where: { sportId_key: { sportId, key: comp.key } },
      update: { name: comp.name, country: comp.country },
      create: { sportId, key: comp.key, name: comp.name, country: comp.country },
    });
    competitionIdByExternal.set(comp.externalId, row.id);
  }

  const eventIdByExternal = new Map<string, string>();
  for (const event of payload.events) {
    const competitionId = competitionIdByExternal.get(event.competitionExternalId);
    if (!competitionId) continue;

    // Correspondência mínima do fluxo vertical: vínculo direto pelo
    // identificador externo do provedor (matching probabilístico é a Fase 4).
    const link = await prisma.providerEventLink.findUnique({
      where: {
        providerKey_externalId: {
          providerKey: payload.providerId,
          externalId: event.externalId,
        },
      },
    });

    let eventId: string;
    if (link) {
      eventId = link.eventId;
      await prisma.event.update({
        where: { id: eventId },
        data: { status: event.status, startsAt: event.startsAt },
      });
    } else {
      const created = await prisma.event.create({
        data: {
          competitionId,
          homeName: event.homeName,
          awayName: event.awayName,
          startsAt: event.startsAt,
          status: event.status,
        },
      });
      await prisma.providerEventLink.create({
        data: {
          eventId: created.id,
          providerKey: payload.providerId,
          externalId: event.externalId,
        },
      });
      eventId = created.id;
    }
    eventIdByExternal.set(event.externalId, eventId);
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

    const eventId = eventIdByExternal.get(entry.eventExternalId);
    if (!eventId) continue;
    const providerEvent = payload.events.find((e) => e.externalId === entry.eventExternalId)!;

    const marketKey = `${eventId}|${entry.marketType}|${entry.period}|${entry.line ?? ""}`;
    if (!marketByKey.has(marketKey)) {
      const line = entry.line === null ? null : new Prisma.Decimal(entry.line);
      // Unique composto com coluna nullable não deduplica NULLs no Postgres —
      // find-or-create explícito (worker de ingestão é único e sequencial).
      const existing = await prisma.market.findFirst({
        where: {
          eventId,
          type: entry.marketType as MarketType,
          period: entry.period as MarketPeriod,
          line: line === null ? null : { equals: line },
        },
        include: { selections: true },
      });
      const market =
        existing ??
        (await prisma.market.create({
          data: {
            eventId,
            type: entry.marketType as MarketType,
            period: entry.period as MarketPeriod,
            line,
            status: "OPEN",
          },
          include: { selections: true },
        }));

      const selectionIdByOutcome = new Map<string, string>(
        market.selections.map((s) => [s.outcome, s.id]),
      );
      for (const outcome of entry.outcomes) {
        if (!selectionIdByOutcome.has(outcome.outcome)) {
          const label = OUTCOME_LABELS[outcome.outcome]?.(
            providerEvent.homeName,
            providerEvent.awayName,
          );
          const selection = await prisma.selection.upsert({
            where: { marketId_outcome: { marketId: market.id, outcome: outcome.outcome } },
            update: {},
            create: {
              marketId: market.id,
              outcome: outcome.outcome,
              name: label ?? outcome.outcome,
            },
          });
          selectionIdByOutcome.set(outcome.outcome, selection.id);
        }
      }
      marketByKey.set(marketKey, { id: market.id, selectionIdByOutcome });
    } else {
      // Garante seleções de entradas posteriores do mesmo mercado.
      const market = marketByKey.get(marketKey)!;
      for (const outcome of entry.outcomes) {
        if (!market.selectionIdByOutcome.has(outcome.outcome)) {
          const label = OUTCOME_LABELS[outcome.outcome]?.(
            providerEvent.homeName,
            providerEvent.awayName,
          );
          const selection = await prisma.selection.upsert({
            where: { marketId_outcome: { marketId: market.id, outcome: outcome.outcome } },
            update: {},
            create: {
              marketId: market.id,
              outcome: outcome.outcome,
              name: label ?? outcome.outcome,
            },
          });
          market.selectionIdByOutcome.set(outcome.outcome, selection.id);
        }
      }
    }
  }

  return { eventIdByExternal, bookmakerIdByKey, marketByKey };
}
