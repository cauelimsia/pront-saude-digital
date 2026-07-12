import { getPrisma, Prisma } from "@rataria/database";
import {
  DEFAULT_MATCHING_CONFIG,
  MATCHING_ALGORITHM_VERSION,
  matchAgainstCandidates,
  NORMALIZER_VERSION,
  normalizeText,
  type ApprovedAlias,
  type EventMatchResult,
  type MatchableCanonicalEvent,
  type MatchableProviderEvent,
} from "@rataria/matching";
import type { ProviderEvent } from "@rataria/provider-sdk";
import { logger } from "./logger";

export interface ResolvedProviderEvent {
  /** null enquanto aguarda revisão manual — odds não são persistidas. */
  eventId: string | null;
  linkId: string;
  reversedParticipants: boolean;
  pendingReview: boolean;
}

interface CompetitionContext {
  competitionId: string;
  competitionName: string;
  sportKey: string;
  country: string | null;
}

/**
 * Resolve a representação de um evento de provedor para o evento canônico:
 * reutiliza vínculo existente ou executa o matching explicável
 * (candidatos → features → score → decisão → persistência).
 *
 * Idempotente: o unique (providerKey, externalId) garante um único vínculo;
 * EventMatch tem unique por (vínculo, candidato, versão do algoritmo).
 */
export async function resolveProviderEvent(
  providerKey: string,
  event: ProviderEvent,
  competition: CompetitionContext,
): Promise<ResolvedProviderEvent> {
  const prisma = getPrisma();

  const existing = await prisma.providerEventLink.findUnique({
    where: { providerKey_externalId: { providerKey, externalId: event.externalId } },
  });
  if (existing) {
    if (existing.status === "PENDING_REVIEW") {
      return {
        eventId: null,
        linkId: existing.id,
        reversedParticipants: existing.reversedParticipants,
        pendingReview: true,
      };
    }
    // Apenas o provedor que ORIGINOU o evento canônico atualiza horário/status,
    // evitando flip-flop entre provedores com horários ligeiramente diferentes.
    if (existing.status === "NEW_EVENT" && existing.eventId) {
      await prisma.event.update({
        where: { id: existing.eventId },
        data: { status: event.status, startsAt: event.startsAt },
      });
    }
    return {
      eventId: existing.eventId,
      linkId: existing.id,
      reversedParticipants: existing.reversedParticipants,
      pendingReview: false,
    };
  }

  const config = DEFAULT_MATCHING_CONFIG;
  const matchable: MatchableProviderEvent = {
    providerKey,
    externalId: event.externalId,
    sportKey: competition.sportKey,
    homeNameOriginal: event.homeName,
    awayNameOriginal: event.awayName,
    homeNameNormalized: normalizeText(event.homeName, config),
    awayNameNormalized: normalizeText(event.awayName, config),
    competitionNameOriginal: competition.competitionName,
    competitionNameNormalized: normalizeText(competition.competitionName, config),
    country: competition.country,
    startsAt: event.startsAt,
  };

  // Blocking no banco: eventos do mesmo esporte dentro da janela de horário,
  // ainda sem representação deste provedor.
  const windowStart = new Date(event.startsAt.getTime() - config.candidateWindowMs);
  const windowEnd = new Date(event.startsAt.getTime() + config.candidateWindowMs);
  const candidateRows = await prisma.event.findMany({
    where: {
      startsAt: { gte: windowStart, lte: windowEnd },
      competition: { sport: { key: competition.sportKey } },
      providerEvents: { none: { providerKey } },
    },
    include: { competition: { include: { sport: true } } },
  });

  const candidates: MatchableCanonicalEvent[] = candidateRows.map((row) => ({
    eventId: row.id,
    sportKey: row.competition.sport.key,
    homeNameNormalized: normalizeText(row.homeName, config),
    awayNameNormalized: normalizeText(row.awayName, config),
    competitionNameNormalized: normalizeText(row.competition.name, config),
    country: row.competition.country,
    startsAt: row.startsAt,
  }));

  const aliasRows = await prisma.nameAlias.findMany({ where: { status: "APPROVED" } });
  const aliases: ApprovedAlias[] = aliasRows.map((a) => ({
    kind: a.kind,
    aliasNormalized: a.aliasNormalized,
    canonicalNormalized: a.canonicalNormalized,
  }));

  const { results, candidatesEvaluated } = matchAgainstCandidates(
    matchable,
    candidates,
    aliases,
    config,
  );
  const best = results[0];

  const linkData = {
    providerKey,
    externalId: event.externalId,
    homeNameOriginal: event.homeName,
    awayNameOriginal: event.awayName,
    homeNameNormalized: matchable.homeNameNormalized,
    awayNameNormalized: matchable.awayNameNormalized,
    competitionNameOriginal: competition.competitionName,
    // Preservado para materializar um evento canônico próprio se uma revisão
    // for rejeitada.
    competitionId: competition.competitionId,
    startsAt: event.startsAt,
    normalizerVersion: NORMALIZER_VERSION,
  };

  let resolved: ResolvedProviderEvent;

  if (best && best.decision === "AUTO_APPROVED") {
    const link = await prisma.providerEventLink.create({
      data: {
        ...linkData,
        eventId: best.candidateEventId,
        status: "AUTO_LINKED",
        reversedParticipants: best.matchedWithReversedParticipants,
      },
    });
    await persistMatchResults(link.id, results, "AUTO_APPROVED");
    resolved = {
      eventId: best.candidateEventId,
      linkId: link.id,
      reversedParticipants: best.matchedWithReversedParticipants,
      pendingReview: false,
    };
  } else if (best && best.decision === "REVIEW_REQUIRED") {
    const link = await prisma.providerEventLink.create({
      data: { ...linkData, eventId: null, status: "PENDING_REVIEW" },
    });
    const matches = await persistMatchResults(link.id, results, "REVIEW_REQUIRED");
    const reviewMatch = matches.find((m) => m.candidateEventId === best.candidateEventId);
    if (reviewMatch) {
      // unique(eventMatchId): nunca há duas revisões abertas para o mesmo par+versão
      await prisma.eventMatchReview.upsert({
        where: { eventMatchId: reviewMatch.id },
        update: {},
        create: { eventMatchId: reviewMatch.id, status: "PENDING" },
      });
    }
    resolved = {
      eventId: null,
      linkId: link.id,
      reversedParticipants: best.matchedWithReversedParticipants,
      pendingReview: true,
    };
  } else {
    // Sem correspondência aceitável: o provedor origina o próprio evento canônico.
    const created = await prisma.event.create({
      data: {
        competitionId: competition.competitionId,
        homeName: event.homeName,
        awayName: event.awayName,
        startsAt: event.startsAt,
        status: event.status,
      },
    });
    const link = await prisma.providerEventLink.create({
      data: { ...linkData, eventId: created.id, status: "NEW_EVENT" },
    });
    await persistMatchResults(link.id, results, "NEW_EVENT");
    resolved = {
      eventId: created.id,
      linkId: link.id,
      reversedParticipants: false,
      pendingReview: false,
    };
  }

  logger.info(
    {
      providerKey,
      externalId: event.externalId,
      candidatesEvaluated,
      bestScore: best?.score ?? null,
      decision: best?.decision ?? "NO_CANDIDATES",
      reversed: best?.matchedWithReversedParticipants ?? false,
      algorithmVersion: MATCHING_ALGORITHM_VERSION,
      linkId: resolved.linkId,
      canonicalEventId: resolved.eventId,
    },
    "matching de evento de provedor concluído",
  );

  return resolved;
}

/** Persiste as decisões (melhor e até 2 rejeitados adicionais) para auditoria. */
async function persistMatchResults(
  linkId: string,
  results: EventMatchResult[],
  context: "AUTO_APPROVED" | "REVIEW_REQUIRED" | "NEW_EVENT",
) {
  const prisma = getPrisma();
  const toPersist = results.slice(0, 3);
  const created: Array<{ id: string; candidateEventId: string }> = [];
  for (const result of toPersist) {
    const decision =
      context === "NEW_EVENT"
        ? "REJECTED"
        : result === results[0]
          ? result.decision
          : "REJECTED";
    const row = await prisma.eventMatch.upsert({
      where: {
        providerEventLinkId_candidateEventId_algorithmVersion: {
          providerEventLinkId: linkId,
          candidateEventId: result.candidateEventId,
          algorithmVersion: result.algorithmVersion,
        },
      },
      update: {},
      create: {
        providerEventLinkId: linkId,
        candidateEventId: result.candidateEventId,
        algorithmVersion: result.algorithmVersion,
        score: result.score,
        decision,
        reversedParticipants: result.matchedWithReversedParticipants,
        features: result.features as unknown as Prisma.InputJsonValue,
        explanation: {
          positiveReasons: result.positiveReasons,
          negativeReasons: result.negativeReasons,
          hardConflictReasons: result.hardConflictReasons,
        } as unknown as Prisma.InputJsonValue,
      },
      select: { id: true, candidateEventId: true },
    });
    created.push(row);
  }
  return created;
}
