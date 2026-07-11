/**
 * Vocabulário canônico de mercados e resultados do domínio.
 * Compartilhado entre worker, API e web — a interface nunca redefine isso.
 */

export const MARKET_TYPES = {
  /** Vencedor com duas possibilidades (tênis, basquete sem empate). */
  MATCH_WINNER_2WAY: "MATCH_WINNER_2WAY",
  /** Resultado 1X2 (futebol, tempo regulamentar). */
  ONE_X_TWO: "ONE_X_TWO",
  /** Totais over/under com linha. */
  TOTALS: "TOTALS",
  /** Ambas as equipes marcam. */
  BTTS: "BTTS",
} as const;

export type MarketType = (typeof MARKET_TYPES)[keyof typeof MARKET_TYPES];

export const OUTCOMES = {
  HOME: "HOME",
  AWAY: "AWAY",
  DRAW: "DRAW",
  OVER: "OVER",
  UNDER: "UNDER",
  YES: "YES",
  NO: "NO",
} as const;

export type OutcomeKey = (typeof OUTCOMES)[keyof typeof OUTCOMES];

/**
 * Conjunto de resultados mutuamente exclusivos e coletivamente exaustivos
 * por tipo de mercado. É a fonte de verdade para "mercado completo".
 */
export const MARKET_OUTCOMES: Record<MarketType, ReadonlyArray<OutcomeKey>> = {
  MATCH_WINNER_2WAY: [OUTCOMES.HOME, OUTCOMES.AWAY],
  ONE_X_TWO: [OUTCOMES.HOME, OUTCOMES.DRAW, OUTCOMES.AWAY],
  TOTALS: [OUTCOMES.OVER, OUTCOMES.UNDER],
  BTTS: [OUTCOMES.YES, OUTCOMES.NO],
};

export const MARKET_PERIODS = {
  FULL_TIME: "FULL_TIME",
  FIRST_HALF: "FIRST_HALF",
} as const;

export type MarketPeriod = (typeof MARKET_PERIODS)[keyof typeof MARKET_PERIODS];

export const OPPORTUNITY_STATUSES = [
  "DETECTED",
  "VALIDATING",
  "ACTIVE",
  "STALE",
  "INVALIDATED",
  "EXPIRED",
  "UNEXECUTABLE",
  "MANUAL_REVIEW",
] as const;

export type OpportunityStatus = (typeof OPPORTUNITY_STATUSES)[number];

/**
 * Transições permitidas da máquina de estados de uma oportunidade.
 */
export const OPPORTUNITY_TRANSITIONS: Record<OpportunityStatus, ReadonlyArray<OpportunityStatus>> =
  {
    DETECTED: ["VALIDATING", "EXPIRED"],
    VALIDATING: ["ACTIVE", "INVALIDATED", "UNEXECUTABLE", "MANUAL_REVIEW"],
    ACTIVE: ["ACTIVE", "STALE", "INVALIDATED", "EXPIRED", "UNEXECUTABLE"],
    STALE: ["ACTIVE", "EXPIRED", "INVALIDATED"],
    INVALIDATED: [],
    EXPIRED: [],
    UNEXECUTABLE: ["ACTIVE", "EXPIRED"],
    MANUAL_REVIEW: ["ACTIVE", "INVALIDATED", "EXPIRED"],
  };

export function canTransition(from: OpportunityStatus, to: OpportunityStatus): boolean {
  return OPPORTUNITY_TRANSITIONS[from].includes(to);
}

/** Canal Redis pub/sub usado para eventos de oportunidade em tempo real. */
export const SUREBET_EVENTS_CHANNEL = "rataria:surebets:events";

export interface SurebetLiveEvent {
  type: "opportunity.activated" | "opportunity.updated" | "opportunity.expired";
  opportunityId: string;
  at: string;
}
