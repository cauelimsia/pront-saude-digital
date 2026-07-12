import { afterAll, beforeAll, describe, expect, it } from "vitest";
import Redis from "ioredis";
import { MockOddsProvider, MockOddsProviderBravo } from "@rataria/provider-sdk";
import { disconnectPrisma, getPrisma } from "@rataria/database";
import { loadEnv } from "@rataria/shared";
// Import test-only do pipeline do worker para montar o estado de revisão real.
import { runIngestion } from "../../../worker/src/ingestion";
import { runDetection } from "../../../worker/src/detection";
import { MatchingService } from "./matching.service";

const hasInfra = Boolean(process.env.DATABASE_URL);

const env = loadEnv({
  ...process.env,
  MIN_PROFIT_PERCENT: "0.1",
  REFERENCE_BANKROLL: "1000",
});
const service = new MatchingService();
let redis: Redis;
let cycleCounter = 700_000_000 + Math.floor(Math.random() * 1_000_000);

/** Reinicia o estado e ingere ambos os provedores; retorna a revisão pendente. */
async function resetAndSeedPendingReview() {
  const prisma = getPrisma();
  await prisma.$executeRawUnsafe(
    'TRUNCATE "SurebetValidation","SurebetLeg","SurebetOpportunity","OddsSnapshot","IngestionBatch","EventMatchReview","EventMatch","ProviderEventLink","Selection","Market","Event","ProviderHealthLog","AuditLog" RESTART IDENTITY CASCADE;',
  );
  await prisma.nameAlias.deleteMany({ where: { source: "manual-review" } });
  const clock = () => new Date();
  const cycle = cycleCounter++;
  const a = await runIngestion(new MockOddsProvider({ clock }), cycle);
  for (const eventId of a.eventIds) await runDetection(eventId, env, redis);
  await runIngestion(new MockOddsProviderBravo({ clock }), cycle);
  return service.listReviews({ page: 1, pageSize: 20, status: "PENDING" });
}

describe.skipIf(!hasInfra)("revisão de matching (integração)", () => {
  beforeAll(() => {
    redis = new Redis(process.env.REDIS_URL ?? "redis://localhost:6379");
  });
  afterAll(async () => {
    redis.disconnect();
    await disconnectPrisma();
  });

  it("gera revisão pendente para o caso ambíguo (Grêmio×Internacional, +3h)", async () => {
    const reviews = await resetAndSeedPendingReview();
    expect(reviews.total).toBeGreaterThanOrEqual(1);
    const gremio = reviews.items.find((r) => r.match.providerEvent.externalId === "bv-gi-31");
    expect(gremio).toBeDefined();
    expect(gremio!.match.decision).toBe("REVIEW_REQUIRED");
    expect(gremio!.match.score).toBeGreaterThanOrEqual(60);
  });

  it("aprova: vincula ao canônico, audita, não cria alias redundante e é idempotente", async () => {
    const prisma = getPrisma();
    const reviews = await resetAndSeedPendingReview();
    const review = reviews.items.find((r) => r.match.providerEvent.externalId === "bv-gi-31")!;

    const first = await service.approveReview(review.id, { decidedBy: "tester" });
    expect(first).toEqual({ status: "APPROVED", idempotent: false });

    const link = await prisma.providerEventLink.findFirst({ where: { externalId: "bv-gi-31" } });
    expect(link!.status).toBe("MANUALLY_LINKED");
    expect(link!.eventId).toBe(review.match.candidateEvent.id);

    // "Gremio"/"Internacional" normalizam igual ao canônico (só acento) — o
    // upsert de alias corretamente NÃO cria alias redundante.
    const redundant = await prisma.nameAlias.findFirst({
      where: { kind: "PARTICIPANT", source: "manual-review", aliasNormalized: "gremio" },
    });
    expect(redundant).toBeNull();

    const audit = await prisma.auditLog.findFirst({
      where: { action: "MATCH_REVIEW_APPROVED", entityId: review.id },
    });
    expect(audit).not.toBeNull();

    const second = await service.approveReview(review.id, { decidedBy: "tester" });
    expect(second.idempotent).toBe(true);
  });

  it("aprovação COM nome divergente persiste alias de participante", async () => {
    // Alimenta um link PENDING_REVIEW sintético cujo nome do provedor difere
    // do canônico após normalização (abreviação), para exercitar o alias.
    const prisma = getPrisma();
    await resetAndSeedPendingReview();
    const gremio = await prisma.providerEventLink.findFirst({ where: { externalId: "bv-gi-31" } });
    const canonical = await prisma.event.findFirst({
      where: { homeName: "Grêmio", providerEvents: { some: { providerKey: "mock-primary" } } },
    });
    // ajusta a representação do provedor para um alias real ("Imortal Tricolor")
    await prisma.providerEventLink.update({
      where: { id: gremio!.id },
      data: { homeNameOriginal: "Imortal Tricolor", homeNameNormalized: "imortal tricolor" },
    });
    // Somente o match REVIEW_REQUIRED tem revisão; ignora irmãos rejeitados.
    const match = await prisma.eventMatch.findFirst({
      where: { providerEventLinkId: gremio!.id, review: { isNot: null } },
      include: { review: true },
    });

    await service.approveReview(match!.review!.id, { decidedBy: "tester" });

    const alias = await prisma.nameAlias.findFirst({
      where: {
        kind: "PARTICIPANT",
        source: "manual-review",
        aliasNormalized: "imortal tricolor",
        canonicalNormalized: "gremio",
      },
    });
    expect(alias).not.toBeNull();
    expect(canonical).not.toBeNull();
  });

  it("após aprovação, a ingestão passa a persistir odds do provedor associado", async () => {
    const prisma = getPrisma();
    const reviews = await resetAndSeedPendingReview();
    const review = reviews.items.find((r) => r.match.providerEvent.externalId === "bv-gi-31")!;
    await service.approveReview(review.id, { decidedBy: "tester" });

    const link = await prisma.providerEventLink.findFirst({ where: { externalId: "bv-gi-31" } });
    const clock = () => new Date();
    await runIngestion(new MockOddsProviderBravo({ clock }), cycleCounter++);
    const charlieSnaps = await prisma.oddsSnapshot.count({
      where: {
        selection: { market: { eventId: link!.eventId! } },
        bookmaker: { key: "bet-charlie" },
      },
    });
    expect(charlieSnaps).toBeGreaterThan(0);
  });

  it("rejeita: materializa evento canônico próprio e é idempotente", async () => {
    const prisma = getPrisma();
    const reviews = await resetAndSeedPendingReview();
    const review = reviews.items.find((r) => r.match.providerEvent.externalId === "bv-gi-31")!;

    const before = await prisma.event.count();
    const r1 = await service.rejectReview(review.id, { decidedBy: "tester", note: "confronto diferente" });
    expect(r1.status).toBe("REJECTED");
    const after = await prisma.event.count();
    expect(after).toBe(before + 1);

    const link = await prisma.providerEventLink.findFirst({ where: { externalId: "bv-gi-31" } });
    expect(link!.status).toBe("NEW_EVENT");
    expect(link!.eventId).not.toBeNull();

    const r2 = await service.rejectReview(review.id, { decidedBy: "tester" });
    expect(r2.idempotent).toBe(true);
  });

  it("não permite aprovar uma revisão já rejeitada (conflito)", async () => {
    const reviews = await resetAndSeedPendingReview();
    const review = reviews.items.find((r) => r.match.providerEvent.externalId === "bv-gi-31")!;
    await service.rejectReview(review.id, { decidedBy: "tester" });
    await expect(service.approveReview(review.id, { decidedBy: "tester" })).rejects.toThrow();
  });
});
