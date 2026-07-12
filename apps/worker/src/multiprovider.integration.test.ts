import { afterAll, beforeAll, describe, expect, it } from "vitest";
import Redis from "ioredis";
import { MockOddsProvider, MockOddsProviderBravo } from "@rataria/provider-sdk";
import { disconnectPrisma, getPrisma } from "@rataria/database";
import { loadEnv } from "@rataria/shared";
import { runIngestion } from "./ingestion";
import { runDetection } from "./detection";

const hasInfra = Boolean(process.env.DATABASE_URL);

/**
 * Fluxo de matching multi-provedor de ponta a ponta, sobre estado limpo.
 * Exercita a matriz de cenários das fixtures (ver bravo-fixtures.ts).
 */
describe.skipIf(!hasInfra)("matching multi-provedor (integração)", () => {
  const clock = () => new Date();
  const alpha = new MockOddsProvider({ clock });
  const bravo = new MockOddsProviderBravo({ clock });
  const cycle = 800_000_000 + Math.floor(Math.random() * 1_000_000);
  let redis: Redis;
  const env = loadEnv({ ...process.env, MIN_PROFIT_PERCENT: "0.1", REFERENCE_BANKROLL: "1000" });

  beforeAll(async () => {
    redis = new Redis(process.env.REDIS_URL ?? "redis://localhost:6379");
    // Estado limpo: remove associações, snapshots, oportunidades e eventos.
    const prisma = getPrisma();
    await prisma.$executeRawUnsafe(
      'TRUNCATE "SurebetValidation","SurebetLeg","SurebetOpportunity","OddsSnapshot","IngestionBatch","EventMatchReview","EventMatch","ProviderEventLink","Selection","Market","Event","ProviderHealthLog" RESTART IDENTITY CASCADE;',
    );

    // Ordem determinística: primário estabelece eventos canônicos, Bravo casa.
    const a = await runIngestion(alpha, cycle);
    for (const eventId of a.eventIds) await runDetection(eventId, env, redis);
    const b = await runIngestion(bravo, cycle);
    for (const eventId of b.eventIds) await runDetection(eventId, env, redis);
  });

  afterAll(async () => {
    redis.disconnect();
    await disconnectPrisma();
  });

  it("associa automaticamente Flamengo×Palmeiras entre os dois provedores", async () => {
    const prisma = getPrisma();
    const links = await prisma.providerEventLink.findMany({
      where: { externalId: { in: ["ev-fla-pal", "bv-fp-77"] } },
      include: { event: true },
    });
    expect(links).toHaveLength(2);
    // ambos apontam para o MESMO evento canônico
    const eventIds = new Set(links.map((l) => l.eventId));
    expect(eventIds.size).toBe(1);
    const bravoLink = links.find((l) => l.providerKey === "mock-bravo")!;
    expect(bravoLink.status).toBe("AUTO_LINKED");
  });

  it("detecta a SUREBET multi-provedor no mercado de totais 2.5 (over alpha + under charlie)", async () => {
    const prisma = getPrisma();
    const link = await prisma.providerEventLink.findFirst({
      where: { externalId: "ev-fla-pal" },
    });
    const opp = await prisma.surebetOpportunity.findFirst({
      where: { eventId: link!.eventId!, status: "ACTIVE", market: { type: "TOTALS" } },
      include: { legs: { include: { bookmaker: true, selection: true } }, market: true },
    });
    expect(opp).not.toBeNull();
    expect(opp!.providerKeys.sort()).toEqual(["mock-bravo", "mock-primary"]);
    expect(opp!.market.line!.toString()).toBe("2.5");
    // over vem da Bet Alpha (1.92 @ mock-primary), under da Bet Charlie (2.10 @ mock-bravo)
    const byOutcome = Object.fromEntries(
      opp!.legs.map((l) => [l.selection.outcome, l.bookmaker.key]),
    );
    expect(byOutcome.OVER).toBe("bet-alpha");
    expect(byOutcome.UNDER).toBe("bet-charlie");
    expect(Number(opp!.profitPercent)).toBeGreaterThan(0);
  });

  it("remapeia corretamente a ordem invertida do tênis (sem falsa surebet)", async () => {
    const prisma = getPrisma();
    const bravoLink = await prisma.providerEventLink.findFirst({
      where: { externalId: "bv-tn-12" },
    });
    expect(bravoLink!.status).toBe("AUTO_LINKED");
    expect(bravoLink!.reversedParticipants).toBe(true);

    // O snapshot HOME da Bet Charlie (1.95, que no Bravo é Alvarez) deve ter
    // sido remapeado para a seleção AWAY do evento canônico.
    const event = await prisma.event.findUnique({
      where: { id: bravoLink!.eventId! },
      include: {
        markets: {
          where: { type: "MATCH_WINNER_2WAY" },
          include: {
            selections: {
              include: { snapshots: { include: { bookmaker: true, provider: true } } },
            },
          },
        },
      },
    });
    const away = event!.markets[0]!.selections.find((s) => s.outcome === "AWAY")!;
    const charlieOnAway = away.snapshots.find((s) => s.bookmaker.key === "bet-charlie");
    expect(charlieOnAway).toBeDefined();
    expect(Number(charlieOnAway!.odd)).toBe(1.95);
  });

  it("envia o caso ambíguo (Grêmio×Internacional, +3h) para revisão, sem odds ativas", async () => {
    const prisma = getPrisma();
    const link = await prisma.providerEventLink.findFirst({
      where: { externalId: "bv-gi-31" },
      include: { matches: { include: { review: true } } },
    });
    expect(link!.status).toBe("PENDING_REVIEW");
    expect(link!.eventId).toBeNull();
    const review = link!.matches.find((m) => m.review)?.review;
    expect(review?.status).toBe("PENDING");
    // nenhum snapshot da Bet Charlie foi persistido para este par
    const charlieSnaps = await prisma.oddsSnapshot.count({
      where: { bookmaker: { key: "bet-charlie" }, provider: { key: "mock-bravo" }, selection: { market: { event: { homeName: "Grêmio" } } } },
    });
    expect(charlieSnaps).toBe(0);
  });

  it("REJEITA o falso positivo do sub-20 (conflito de categoria) — nenhuma surebet", async () => {
    const prisma = getPrisma();
    const bravoLink = await prisma.providerEventLink.findFirst({
      where: { externalId: "bv-u20-9" },
    });
    // criou evento canônico próprio (não uniu ao jogo principal)
    expect(bravoLink!.status).toBe("NEW_EVENT");
    const mainEvent = await prisma.providerEventLink.findFirst({
      where: { externalId: "ev-spfc-cor" },
    });
    expect(bravoLink!.eventId).not.toBe(mainEvent!.eventId);

    // a decisão rejeitada registra o conflito de categoria
    const match = await prisma.eventMatch.findFirst({
      where: { link: { externalId: "bv-u20-9" }, decision: "REJECTED" },
    });
    // (pode ou não haver candidato; se houver match, é rejeição por categoria)
    if (match) {
      const explanation = match.explanation as { hardConflictReasons?: Array<{ code: string }> };
      const codes = explanation.hardConflictReasons?.map((r) => r.code) ?? [];
      expect(codes).toContain("CATEGORY_CONFLICT");
    }

    // e nenhuma surebet de dígitos altos foi criada para o jogo principal
    const bogus = await prisma.surebetOpportunity.findFirst({
      where: { eventId: mainEvent!.eventId!, status: "ACTIVE" },
    });
    expect(bogus).toBeNull();
  });

  it("não une Barcelona (La Liga) com Barcelona SC (LigaPro) — competições diferentes", async () => {
    const prisma = getPrisma();
    const bravoLink = await prisma.providerEventLink.findFirst({
      where: { externalId: "bv-be-44" },
    });
    const ligaproLink = await prisma.providerEventLink.findFirst({
      where: { externalId: "ev-bar-eme" },
    });
    expect(bravoLink!.status).toBe("NEW_EVENT");
    expect(bravoLink!.eventId).not.toBe(ligaproLink!.eventId);
  });

  it("não combina mercados de linha ou período diferentes no mesmo evento", async () => {
    const prisma = getPrisma();
    const link = await prisma.providerEventLink.findFirst({
      where: { externalId: "ev-fla-pal" },
    });
    const markets = await prisma.market.findMany({
      where: { eventId: link!.eventId! },
    });
    // devem coexistir mercados distintos: totais 2.5 FT, totais 3 FT, totais 2.5 1ºT
    const totals = markets.filter((m) => m.type === "TOTALS");
    const signatures = totals.map((m) => `${m.period}|${m.line?.toString()}`);
    expect(signatures).toContain("FULL_TIME|2.5");
    expect(signatures).toContain("FULL_TIME|3");
    expect(signatures).toContain("FIRST_HALF|2.5");
    // nenhuma oportunidade cruza linha/período (só a de totais 2.5 FT é válida)
    const totalsOpps = await prisma.surebetOpportunity.findMany({
      where: { eventId: link!.eventId!, status: "ACTIVE", market: { type: "TOTALS" } },
      include: { market: true },
    });
    for (const opp of totalsOpps) {
      expect(opp.market.line!.toString()).toBe("2.5");
      expect(opp.market.period).toBe("FULL_TIME");
    }
  });
});
