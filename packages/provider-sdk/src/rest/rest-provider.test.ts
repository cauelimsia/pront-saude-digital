import { describe, expect, it, vi } from "vitest";
import { MARKET_PERIODS, MARKET_TYPES, OUTCOMES } from "@rataria/shared";
import { providerOddsPayloadSchema } from "../contract";
import { RestOddsProvider, defaultHttpOptions, type RestProviderMapper } from "./rest-provider";
import type { FetchLike, HttpResponse } from "./http-client";

function jsonResponse(status: number, body: unknown): HttpResponse {
  return {
    status,
    ok: status >= 200 && status < 300,
    json: async () => body,
    text: async () => JSON.stringify(body),
  };
}

const fixedClock = () => new Date("2026-07-13T12:00:00.000Z");

/**
 * Mapper de exemplo (formato genérico) — prova a costura sem depender de uma
 * API real. O mapper do provedor do usuário substitui só este objeto.
 */
const exampleMapper: RestProviderMapper = {
  buildOddsRequests: () => [{ path: "/v1/odds" }],
  mapToPayload: (_providerId, [raw]) => {
    const data = raw as {
      matches: Array<{
        id: string;
        home: string;
        away: string;
        start: string;
        book: string;
        homeOdd: string;
        awayOdd: string;
      }>;
    };
    return {
      sports: [{ externalId: "t", key: "tennis", name: "Tênis" }],
      competitions: [
        { externalId: "c", sportExternalId: "t", key: "atp", name: "ATP", country: "Brasil" },
      ],
      events: data.matches.map((m) => ({
        externalId: m.id,
        competitionExternalId: "c",
        homeName: m.home,
        awayName: m.away,
        startsAt: new Date(m.start),
        status: "SCHEDULED" as const,
      })),
      odds: data.matches.map((m) => ({
        eventExternalId: m.id,
        bookmakerKey: m.book,
        bookmakerName: m.book,
        marketType: MARKET_TYPES.MATCH_WINNER_2WAY,
        period: MARKET_PERIODS.FULL_TIME,
        line: null,
        marketStatus: "OPEN" as const,
        outcomes: [
          { outcome: OUTCOMES.HOME, odd: m.homeOdd },
          { outcome: OUTCOMES.AWAY, odd: m.awayOdd },
        ],
        providerTimestamp: new Date(m.start),
      })),
    };
  },
};

const rawOk = {
  matches: [
    {
      id: "m1",
      home: "A",
      away: "B",
      start: "2026-07-13T18:00:00.000Z",
      book: "book-x",
      homeOdd: "2.10",
      awayOdd: "1.95",
    },
  ],
};

function provider(fetchImpl: FetchLike, mapper: RestProviderMapper = exampleMapper) {
  return new RestOddsProvider({
    providerId: "rest-demo",
    baseUrl: "https://feed.example.com",
    auth: { kind: "header", name: "X-API-Key", apiKey: "SECRET" },
    mapper,
    http: defaultHttpOptions({ fetchImpl, sleep: async () => {}, random: () => 0.5 }),
    clock: fixedClock,
  });
}

describe("RestOddsProvider", () => {
  it("mapeia a resposta crua e produz payload válido pelo schema", async () => {
    const fetchImpl = vi.fn<FetchLike>(async () => jsonResponse(200, rawOk));
    const payload = await provider(fetchImpl).getOdds();
    expect(providerOddsPayloadSchema.safeParse(payload).success).toBe(true);
    expect(payload.providerId).toBe("rest-demo");
    expect(payload.odds[0]!.bookmakerKey).toBe("book-x");
  });

  it("envia a chave de API no header configurado (nunca no corpo)", async () => {
    const fetchImpl = vi.fn<FetchLike>(async () => jsonResponse(200, rawOk));
    await provider(fetchImpl).getOdds();
    const [, init] = fetchImpl.mock.calls[0]!;
    expect(init.headers["X-API-Key"]).toBe("SECRET");
    expect(init.body).toBeUndefined();
  });

  it("rejeita payload malformado após o mapeamento (validação de fronteira)", async () => {
    const badMapper: RestProviderMapper = {
      buildOddsRequests: () => [{ path: "/v1/odds" }],
      mapToPayload: () => ({
        sports: [],
        competitions: [],
        events: [],
        // odd inválida (<= 1 é filtrada só no motor, mas formato quebrado aqui):
        odds: [{ eventExternalId: "" } as never],
      }),
    };
    const fetchImpl = vi.fn<FetchLike>(async () => jsonResponse(200, rawOk));
    await expect(provider(fetchImpl, badMapper).getOdds()).rejects.toThrow(/inválido/);
  });

  it("healthCheck retorna healthy quando a API responde", async () => {
    const fetchImpl = vi.fn<FetchLike>(async () => jsonResponse(200, rawOk));
    const health = await provider(fetchImpl).healthCheck();
    expect(health.healthy).toBe(true);
    expect(health.providerId).toBe("rest-demo");
  });

  it("healthCheck retorna unhealthy quando a API falha persistentemente", async () => {
    const fetchImpl = vi.fn<FetchLike>(async () => jsonResponse(500, {}));
    const health = await provider(fetchImpl).healthCheck();
    expect(health.healthy).toBe(false);
  });
});
