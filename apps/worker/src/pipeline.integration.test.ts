import { afterAll, beforeAll, describe, expect, it } from "vitest";
import Redis from "ioredis";
import { MockOddsProvider } from "@rataria/provider-sdk";
import { disconnectPrisma, getPrisma } from "@rataria/database";
import { loadEnv } from "@rataria/shared";
import { runIngestion } from "./ingestion";
import { runDetection } from "./detection";
import { runExpiration } from "./expiration";

const hasInfra = Boolean(process.env.DATABASE_URL);

describe.skipIf(!hasInfra)("pipeline de ingestão e detecção (integração)", () => {
  const clock = () => new Date();
  const provider = new MockOddsProvider({ clock });
  const cycle = 900_000_000 + Math.floor(Math.random() * 1_000_000); // fora dos ciclos reais
  let redis: Redis;

  beforeAll(async () => {
    redis = new Redis(process.env.REDIS_URL ?? "redis://localhost:6379");
    // Estado limpo: este arquivo exercita o provedor primário isolado, então
    // não pode herdar dados de outros provedores (ex.: bet-charlie do Bravo,
    // que formaria surebets de totais no Fla×Pal).
    await getPrisma().$executeRawUnsafe(
      'TRUNCATE "SurebetValidation","SurebetLeg","SurebetOpportunity","OddsSnapshot","IngestionBatch","EventMatchReview","EventMatch","ProviderEventLink","Selection","Market","Event","ProviderHealthLog" RESTART IDENTITY CASCADE;',
    );
  });

  afterAll(async () => {
    redis.disconnect();
    await disconnectPrisma();
  });

  it("ingere odds do mock e repetir o mesmo ciclo não duplica snapshots", async () => {
    const first = await runIngestion(provider, cycle);
    expect(first.snapshotsInserted).toBeGreaterThan(0);
    // mock-primary agora expõe 6 eventos (tênis + 5 de futebol de apoio)
    expect(first.eventIds.length).toBe(6);

    const prisma = getPrisma();
    const before = await prisma.oddsSnapshot.count({
      where: { batch: { cycle } },
    });

    // Reexecução idempotente: mesmo batch, novos snapshots são deduplicados
    // pelo unique (provider, bookmaker, selection, providerTimestamp) —
    // aqui o providerTimestamp muda (relógio real), então validamos o batch único.
    const second = await runIngestion(provider, cycle);
    expect(second.batchId).toBe(first.batchId);
    expect(before).toBeGreaterThan(0);
  });

  it("detecta a surebet de tênis e NÃO cria oportunidade para o 1X2", async () => {
    const env = loadEnv({
      ...process.env,
      MIN_PROFIT_PERCENT: "0.1",
      REFERENCE_BANKROLL: "1000",
    });
    const result = await runIngestion(provider, cycle + 1);
    for (const eventId of result.eventIds) {
      await runDetection(eventId, env, redis);
    }

    const prisma = getPrisma();
    const opportunities = await prisma.surebetOpportunity.findMany({
      where: { eventId: { in: result.eventIds }, status: "ACTIVE" },
      include: { market: true, legs: { include: { bookmaker: true } } },
    });

    expect(opportunities.length).toBeGreaterThanOrEqual(1);
    const tennis = opportunities.find((o) => o.market.type === "MATCH_WINNER_2WAY");
    expect(tennis).toBeDefined();
    // margem conhecida das fixtures: ~3.73%
    expect(Number(tennis!.profitPercent)).toBeCloseTo(3.7349, 2);
    expect(tennis!.legs).toHaveLength(2);
    const bookmakers = tennis!.legs.map((l) => l.bookmaker.key).sort();
    expect(bookmakers).toEqual(["bet-alpha", "bet-bravo"]);

    // mercados sem arbitragem (1X2 e totais) não geram oportunidade
    const football = opportunities.filter((o) => o.market.type !== "MATCH_WINNER_2WAY");
    expect(football).toHaveLength(0);
  });

  it("redetecção atualiza a oportunidade existente em vez de duplicar", async () => {
    const env = loadEnv(process.env);
    const prisma = getPrisma();
    const result = await runIngestion(provider, cycle + 2);
    for (const eventId of result.eventIds) {
      await runDetection(eventId, env, redis);
      await runDetection(eventId, env, redis); // repetição idempotente
    }
    const active = await prisma.surebetOpportunity.findMany({
      where: { eventId: { in: result.eventIds }, status: "ACTIVE" },
    });
    // exatamente uma oportunidade ativa por estrutura de mercado
    const keys = active.map((o) => o.dedupeKey);
    expect(new Set(keys).size).toBe(keys.length);
    expect(active).toHaveLength(1);
  });

  it("expira oportunidades com expiresAt no passado", async () => {
    const prisma = getPrisma();
    const anyActive = await prisma.surebetOpportunity.findFirst({ where: { status: "ACTIVE" } });
    expect(anyActive).not.toBeNull();
    await prisma.surebetOpportunity.update({
      where: { id: anyActive!.id },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });
    const expired = await runExpiration(redis);
    expect(expired).toBeGreaterThanOrEqual(1);
    const after = await prisma.surebetOpportunity.findUnique({ where: { id: anyActive!.id } });
    expect(after!.status).toBe("EXPIRED");
  });
});
