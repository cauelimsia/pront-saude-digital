import Decimal from "decimal.js";

/**
 * Entrada de uma seleção para o cálculo de arbitragem.
 * `odd` é sempre em formato decimal (europeu), > 1.
 */
export interface ArbitrageSelection {
  /** Chave canônica do resultado (ex.: HOME, DRAW, AWAY, OVER, UNDER). */
  selectionKey: string;
  /** Casa de apostas que oferece a melhor odd para este resultado. */
  bookmakerKey: string;
  /** Odd decimal como string para preservar precisão na fronteira. */
  odd: string;
}

export type ArbitrageFailureReason =
  | "NO_ARBITRAGE"
  | "INVALID_ODD"
  | "DUPLICATE_SELECTION"
  | "INCOMPLETE_MARKET"
  | "EMPTY_MARKET";

export interface ArbitrageDetection {
  /** true somente quando inverseSum < 1 e o mercado é válido. */
  hasArbitrage: boolean;
  reason?: ArbitrageFailureReason;
  /** Σ(1/odd_i), com precisão decimal controlada. */
  inverseSum: Decimal;
  /** 1 / inverseSum. */
  payoutMultiplier: Decimal;
  /** (payoutMultiplier - 1) × 100, margem teórica antes do arredondamento. */
  profitPercent: Decimal;
  selections: ReadonlyArray<ArbitrageSelection>;
}

export interface StakePlanOptions {
  /** Banca total a distribuir. */
  totalStake: string;
  /** Incremento mínimo aceito pelas casas (ex.: "0.01", "1"). */
  stakeIncrement?: string;
  /** Stake mínima por seleção (limite operacional). */
  minStakePerLeg?: string;
  /** Stake máxima por seleção (limite operacional). */
  maxStakePerLeg?: string;
  /** Pior lucro mínimo aceitável após arredondamento (em valor absoluto). */
  minWorstProfit?: string;
}

export interface StakeLeg {
  selectionKey: string;
  bookmakerKey: string;
  odd: Decimal;
  /** Fração ideal da banca ((1/odd) / inverseSum). */
  idealRatio: Decimal;
  /** Stake ideal antes do arredondamento. */
  idealStake: Decimal;
  /** Stake final após arredondamento e limites. */
  roundedStake: Decimal;
  /** Retorno bruto se esta seleção vencer (roundedStake × odd). */
  grossReturn: Decimal;
  /** Lucro se esta seleção vencer (grossReturn − totalStaked). */
  profit: Decimal;
}

export type StakePlanViability =
  | "VIABLE"
  | "UNPROFITABLE_AFTER_ROUNDING"
  | "BELOW_MIN_STAKE"
  | "ABOVE_MAX_STAKE"
  | "NO_ARBITRAGE";

export interface StakePlan {
  viable: boolean;
  viability: StakePlanViability;
  legs: StakeLeg[];
  /** Banca solicitada. */
  requestedStake: Decimal;
  /** Soma efetivamente alocada após arredondamento. */
  totalStaked: Decimal;
  /** Valor não alocado (requestedStake − totalStaked). */
  unallocated: Decimal;
  worstProfit: Decimal;
  bestProfit: Decimal;
  worstReturn: Decimal;
  bestReturn: Decimal;
  /** Diferença entre melhor e pior retorno (0 = perfeitamente equilibrado). */
  returnSpread: Decimal;
  /** Margem teórica antes do arredondamento (%). */
  profitPercentBeforeRounding: Decimal;
  /** Pior lucro em % da banca alocada, após arredondamento. */
  profitPercentAfterRounding: Decimal;
}

export interface ConfidenceFactor {
  code: string;
  label: string;
  impact: number;
}

export interface ConfidenceInput {
  /** Idade da odd mais antiga usada, em segundos. */
  maxOddsAgeSeconds: number;
  /** Quantidade de provedores distintos confirmando as odds. */
  providerCount: number;
  /** Quantidade de casas distintas envolvidas. */
  bookmakerCount: number;
  /** Margem teórica (%). Margens irrealistas reduzem a confiança. */
  profitPercent: number;
  /** Segundos até o início do evento (negativo = já começou). */
  secondsToEventStart: number;
  /** Última revalidação recalculou e confirmou a arbitragem? */
  revalidated: boolean;
}

export interface ConfidenceResult {
  score: number;
  classification: "HIGH" | "MODERATE" | "ELEVATED_RISK" | "HIDDEN_BY_DEFAULT";
  positiveFactors: ConfidenceFactor[];
  negativeFactors: ConfidenceFactor[];
  calculatedAt: Date;
  algorithmVersion: string;
}
