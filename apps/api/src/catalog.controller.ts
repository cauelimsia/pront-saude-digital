import { Controller, Get, NotFoundException, Param, ParseUUIDPipe } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { getPrisma } from "@rataria/database";

@ApiTags("catalog")
@Controller()
export class CatalogController {
  @Get("sports")
  @ApiOperation({ summary: "Esportes normalizados" })
  async sports() {
    const prisma = getPrisma();
    return prisma.sport.findMany({ orderBy: { name: "asc" } });
  }

  @Get("events")
  @ApiOperation({ summary: "Eventos futuros com competição e esporte" })
  async events() {
    const prisma = getPrisma();
    const events = await prisma.event.findMany({
      where: { startsAt: { gte: new Date() } },
      include: { competition: { include: { sport: true } } },
      orderBy: { startsAt: "asc" },
      take: 100,
    });
    return events.map((e) => ({
      id: e.id,
      home: e.homeName,
      away: e.awayName,
      startsAt: e.startsAt.toISOString(),
      status: e.status,
      competition: e.competition.name,
      sport: e.competition.sport.name,
    }));
  }

  @Get("events/:id/odds")
  @ApiOperation({ summary: "Últimas odds por mercado/casa do evento" })
  async eventOdds(@Param("id", ParseUUIDPipe) id: string) {
    const prisma = getPrisma();
    const event = await prisma.event.findUnique({
      where: { id },
      include: {
        markets: {
          include: {
            selections: {
              include: {
                snapshots: {
                  orderBy: { collectedAt: "desc" },
                  take: 10,
                  include: { bookmaker: true },
                },
              },
            },
          },
        },
      },
    });
    if (!event) throw new NotFoundException(`Evento ${id} não encontrado`);

    return {
      id: event.id,
      home: event.homeName,
      away: event.awayName,
      startsAt: event.startsAt.toISOString(),
      markets: event.markets.map((m) => ({
        type: m.type,
        period: m.period,
        line: m.line?.toString() ?? null,
        status: m.status,
        selections: m.selections.map((s) => {
          // última odd por casa
          const latest = new Map<string, (typeof s.snapshots)[number]>();
          for (const snap of s.snapshots) {
            if (!latest.has(snap.bookmakerId)) latest.set(snap.bookmakerId, snap);
          }
          return {
            outcome: s.outcome,
            name: s.name,
            odds: [...latest.values()].map((snap) => ({
              bookmaker: snap.bookmaker.name,
              odd: snap.odd.toString(),
              collectedAt: snap.collectedAt.toISOString(),
            })),
          };
        }),
      })),
    };
  }
}
