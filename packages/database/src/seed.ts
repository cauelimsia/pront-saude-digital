/**
 * Seed determinístico: dados de referência (provedor mock e casas).
 * Esportes, competições, eventos, mercados e odds entram pelo pipeline de
 * ingestão real — o seed não fabrica snapshots nem oportunidades.
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  await prisma.provider.upsert({
    where: { key: "mock-primary" },
    update: {},
    create: {
      key: "mock-primary",
      name: "Mock Primary Provider",
      kind: "MOCK",
      enabled: true,
    },
  });

  for (const bookmaker of [
    { key: "bet-alpha", name: "Bet Alpha" },
    { key: "bet-bravo", name: "Bet Bravo" },
  ]) {
    await prisma.bookmaker.upsert({
      where: { key: bookmaker.key },
      update: { name: bookmaker.name },
      create: bookmaker,
    });
  }

  console.log("Seed concluído: provedor mock-primary e casas bet-alpha/bet-bravo.");
}

main()
  .catch((error) => {
    console.error("Seed falhou:", error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
