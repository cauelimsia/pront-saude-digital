import { describe, expect, it, vi } from "vitest";
import { providerOddsPayloadSchema } from "../contract";
import { createApiFootballMapper } from "./api-football-mapper";
import { RestOddsProvider, defaultHttpOptions } from "./rest-provider";
import type { FetchLike, HttpResponse } from "./http-client";

function json(body: unknown): HttpResponse {
  return { status: 200, ok: true, json: async () => body, text: async () => JSON.stringify(body) };
}

// Fixtures no formato documentado da API-Football v3.
const fixturesResponse = {
  get: "fixtures",
  response: [
    {
      fixture: { id: 721238, date: "2026-07-13T18:00:00+00:00", status: { short: "NS" } },
      league: { id: 61, name: "Ligue 1", country: "France", season: 2026 },
      teams: { home: { name: "Paris Saint Germain" }, away: { name: "Marseille" } },
    },
  ],
};

const oddsResponsePage1 = {
  get: "odds",
  paging: { current: 1, total: 1 },
  response: [
    {
      fixture: { id: 721238, date: "2026-07-13T18:00:00+00:00" },
      league: { id: 61, name: "Ligue 1", country: "France" },
      bookmakers: [
        {
          id: 6,
          name: "Bwin",
          bets: [
            {
              name: "Match Winner",
              values: [
                { value: "Home", odd: "2.35" },
                { value: "Draw", odd: "3.30" },
                { value: "Away", odd: "3.05" },
              ],
            },
            {
              name: "Goals Over/Under",
              values: [
                { value: "Over 2.5", odd: "1.90" },
                { value: "Under 2.5", odd: "1.90" },
              ],
            },
            {
              name: "Both Teams Score",
              values: [
                { value: "Yes", odd: "1.72" },
                { value: "No", odd: "2.05" },
              ],
            },
          ],
        },
        {
          id: 8,
          name: "Bet365",
          bets: [
            {
              name: "Match Winner",
              values: [
                { value: "Home", odd: "2.40" },
                { value: "Draw", odd: "3.25" },
                { value: "Away", odd: "3.00" },
              ],
            },
          ],
        },
      ],
    },
  ],
};

const emptyOdds = { get: "odds", response: [] };

/** fetch falso que responde por caminho (fixtures vs odds pages). */
const fakeFetch: FetchLike = async (url) => {
  if (url.includes("/fixtures")) return json(fixturesResponse);
  if (url.includes("/odds") && url.includes("page=1")) return json(oddsResponsePage1);
  return json(emptyOdds);
};

function provider(fetchImpl: FetchLike = fakeFetch) {
  return new RestOddsProvider({
    providerId: "api-football",
    baseUrl: "https://v3.football.api-sports.io",
    auth: { kind: "header", name: "x-apisports-key", apiKey: "REDACTED" },
    mapper: createApiFootballMapper({ date: "2026-07-13", maxOddsPages: 1 }),
    http: defaultHttpOptions({ fetchImpl, sleep: async () => {}, random: () => 0.5 }),
    clock: () => new Date("2026-07-13T12:00:00.000Z"),
  });
}

describe("createApiFootballMapper", () => {
  it("junta /fixtures + /odds e produz payload válido pelo schema", async () => {
    const payload = await provider().getOdds();
    expect(providerOddsPayloadSchema.safeParse(payload).success).toBe(true);
    expect(payload.events).toHaveLength(1);
    expect(payload.events[0]!.homeName).toBe("Paris Saint Germain");
    expect(payload.events[0]!.awayName).toBe("Marseille");
    expect(payload.events[0]!.status).toBe("SCHEDULED");
  });

  it("mapeia Match Winner (1X2), Over/Under (Totais 2.5) e BTTS", async () => {
    const payload = await provider().getOdds();
    const types = new Set(payload.odds.map((o) => o.marketType));
    expect(types).toContain("ONE_X_TWO");
    expect(types).toContain("TOTALS");
    expect(types).toContain("BTTS");
    const totals = payload.odds.find((o) => o.marketType === "TOTALS")!;
    expect(totals.line).toBe("2.5");
  });

  it("preserva múltiplos bookmakers por jogo (para achar a melhor odd)", async () => {
    const payload = await provider().getOdds();
    const oneXTwo = payload.odds.filter((o) => o.marketType === "ONE_X_TWO");
    const books = new Set(oneXTwo.map((o) => o.bookmakerKey));
    expect(books).toContain("bwin");
    expect(books).toContain("bet365");
  });

  it("envia a chave no header x-apisports-key (nunca no corpo)", async () => {
    const spy = vi.fn<FetchLike>(fakeFetch);
    await provider(spy).getOdds();
    const [, init] = spy.mock.calls[0]!;
    expect(init.headers["x-apisports-key"]).toBe("REDACTED");
    expect(init.body).toBeUndefined();
  });

  it("ignora jogos sem odds e mercados desconhecidos sem quebrar", async () => {
    const onlyFixtures: FetchLike = async (url) =>
      url.includes("/fixtures") ? json(fixturesResponse) : json(emptyOdds);
    const payload = await provider(onlyFixtures).getOdds();
    expect(payload.events).toHaveLength(1);
    expect(payload.odds).toHaveLength(0);
  });
});
