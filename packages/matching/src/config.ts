/**
 * Configuração centralizada do matching: pesos, tolerâncias e thresholds.
 * Nenhum número mágico fora daqui. Valores iniciais registrados no ADR-0007.
 */

export const MATCHING_ALGORITHM_VERSION = "1.0.0";
export const NORMALIZER_VERSION = "1.0.0";

export interface MatchingConfig {
  /** Janela de blocking: candidatos fora dela nem são considerados. */
  candidateWindowMs: number;
  /** Diferença de horário totalmente tolerada (pontuação máxima de tempo). */
  startTimeAutoToleranceMs: number;
  /** Acima da tolerância e até aqui, o caso nunca é aprovado automaticamente. */
  startTimeReviewWindowMs: number;
  /** Pesos das características (somam 100). */
  weights: {
    participants: number;
    competition: number;
    startTime: number;
    country: number;
    aliasBonus: number;
  };
  /** Score mínimo para aprovação automática. */
  autoApproveThreshold: number;
  /** Score mínimo para revisão manual (abaixo disso: rejeição). */
  reviewThreshold: number;
  /** Similaridade mínima de participantes; abaixo disso é conflito estrutural. */
  minParticipantSimilarity: number;
  /**
   * Similaridade de competição abaixo da qual, SEM alias aprovado e sem
   * compatibilidade de país, o par é eliminado (evita "Barcelona SC × Emelec"
   * unir com "Barcelona × Espanyol").
   */
  competitionConflictFloor: number;
  /** Penalidade aplicada quando a melhor correspondência é com ordem invertida. */
  reversedOrderPenalty: number;
  /** Esportes em que a ordem dos participantes não carrega semântica (mandante). */
  sportsWithIrrelevantOrder: ReadonlyArray<string>;
  /** Sufixos removíveis na normalização de participantes. */
  strippableSuffixes: ReadonlyArray<string>;
  /** Abreviações conhecidas expandidas na normalização. */
  abbreviations: Readonly<Record<string, string>>;
}

export const DEFAULT_MATCHING_CONFIG: MatchingConfig = {
  candidateWindowMs: 48 * 3_600_000,
  startTimeAutoToleranceMs: 30 * 60_000,
  startTimeReviewWindowMs: 6 * 3_600_000,
  weights: {
    participants: 55,
    competition: 20,
    startTime: 15,
    country: 5,
    aliasBonus: 5,
  },
  autoApproveThreshold: 85,
  reviewThreshold: 60,
  minParticipantSimilarity: 0.55,
  competitionConflictFloor: 0.35,
  reversedOrderPenalty: 5,
  sportsWithIrrelevantOrder: ["tennis", "table-tennis", "darts", "snooker"],
  strippableSuffixes: ["fc", "cf", "ec", "afc", "ac", "rj", "sp", "rs", "mg"],
  abbreviations: {
    utd: "united",
    intl: "internacional",
    "atl.": "atletico",
    atl: "atletico",
  },
};
