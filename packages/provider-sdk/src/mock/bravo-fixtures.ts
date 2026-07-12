import { MARKET_PERIODS, MARKET_TYPES, OUTCOMES } from "@rataria/shared";
import type {
  ProviderCompetition,
  ProviderEvent,
  ProviderOddsEntry,
  ProviderSport,
} from "../contract";

/**
 * Fixtures do segundo provedor mockado (mock-bravo). Representa OS MESMOS
 * eventos do mock-primary com variações realistas de nomenclatura — e alguns
 * eventos que NÃO devem ser unidos. Casa exclusiva: Bet Charlie.
 *
 * Matriz de cenários (ver docs/IMPLEMENTATION_PLAN.md, Fase 4):
 * - bv-fp-77:   "Flamengo RJ v Palmeiras SP", +5min, alias de competição
 *               → AUTO_APPROVED. Fornece UNDER 2.10 nos totais 2.5 FT que,
 *               com o OVER 1.92 da Bet Alpha (mock-primary), forma a
 *               SUREBET MULTI-PROVEDOR (~0,30%).
 *               Também expõe totais linha 3.0 e totais 2.5 do 1º tempo, que
 *               NUNCA podem combinar com a linha 2.5 / tempo integral.
 * - bv-tn-12:   "L. Alvarez @ J. Monteiro" — abreviações + ORDEM INVERTIDA
 *               (tênis: permitida) → AUTO_APPROVED com remapeamento.
 * - bv-gi-31:   "Gremio v Internacional" com +3h de diferença → REVIEW_REQUIRED.
 * - bv-u20-9:   "Sao Paulo U20 v Corinthians U20" no MESMO horário do jogo
 *               principal, com odds tentadoras → conflito de categoria,
 *               REJECTED (falso positivo bloqueado).
 * - bv-be-44:   "Barcelona v Espanyol" (La Liga) vs "Barcelona SC v Emelec"
 *               (LigaPro) → competições diferentes, REJECTED.
 * - bv-cc-88:   "Cruzeiro v Atletico MG" 9 dias depois → fora da janela,
 *               evento canônico próprio (incompatível por data).
 */

export const BRAVO_PROVIDER_ID = "mock-bravo";

export const bravoSports: ProviderSport[] = [
  { externalId: "sp-b-tennis", key: "tennis", name: "Tênis" },
  { externalId: "sp-b-football", key: "football", name: "Futebol" },
];

export const bravoCompetitions: ProviderCompetition[] = [
  {
    externalId: "cp-b-atp-rio",
    sportExternalId: "sp-b-tennis",
    key: "atp-rio-de-janeiro",
    name: "ATP Rio de Janeiro",
    country: "Brasil",
  },
  {
    externalId: "cp-b-brasileiro",
    sportExternalId: "sp-b-football",
    key: "campeonato-brasileiro",
    name: "Campeonato Brasileiro Série A",
    country: "Brasil",
  },
  {
    externalId: "cp-b-laliga",
    sportExternalId: "sp-b-football",
    key: "la-liga",
    name: "La Liga",
    country: "Espanha",
  },
];

export function buildBravoEvents(now: Date): ProviderEvent[] {
  const at = (hours: number, minutes = 0) =>
    new Date(now.getTime() + hours * 3_600_000 + minutes * 60_000);
  return [
    {
      externalId: "bv-fp-77",
      competitionExternalId: "cp-b-brasileiro",
      homeName: "Flamengo RJ",
      awayName: "Palmeiras SP",
      startsAt: at(8, 5),
      status: "SCHEDULED",
    },
    {
      // representação "visitante @ mandante": ordem invertida vs canônico
      externalId: "bv-tn-12",
      competitionExternalId: "cp-b-atp-rio",
      homeName: "L. Alvarez",
      awayName: "J. Monteiro",
      startsAt: at(6, 10),
      status: "SCHEDULED",
    },
    {
      externalId: "bv-gi-31",
      competitionExternalId: "cp-b-brasileiro",
      homeName: "Gremio",
      awayName: "Internacional",
      startsAt: at(33),
      status: "SCHEDULED",
    },
    {
      externalId: "bv-u20-9",
      competitionExternalId: "cp-b-brasileiro",
      homeName: "Sao Paulo U20",
      awayName: "Corinthians U20",
      startsAt: at(10),
      status: "SCHEDULED",
    },
    {
      externalId: "bv-be-44",
      competitionExternalId: "cp-b-laliga",
      homeName: "Barcelona",
      awayName: "Espanyol",
      startsAt: at(12),
      status: "SCHEDULED",
    },
    {
      externalId: "bv-cc-88",
      competitionExternalId: "cp-b-brasileiro",
      homeName: "Cruzeiro",
      awayName: "Atletico MG",
      startsAt: at(26 + 9 * 24),
      status: "SCHEDULED",
    },
  ];
}

interface BravoSeed {
  eventExternalId: string;
  marketType: (typeof MARKET_TYPES)[keyof typeof MARKET_TYPES];
  period: (typeof MARKET_PERIODS)[keyof typeof MARKET_PERIODS];
  line: string | null;
  outcomes: Array<{ outcome: (typeof OUTCOMES)[keyof typeof OUTCOMES]; odd: string }>;
}

const bravoSeeds: BravoSeed[] = [
  // Fla × Pal — UNDER 2.10 forma a surebet multi-provedor com OVER 1.92 (alpha)
  {
    eventExternalId: "bv-fp-77",
    marketType: MARKET_TYPES.TOTALS,
    period: MARKET_PERIODS.FULL_TIME,
    line: "2.5",
    outcomes: [
      { outcome: OUTCOMES.OVER, odd: "1.78" },
      { outcome: OUTCOMES.UNDER, odd: "2.10" },
    ],
  },
  // Linha diferente (3.0): jamais combinável com a linha 2.5
  {
    eventExternalId: "bv-fp-77",
    marketType: MARKET_TYPES.TOTALS,
    period: MARKET_PERIODS.FULL_TIME,
    line: "3",
    outcomes: [
      { outcome: OUTCOMES.OVER, odd: "2.30" },
      { outcome: OUTCOMES.UNDER, odd: "1.66" },
    ],
  },
  // Período diferente (1º tempo): jamais combinável com tempo integral
  {
    eventExternalId: "bv-fp-77",
    marketType: MARKET_TYPES.TOTALS,
    period: MARKET_PERIODS.FIRST_HALF,
    line: "2.5",
    outcomes: [
      { outcome: OUTCOMES.OVER, odd: "2.90" },
      { outcome: OUTCOMES.UNDER, odd: "1.45" },
    ],
  },
  {
    eventExternalId: "bv-fp-77",
    marketType: MARKET_TYPES.ONE_X_TWO,
    period: MARKET_PERIODS.FULL_TIME,
    line: null,
    outcomes: [
      { outcome: OUTCOMES.HOME, odd: "2.50" },
      { outcome: OUTCOMES.DRAW, odd: "3.10" },
      { outcome: OUTCOMES.AWAY, odd: "2.85" },
    ],
  },
  // Tênis com ordem invertida: HOME aqui é Alvarez (canônico AWAY)
  {
    eventExternalId: "bv-tn-12",
    marketType: MARKET_TYPES.MATCH_WINNER_2WAY,
    period: MARKET_PERIODS.FULL_TIME,
    line: null,
    outcomes: [
      { outcome: OUTCOMES.HOME, odd: "1.95" },
      { outcome: OUTCOMES.AWAY, odd: "2.08" },
    ],
  },
  {
    eventExternalId: "bv-gi-31",
    marketType: MARKET_TYPES.ONE_X_TWO,
    period: MARKET_PERIODS.FULL_TIME,
    line: null,
    outcomes: [
      { outcome: OUTCOMES.HOME, odd: "2.40" },
      { outcome: OUTCOMES.DRAW, odd: "3.20" },
      { outcome: OUTCOMES.AWAY, odd: "2.90" },
    ],
  },
  // Odds tentadoras do U20: se fossem indevidamente unidas ao jogo principal,
  // criariam uma falsa surebet de dois dígitos — o matching DEVE bloquear.
  {
    eventExternalId: "bv-u20-9",
    marketType: MARKET_TYPES.ONE_X_TWO,
    period: MARKET_PERIODS.FULL_TIME,
    line: null,
    outcomes: [
      { outcome: OUTCOMES.HOME, odd: "3.60" },
      { outcome: OUTCOMES.DRAW, odd: "3.60" },
      { outcome: OUTCOMES.AWAY, odd: "2.05" },
    ],
  },
  {
    eventExternalId: "bv-be-44",
    marketType: MARKET_TYPES.ONE_X_TWO,
    period: MARKET_PERIODS.FULL_TIME,
    line: null,
    outcomes: [
      { outcome: OUTCOMES.HOME, odd: "1.85" },
      { outcome: OUTCOMES.DRAW, odd: "3.60" },
      { outcome: OUTCOMES.AWAY, odd: "4.20" },
    ],
  },
  {
    eventExternalId: "bv-cc-88",
    marketType: MARKET_TYPES.ONE_X_TWO,
    period: MARKET_PERIODS.FULL_TIME,
    line: null,
    outcomes: [
      { outcome: OUTCOMES.HOME, odd: "2.20" },
      { outcome: OUTCOMES.DRAW, odd: "3.30" },
      { outcome: OUTCOMES.AWAY, odd: "3.20" },
    ],
  },
];

export function buildBravoOddsEntries(now: Date): ProviderOddsEntry[] {
  return bravoSeeds.map((seed) => ({
    eventExternalId: seed.eventExternalId,
    bookmakerKey: "bet-charlie",
    bookmakerName: "Bet Charlie",
    marketType: seed.marketType,
    period: seed.period,
    line: seed.line,
    marketStatus: "OPEN" as const,
    outcomes: seed.outcomes.map((o) => ({ ...o })),
    providerTimestamp: now,
  }));
}
