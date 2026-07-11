import { getPrisma } from "@rataria/database";
import type Redis from "ioredis";
import { logger } from "./logger";
import { publishLiveEvent } from "./detection";

/**
 * Expira oportunidades cujo expiresAt passou sem reconfirmação.
 * Estados terminais (EXPIRED/INVALIDATED) nunca voltam.
 */
export async function runExpiration(redis: Redis): Promise<number> {
  const prisma = getPrisma();
  const now = new Date();

  const stale = await prisma.surebetOpportunity.findMany({
    where: {
      status: { in: ["ACTIVE", "DETECTED", "UNEXECUTABLE", "STALE"] },
      expiresAt: { lt: now },
    },
    select: { id: true },
  });
  if (stale.length === 0) return 0;

  await prisma.surebetOpportunity.updateMany({
    where: { id: { in: stale.map((s) => s.id) } },
    data: { status: "EXPIRED" },
  });

  for (const opp of stale) {
    await publishLiveEvent(redis, {
      type: "opportunity.expired",
      opportunityId: opp.id,
      at: now.toISOString(),
    });
  }

  logger.info({ count: stale.length }, "oportunidades expiradas");
  return stale.length;
}
