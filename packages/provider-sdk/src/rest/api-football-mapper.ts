import { MARKET_PERIODS, MARKET_TYPES, OUTCOMES } from "@rataria/shared";
import type {
  ProviderCompetition,
  ProviderEvent,
  ProviderOddsEntry,
  ProviderSport,
} from "../contract";
import type { RestProviderMapper } from "./rest-provider";

/**
 * Mapeador para a API-Football v3 (api-football.com / api-sports.io).
 *
 * A API entrega odds de VÁRIOS bookmakers por jogo, mas o endpoint `/odds` não
 * traz o nome dos times — por isso cruzamos com `/fixtures`. O mapper faz:
 *   1 requisição a /fixtures?date=… (nomes/horários/status dos jogos)
 *   N requisições a /odds?date=…&page=… (odds por bookmaker)
 * e junta pelo id da fixture.
 *
 * Mercados mapeados: "Match Winner" → 1X2, "Goals Over/Under" → Totais,
 * "Both Teams Score" → BTTS. Outros são ignorados (versão inicial).
 *
 * IMPORTANTE: os caminhos de campo seguem o formato documentado da v3. Rode um
 * smoke-test com a sua chave (ver docs/PROVIDERS.md) para confirmar contra uma
 * resposta real antes de operar.
 */
export interface ApiFootballMapperOptions {
  /** Data (YYYY-MM-DD, UTC) a consultar. Default: hoje. */
  date?: string;
  /** Máx. de páginas de /odds a buscar (cada página ~10 jogos). Default: 3. */
  maxOddsPages?: number;
  /** Esporte fixo (a v3 é de futebol). */
  sportKey?: string;
}

// ── Tipos parciais da resposta v3 (só o que consumimos) ─────────────────────
interface ApiFixtureResponse {
  response?: Array<{
    fixture?: { id?: number; date?: string; status?: { short?: string } };
    league?: { id?: number; name?: string; country?: string; season?: number };
    teams?: { home?: { name?: string }; away?: { name?: string } };
  }>;
}

interface ApiOddsResponse {
  response?: Array<{
    fixture?: { id?: number; date?: string };
    league?: { id?: number; name?: string; country?: string };
    bookmakers?: Array<{
      id?: number;
      name?: string;
      bets?: Array<{ name?: string; values?: Array<{ value?: string; odd?: string }> }>;
    }>;
  }>;
}

function todayUtc(): string {
  return new Date().toISOString().slice(0, 10);
}

function mapStatus(short?: string): ProviderEvent["status"] {
  if (!short) return "SCHEDULED";
  if (["NS", "TBD"].includes(short)) return "SCHEDULED";
  if (["1H", "HT", "2H", "ET", "P", "LIVE", "BT"].includes(short)) return "LIVE";
  if (["FT", "AET", "PEN"].includes(short)) return "FINISHED";
  if (["PST", "CANC", "ABD", "AWD", "WO"].includes(short)) return "CANCELLED";
  if (["SUSP", "INT"].includes(short)) return "SUSPENDED";
  return "SCHEDULED";
}

function slug(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const ODD_PATTERN = /^\d+(\.\d+)?$/;

export function createApiFootballMapper(
  options: ApiFootballMapperOptions = {},
): RestProviderMapper {
  const date = options.date ?? todayUtc();
  const maxPages = Math.max(1, options.maxOddsPages ?? 3);
  const sportKey = options.sportKey ?? "football";

  return {
    healthPath: "/status",
    buildOddsRequests: () => {
      const reqs = [{ path: `/fixtures?date=${date}` }];
      for (let page = 1; page <= maxPages; page++) {
        reqs.push({ path: `/odds?date=${date}&page=${page}` });
      }
      return reqs;
    },
    mapToPayload: (_providerId, rawResponses) => {
      const [fixturesRaw, ...oddsPages] = rawResponses;
      const fixtures = (fixturesRaw as ApiFixtureResponse)?.response ?? [];

      // Índice fixtureId → dados do jogo (nomes/horário/status/competição).
      const eventByFixtureId = new Map<number, ProviderEvent>();
      const competitions = new Map<string, ProviderCompetition>();
      for (const fx of fixtures) {
        const id = fx.fixture?.id;
        const home = fx.teams?.home?.name;
        const away = fx.teams?.away?.name;
        const start = fx.fixture?.date;
        if (!id || !home || !away || !start) continue;
        const leagueName = fx.league?.name ?? "Liga";
        const compKey = slug(`${leagueName}-${fx.league?.season ?? ""}`);
        competitions.set(compKey, {
          externalId: compKey,
          sportExternalId: sportKey,
          key: compKey,
          name: leagueName,
          country: fx.league?.country ?? null,
        });
        eventByFixtureId.set(id, {
          externalId: String(id),
          competitionExternalId: compKey,
          homeName: home,
          awayName: away,
          startsAt: new Date(start),
          status: mapStatus(fx.fixture?.status?.short),
        });
      }

      const odds: ProviderOddsEntry[] = [];
      for (const page of oddsPages) {
        for (const row of (page as ApiOddsResponse)?.response ?? []) {
          const fixtureId = row.fixture?.id;
          if (!fixtureId || !eventByFixtureId.has(fixtureId)) continue;
          const providerTimestamp = row.fixture?.date ? new Date(row.fixture.date) : new Date();
          for (const bookmaker of row.bookmakers ?? []) {
            const bookName = bookmaker.name ?? `book-${bookmaker.id ?? "x"}`;
            const bookKey = slug(bookName);
            for (const bet of bookmaker.bets ?? []) {
              const entry = mapBet(String(fixtureId), bookKey, bookName, bet, providerTimestamp);
              if (entry) odds.push(entry);
            }
          }
        }
      }

      const sports: ProviderSport[] = [
        { externalId: sportKey, key: sportKey, name: "Futebol" },
      ];
      return {
        sports,
        competitions: [...competitions.values()],
        events: [...eventByFixtureId.values()],
        odds,
      };
    },
  };
}

function mapBet(
  eventExternalId: string,
  bookmakerKey: string,
  bookmakerName: string,
  bet: { name?: string; values?: Array<{ value?: string; odd?: string }> },
  providerTimestamp: Date,
): ProviderOddsEntry | null {
  const base = {
    eventExternalId,
    bookmakerKey,
    bookmakerName,
    period: MARKET_PERIODS.FULL_TIME,
    marketStatus: "OPEN" as const,
    providerTimestamp,
  };
  const values = bet.values ?? [];
  const validOdd = (o?: string) => (o && ODD_PATTERN.test(o) ? o : null);

  if (bet.name === "Match Winner") {
    const home = validOdd(values.find((v) => v.value === "Home")?.odd);
    const draw = validOdd(values.find((v) => v.value === "Draw")?.odd);
    const away = validOdd(values.find((v) => v.value === "Away")?.odd);
    if (!home || !draw || !away) return null;
    return {
      ...base,
      marketType: MARKET_TYPES.ONE_X_TWO,
      line: null,
      outcomes: [
        { outcome: OUTCOMES.HOME, odd: home },
        { outcome: OUTCOMES.DRAW, odd: draw },
        { outcome: OUTCOMES.AWAY, odd: away },
      ],
    };
  }

  if (bet.name === "Goals Over/Under") {
    // Agrupa por linha: "Over 2.5" / "Under 2.5".
    const byLine = new Map<string, { over?: string; under?: string }>();
    for (const v of values) {
      const m = /^(Over|Under)\s+([\d.]+)$/.exec(v.value ?? "");
      if (!m) continue;
      const line = m[2]!;
      const slot = byLine.get(line) ?? {};
      if (m[1] === "Over") slot.over = validOdd(v.odd) ?? undefined;
      else slot.under = validOdd(v.odd) ?? undefined;
      byLine.set(line, slot);
    }
    // A linha principal (2.5) é a mais comum; devolvemos a primeira completa.
    for (const [line, slot] of byLine) {
      if (slot.over && slot.under) {
        return {
          ...base,
          marketType: MARKET_TYPES.TOTALS,
          line,
          outcomes: [
            { outcome: OUTCOMES.OVER, odd: slot.over },
            { outcome: OUTCOMES.UNDER, odd: slot.under },
          ],
        };
      }
    }
    return null;
  }

  if (bet.name === "Both Teams Score") {
    const yes = validOdd(values.find((v) => v.value === "Yes")?.odd);
    const no = validOdd(values.find((v) => v.value === "No")?.odd);
    if (!yes || !no) return null;
    return {
      ...base,
      marketType: MARKET_TYPES.BTTS,
      line: null,
      outcomes: [
        { outcome: OUTCOMES.YES, odd: yes },
        { outcome: OUTCOMES.NO, odd: no },
      ],
    };
  }

  return null;
}
