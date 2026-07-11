import { MARKET_PERIODS, MARKET_TYPES, OUTCOMES } from "@rataria/shared";
import type {
  ProviderCompetition,
  ProviderEvent,
  ProviderOddsEntry,
  ProviderSport,
} from "../contract";

/**
 * Fixtures determinísticas do provedor mockado.
 *
 * Conteúdo intencional:
 * - Tênis (2 vias): melhores odds 2.10 (bet-alpha) e 2.05 (bet-bravo)
 *   → inverseSum ≈ 0.9640 → SUREBET de ~3,73%.
 * - Futebol 1X2: melhores odds 2.55/3.30/2.90 → inverseSum ≈ 1.0400
 *   → mercado SEM arbitragem (obrigatório no fluxo vertical).
 * - Futebol totais 2.5: melhores odds 1.92/1.95 → inverseSum ≈ 1.0337
 *   → sem arbitragem.
 *
 * Horários são relativos ao relógio injetado para manter os eventos no futuro.
 */

export const MOCK_PROVIDER_ID = "mock-primary";

export const mockSports: ProviderSport[] = [
  { externalId: "sp-tennis", key: "tennis", name: "Tênis" },
  { externalId: "sp-football", key: "football", name: "Futebol" },
];

export const mockCompetitions: ProviderCompetition[] = [
  {
    externalId: "cp-atp-rio",
    sportExternalId: "sp-tennis",
    key: "atp-rio",
    name: "ATP Rio Open",
    country: "Brasil",
  },
  {
    externalId: "cp-brasileirao",
    sportExternalId: "sp-football",
    key: "brasileirao-serie-a",
    name: "Brasileirão Série A",
    country: "Brasil",
  },
];

export function buildMockEvents(now: Date): ProviderEvent[] {
  const inHours = (h: number) => new Date(now.getTime() + h * 3_600_000);
  return [
    {
      externalId: "ev-atp-rio-final",
      competitionExternalId: "cp-atp-rio",
      homeName: "João Monteiro",
      awayName: "Lucas Álvarez",
      startsAt: inHours(6),
      status: "SCHEDULED",
    },
    {
      externalId: "ev-fla-pal",
      competitionExternalId: "cp-brasileirao",
      homeName: "Flamengo",
      awayName: "Palmeiras",
      startsAt: inHours(8),
      status: "SCHEDULED",
    },
  ];
}

interface OddsSeed {
  eventExternalId: string;
  bookmakerKey: string;
  bookmakerName: string;
  marketType: (typeof MARKET_TYPES)[keyof typeof MARKET_TYPES];
  line: string | null;
  outcomes: Array<{ outcome: (typeof OUTCOMES)[keyof typeof OUTCOMES]; odd: string }>;
}

export const mockOddsSeeds: OddsSeed[] = [
  // ── Tênis: gera a surebet (2.10 @ bet-alpha × 2.05 @ bet-bravo) ──────────
  {
    eventExternalId: "ev-atp-rio-final",
    bookmakerKey: "bet-alpha",
    bookmakerName: "Bet Alpha",
    marketType: MARKET_TYPES.MATCH_WINNER_2WAY,
    line: null,
    outcomes: [
      { outcome: OUTCOMES.HOME, odd: "2.10" },
      { outcome: OUTCOMES.AWAY, odd: "1.75" },
    ],
  },
  {
    eventExternalId: "ev-atp-rio-final",
    bookmakerKey: "bet-bravo",
    bookmakerName: "Bet Bravo",
    marketType: MARKET_TYPES.MATCH_WINNER_2WAY,
    line: null,
    outcomes: [
      { outcome: OUTCOMES.HOME, odd: "1.80" },
      { outcome: OUTCOMES.AWAY, odd: "2.05" },
    ],
  },
  // ── Futebol 1X2: mercado completo SEM arbitragem ─────────────────────────
  {
    eventExternalId: "ev-fla-pal",
    bookmakerKey: "bet-alpha",
    bookmakerName: "Bet Alpha",
    marketType: MARKET_TYPES.ONE_X_TWO,
    line: null,
    outcomes: [
      { outcome: OUTCOMES.HOME, odd: "2.45" },
      { outcome: OUTCOMES.DRAW, odd: "3.30" },
      { outcome: OUTCOMES.AWAY, odd: "2.90" },
    ],
  },
  {
    eventExternalId: "ev-fla-pal",
    bookmakerKey: "bet-bravo",
    bookmakerName: "Bet Bravo",
    marketType: MARKET_TYPES.ONE_X_TWO,
    line: null,
    outcomes: [
      { outcome: OUTCOMES.HOME, odd: "2.55" },
      { outcome: OUTCOMES.DRAW, odd: "3.20" },
      { outcome: OUTCOMES.AWAY, odd: "2.75" },
    ],
  },
  // ── Futebol totais 2.5: sem arbitragem ───────────────────────────────────
  {
    eventExternalId: "ev-fla-pal",
    bookmakerKey: "bet-alpha",
    bookmakerName: "Bet Alpha",
    marketType: MARKET_TYPES.TOTALS,
    line: "2.5",
    outcomes: [
      { outcome: OUTCOMES.OVER, odd: "1.92" },
      { outcome: OUTCOMES.UNDER, odd: "1.88" },
    ],
  },
  {
    eventExternalId: "ev-fla-pal",
    bookmakerKey: "bet-bravo",
    bookmakerName: "Bet Bravo",
    marketType: MARKET_TYPES.TOTALS,
    line: "2.5",
    outcomes: [
      { outcome: OUTCOMES.OVER, odd: "1.85" },
      { outcome: OUTCOMES.UNDER, odd: "1.95" },
    ],
  },
];

export function buildMockOddsEntries(now: Date): ProviderOddsEntry[] {
  return mockOddsSeeds.map((seed) => ({
    eventExternalId: seed.eventExternalId,
    bookmakerKey: seed.bookmakerKey,
    bookmakerName: seed.bookmakerName,
    marketType: seed.marketType,
    period: MARKET_PERIODS.FULL_TIME,
    line: seed.line,
    marketStatus: "OPEN" as const,
    outcomes: seed.outcomes.map((o) => ({ ...o })),
    providerTimestamp: now,
  }));
}
