/**
 * Seed determinístico: dados de referência (provedor mock e casas).
 * Esportes, competições, eventos, mercados e odds entram pelo pipeline de
 * ingestão real — o seed não fabrica snapshots nem oportunidades.
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  for (const provider of [
    { key: "mock-primary", name: "Mock Primary Provider" },
    { key: "mock-bravo", name: "Mock Bravo Provider" },
  ]) {
    await prisma.provider.upsert({
      where: { key: provider.key },
      update: { name: provider.name },
      create: { ...provider, kind: "MOCK", enabled: true },
    });
  }

  for (const bookmaker of [
    { key: "bet-alpha", name: "Bet Alpha" },
    { key: "bet-bravo", name: "Bet Bravo" },
    { key: "bet-charlie", name: "Bet Charlie" },
  ]) {
    await prisma.bookmaker.upsert({
      where: { key: bookmaker.key },
      update: { name: bookmaker.name },
      create: bookmaker,
    });
  }

  // Aliases de competição aprovados (seed): melhoram o matching entre os
  // nomes usados pelos dois provedores mockados.
  const competitionAliases = [
    {
      canonicalValue: "Brasileirão Série A",
      canonicalNormalized: "brasileirao serie a",
      aliasValue: "Campeonato Brasileiro Série A",
      aliasNormalized: "campeonato brasileiro serie a",
    },
    {
      canonicalValue: "ATP Rio Open",
      canonicalNormalized: "atp rio open",
      aliasValue: "ATP Rio de Janeiro",
      aliasNormalized: "atp rio de janeiro",
    },
  ];
  for (const alias of competitionAliases) {
    await prisma.nameAlias.upsert({
      where: {
        kind_aliasNormalized_canonicalNormalized: {
          kind: "COMPETITION",
          aliasNormalized: alias.aliasNormalized,
          canonicalNormalized: alias.canonicalNormalized,
        },
      },
      update: {},
      create: {
        kind: "COMPETITION",
        ...alias,
        status: "APPROVED",
        source: "seed",
        approvedBy: "seed",
        approvedAt: new Date("2026-01-01T00:00:00.000Z"),
      },
    });
  }

  console.log(
    "Seed concluído: provedores mock-primary/mock-bravo, casas bet-alpha/bravo/charlie e alias de competição.",
  );
}

main()
  .catch((error) => {
    console.error("Seed falhou:", error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
