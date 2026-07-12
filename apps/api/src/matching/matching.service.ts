import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { getPrisma, Prisma } from "@rataria/database";
import type {
  ListEventMatchesQuery,
  ListReviewsQuery,
  ReviewDecisionBody,
} from "./matching.schemas";

@Injectable()
export class MatchingService {
  async listReviews(query: ListReviewsQuery) {
    const prisma = getPrisma();
    const where: Prisma.EventMatchReviewWhereInput = { status: query.status };
    const [total, items] = await Promise.all([
      prisma.eventMatchReview.count({ where }),
      prisma.eventMatchReview.findMany({
        where,
        include: reviewInclude,
        orderBy: { createdAt: "desc" },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
    ]);
    return {
      page: query.page,
      pageSize: query.pageSize,
      total,
      items: items.map(serializeReview),
    };
  }

  async getReview(id: string) {
    const prisma = getPrisma();
    const review = await prisma.eventMatchReview.findUnique({
      where: { id },
      include: reviewInclude,
    });
    if (!review) throw new NotFoundException(`Revisão ${id} não encontrada`);
    return serializeReview(review);
  }

  async listEventMatches(query: ListEventMatchesQuery) {
    const prisma = getPrisma();
    const where: Prisma.EventMatchWhereInput = {
      ...(query.decision && { decision: query.decision }),
      ...(query.providerKey && { link: { providerKey: query.providerKey } }),
      ...((query.minScore !== undefined || query.maxScore !== undefined) && {
        score: {
          ...(query.minScore !== undefined && { gte: query.minScore }),
          ...(query.maxScore !== undefined && { lte: query.maxScore }),
        },
      }),
    };
    const [total, items] = await Promise.all([
      prisma.eventMatch.count({ where }),
      prisma.eventMatch.findMany({
        where,
        include: { link: true, candidateEvent: { include: candidateEventInclude } },
        orderBy: { createdAt: "desc" },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
    ]);
    return { page: query.page, pageSize: query.pageSize, total, items: items.map(serializeMatch) };
  }

  async getEventMatch(id: string) {
    const prisma = getPrisma();
    const match = await prisma.eventMatch.findUnique({
      where: { id },
      include: { link: true, candidateEvent: { include: candidateEventInclude } },
    });
    if (!match) throw new NotFoundException(`EventMatch ${id} não encontrado`);
    return serializeMatch(match);
  }

  async listProviderEventsForEvent(eventId: string) {
    const prisma = getPrisma();
    const links = await prisma.providerEventLink.findMany({
      where: { eventId },
      orderBy: { providerKey: "asc" },
    });
    return links.map((l) => ({
      id: l.id,
      providerKey: l.providerKey,
      externalId: l.externalId,
      status: l.status,
      reversedParticipants: l.reversedParticipants,
      homeNameOriginal: l.homeNameOriginal,
      awayNameOriginal: l.awayNameOriginal,
      competitionNameOriginal: l.competitionNameOriginal,
      startsAt: l.startsAt?.toISOString() ?? null,
    }));
  }

  /**
   * Aprovação manual idempotente: vincula a representação ao evento canônico
   * candidato, marca a revisão APPROVED e registra auditoria. Repetir a ação
   * numa revisão já aprovada é no-op seguro.
   */
  async approveReview(reviewId: string, body: ReviewDecisionBody) {
    const prisma = getPrisma();
    const review = await prisma.eventMatchReview.findUnique({
      where: { id: reviewId },
      include: { eventMatch: { include: { link: true } } },
    });
    if (!review) throw new NotFoundException(`Revisão ${reviewId} não encontrada`);
    if (review.status === "APPROVED") return { status: "APPROVED", idempotent: true };
    if (review.status === "REJECTED") {
      throw new ConflictException("Revisão já foi rejeitada — não pode ser aprovada");
    }

    const match = review.eventMatch;
    const link = match.link;

    await prisma.$transaction(async (tx) => {
      await tx.providerEventLink.update({
        where: { id: link.id },
        data: {
          eventId: match.candidateEventId,
          status: "MANUALLY_LINKED",
          reversedParticipants: match.reversedParticipants,
        },
      });
      await tx.eventMatch.update({
        where: { id: match.id },
        data: { decision: "MANUALLY_APPROVED" },
      });
      await tx.eventMatchReview.update({
        where: { id: review.id },
        data: { status: "APPROVED", decidedBy: body.decidedBy, decidedAt: new Date(), note: body.note },
      });

      // Alias aprovado: promove participantes/competição para futuros matchings.
      if (link.homeNameNormalized && link.awayNameNormalized) {
        await upsertParticipantAliasesFromLink(tx, match.candidateEventId, link, body.decidedBy);
      }

      await tx.auditLog.create({
        data: {
          action: "MATCH_REVIEW_APPROVED",
          entity: "EventMatchReview",
          entityId: review.id,
          actor: body.decidedBy,
          details: {
            linkId: link.id,
            canonicalEventId: match.candidateEventId,
            score: match.score,
            reversed: match.reversedParticipants,
            note: body.note ?? null,
          },
        },
      });
    });

    return { status: "APPROVED", idempotent: false };
  }

  /**
   * Rejeição manual idempotente: materializa um evento canônico próprio para a
   * representação (não fica órfã) e marca a revisão REJECTED.
   */
  async rejectReview(reviewId: string, body: ReviewDecisionBody) {
    const prisma = getPrisma();
    const review = await prisma.eventMatchReview.findUnique({
      where: { id: reviewId },
      include: { eventMatch: { include: { link: true } } },
    });
    if (!review) throw new NotFoundException(`Revisão ${reviewId} não encontrada`);
    if (review.status === "REJECTED") return { status: "REJECTED", idempotent: true };
    if (review.status === "APPROVED") {
      throw new ConflictException("Revisão já foi aprovada — não pode ser rejeitada");
    }

    const match = review.eventMatch;
    const link = match.link;
    if (!link.competitionId || !link.homeNameOriginal || !link.awayNameOriginal || !link.startsAt) {
      throw new ConflictException(
        "Vínculo sem dados suficientes para materializar evento próprio",
      );
    }

    await prisma.$transaction(async (tx) => {
      const created = await tx.event.create({
        data: {
          competitionId: link.competitionId!,
          homeName: link.homeNameOriginal!,
          awayName: link.awayNameOriginal!,
          startsAt: link.startsAt!,
          status: "SCHEDULED",
        },
      });
      await tx.providerEventLink.update({
        where: { id: link.id },
        data: { eventId: created.id, status: "NEW_EVENT", reversedParticipants: false },
      });
      await tx.eventMatch.update({
        where: { id: match.id },
        data: { decision: "MANUALLY_REJECTED" },
      });
      await tx.eventMatchReview.update({
        where: { id: review.id },
        data: { status: "REJECTED", decidedBy: body.decidedBy, decidedAt: new Date(), note: body.note },
      });
      await tx.auditLog.create({
        data: {
          action: "MATCH_REVIEW_REJECTED",
          entity: "EventMatchReview",
          entityId: review.id,
          actor: body.decidedBy,
          details: { linkId: link.id, newEventId: created.id, note: body.note ?? null },
        },
      });
    });

    return { status: "REJECTED", idempotent: false };
  }
}

const candidateEventInclude = {
  competition: { include: { sport: true } },
} satisfies Prisma.EventInclude;

const reviewInclude = {
  eventMatch: {
    include: {
      link: true,
      candidateEvent: { include: candidateEventInclude },
    },
  },
} satisfies Prisma.EventMatchReviewInclude;

type ReviewWithRelations = Prisma.EventMatchReviewGetPayload<{ include: typeof reviewInclude }>;
type MatchWithRelations = Prisma.EventMatchGetPayload<{
  include: { link: true; candidateEvent: { include: typeof candidateEventInclude } };
}>;

function serializeMatch(match: MatchWithRelations) {
  return {
    id: match.id,
    score: match.score,
    decision: match.decision,
    algorithmVersion: match.algorithmVersion,
    reversedParticipants: match.reversedParticipants,
    features: match.features,
    explanation: match.explanation,
    createdAt: match.createdAt.toISOString(),
    providerEvent: {
      providerKey: match.link.providerKey,
      externalId: match.link.externalId,
      home: match.link.homeNameOriginal,
      away: match.link.awayNameOriginal,
      competition: match.link.competitionNameOriginal,
      startsAt: match.link.startsAt?.toISOString() ?? null,
      status: match.link.status,
    },
    candidateEvent: {
      id: match.candidateEvent.id,
      home: match.candidateEvent.homeName,
      away: match.candidateEvent.awayName,
      competition: match.candidateEvent.competition.name,
      sport: match.candidateEvent.competition.sport.name,
      country: match.candidateEvent.competition.country,
      startsAt: match.candidateEvent.startsAt.toISOString(),
    },
  };
}

function serializeReview(review: ReviewWithRelations) {
  return {
    id: review.id,
    status: review.status,
    decidedBy: review.decidedBy,
    note: review.note,
    decidedAt: review.decidedAt?.toISOString() ?? null,
    createdAt: review.createdAt.toISOString(),
    match: serializeMatch(review.eventMatch),
  };
}

async function upsertParticipantAliasesFromLink(
  tx: Prisma.TransactionClient,
  candidateEventId: string,
  link: {
    homeNameOriginal: string | null;
    awayNameOriginal: string | null;
    homeNameNormalized: string | null;
    awayNameNormalized: string | null;
    reversedParticipants: boolean;
  },
  approvedBy: string,
) {
  const canonical = await tx.event.findUnique({ where: { id: candidateEventId } });
  if (!canonical) return;
  // Mapeia lado do provedor → lado canônico conforme a orientação aprovada.
  const pairs = link.reversedParticipants
    ? [
        { alias: link.homeNameOriginal, canonical: canonical.awayName },
        { alias: link.awayNameOriginal, canonical: canonical.homeName },
      ]
    : [
        { alias: link.homeNameOriginal, canonical: canonical.homeName },
        { alias: link.awayNameOriginal, canonical: canonical.awayName },
      ];

  for (const pair of pairs) {
    if (!pair.alias || !pair.canonical) continue;
    const aliasNormalized = normalizeForAlias(pair.alias);
    const canonicalNormalized = normalizeForAlias(pair.canonical);
    if (aliasNormalized === canonicalNormalized) continue;
    await tx.nameAlias.upsert({
      where: {
        kind_aliasNormalized_canonicalNormalized: {
          kind: "PARTICIPANT",
          aliasNormalized,
          canonicalNormalized,
        },
      },
      update: { status: "APPROVED", approvedBy, approvedAt: new Date() },
      create: {
        kind: "PARTICIPANT",
        canonicalValue: pair.canonical,
        canonicalNormalized,
        aliasValue: pair.alias,
        aliasNormalized,
        status: "APPROVED",
        source: "manual-review",
        approvedBy,
        approvedAt: new Date(),
      },
    });
  }
}

// Normalização leve alinhada ao normalizador do matching (diacríticos + caixa).
function normalizeForAlias(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[.,;:!?@()[\]{}'"/\\|_–—-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
