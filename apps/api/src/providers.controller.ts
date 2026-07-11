import { Controller, Get } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { getPrisma } from "@rataria/database";

@ApiTags("providers")
@Controller("providers")
export class ProvidersController {
  @Get()
  @ApiOperation({ summary: "Provedores registrados" })
  async list() {
    const prisma = getPrisma();
    return prisma.provider.findMany({
      select: { id: true, key: true, name: true, kind: true, enabled: true },
    });
  }

  @Get("status")
  @ApiOperation({ summary: "Saúde e última ingestão por provedor" })
  async status() {
    const prisma = getPrisma();
    const providers = await prisma.provider.findMany({
      include: {
        healthLogs: { orderBy: { checkedAt: "desc" }, take: 1 },
        batches: { orderBy: { startedAt: "desc" }, take: 1 },
      },
    });
    return providers.map((p) => ({
      key: p.key,
      name: p.name,
      kind: p.kind,
      enabled: p.enabled,
      lastHealth: p.healthLogs[0]
        ? {
            healthy: p.healthLogs[0].healthy,
            latencyMs: p.healthLogs[0].latencyMs,
            checkedAt: p.healthLogs[0].checkedAt.toISOString(),
          }
        : null,
      lastBatch: p.batches[0]
        ? {
            status: p.batches[0].status,
            oddsCount: p.batches[0].oddsCount,
            startedAt: p.batches[0].startedAt.toISOString(),
            finishedAt: p.batches[0].finishedAt?.toISOString() ?? null,
          }
        : null,
    }));
  }
}
