import type { ConfidenceFactor, ConfidenceInput, ConfidenceResult } from "./types";

export const CONFIDENCE_ALGORITHM_VERSION = "1.0.0";

export interface ConfidenceWeights {
  oddsAgePenaltyPerSecond: number;
  oddsAgeMaxPenalty: number;
  singleProviderPenalty: number;
  unrealisticMarginThreshold: number;
  unrealisticMarginPenalty: number;
  eventStartedPenalty: number;
  eventImminentSeconds: number;
  eventImminentPenalty: number;
  revalidatedBonus: number;
  multiBookmakerBonus: number;
  /** Penalidade por ponto de score de matching abaixo de 100. */
  matchScorePenaltyFactor: number;
  matchScoreMaxPenalty: number;
}

export const DEFAULT_CONFIDENCE_WEIGHTS: ConfidenceWeights = {
  oddsAgePenaltyPerSecond: 0.35,
  oddsAgeMaxPenalty: 45,
  singleProviderPenalty: 10,
  unrealisticMarginThreshold: 8,
  unrealisticMarginPenalty: 15,
  eventStartedPenalty: 30,
  eventImminentSeconds: 300,
  eventImminentPenalty: 10,
  revalidatedBonus: 10,
  multiBookmakerBonus: 5,
  matchScorePenaltyFactor: 0.25,
  matchScoreMaxPenalty: 20,
};

function classify(score: number): ConfidenceResult["classification"] {
  if (score >= 80) return "HIGH";
  if (score >= 60) return "MODERATE";
  if (score >= 40) return "ELEVATED_RISK";
  return "HIDDEN_BY_DEFAULT";
}

/**
 * Confiança OPERACIONAL (qualidade/atualidade dos dados), de 0 a 100.
 * Não representa probabilidade de lucro garantido.
 * Monotônico: odds mais antigas nunca aumentam o score, mantido o resto.
 */
export function calculateConfidence(
  input: ConfidenceInput,
  weights: ConfidenceWeights = DEFAULT_CONFIDENCE_WEIGHTS,
): ConfidenceResult {
  const positive: ConfidenceFactor[] = [];
  const negative: ConfidenceFactor[] = [];
  let score = 90; // base: dados válidos vindos do pipeline

  const agePenalty = Math.min(
    Math.max(input.maxOddsAgeSeconds, 0) * weights.oddsAgePenaltyPerSecond,
    weights.oddsAgeMaxPenalty,
  );
  if (agePenalty > 0) {
    negative.push({
      code: "ODDS_AGE",
      label: `Odd mais antiga com ${Math.round(input.maxOddsAgeSeconds)}s`,
      impact: -agePenalty,
    });
    score -= agePenalty;
  }

  if (input.providerCount <= 1) {
    negative.push({
      code: "SINGLE_PROVIDER",
      label: "Evento confirmado por apenas um provedor",
      impact: -weights.singleProviderPenalty,
    });
    score -= weights.singleProviderPenalty;
  } else {
    positive.push({
      code: "MULTI_PROVIDER",
      label: `${input.providerCount} provedores confirmam o evento`,
      impact: 0,
    });
  }

  if (input.bookmakerCount >= 2) {
    positive.push({
      code: "MULTI_BOOKMAKER",
      label: `${input.bookmakerCount} casas envolvidas`,
      impact: weights.multiBookmakerBonus,
    });
    score += weights.multiBookmakerBonus;
  }

  if (input.profitPercent > weights.unrealisticMarginThreshold) {
    negative.push({
      code: "UNREALISTIC_MARGIN",
      label: `Margem de ${input.profitPercent.toFixed(2)}% acima do usual — possível erro de dado`,
      impact: -weights.unrealisticMarginPenalty,
    });
    score -= weights.unrealisticMarginPenalty;
  }

  if (input.secondsToEventStart <= 0) {
    negative.push({
      code: "EVENT_STARTED",
      label: "Evento já iniciado — mercados podem estar suspensos",
      impact: -weights.eventStartedPenalty,
    });
    score -= weights.eventStartedPenalty;
  } else if (input.secondsToEventStart < weights.eventImminentSeconds) {
    negative.push({
      code: "EVENT_IMMINENT",
      label: "Evento prestes a começar",
      impact: -weights.eventImminentPenalty,
    });
    score -= weights.eventImminentPenalty;
  }

  // Qualidade do matching multi-provedor: associações com score menor que
  // 100 reduzem a confiança operacional (monotônico).
  const minMatchScore = input.minMatchScore ?? 100;
  const matchPenalty = Math.min(
    Math.max(100 - minMatchScore, 0) * weights.matchScorePenaltyFactor,
    weights.matchScoreMaxPenalty,
  );
  if (matchPenalty > 0) {
    negative.push({
      code: "MATCH_QUALITY",
      label: `Menor score de matching entre provedores: ${minMatchScore}/100`,
      impact: -matchPenalty,
    });
    score -= matchPenalty;
  }
  if (input.manualMatch) {
    positive.push({
      code: "MANUAL_MATCH",
      label: "Associação de eventos verificada por revisão humana",
      impact: 0,
    });
  }

  if (input.revalidated) {
    positive.push({
      code: "REVALIDATED",
      label: "Arbitragem recalculada com sucesso na revalidação",
      impact: weights.revalidatedBonus,
    });
    score += weights.revalidatedBonus;
  }

  const bounded = Math.max(0, Math.min(100, Math.round(score)));
  return {
    score: bounded,
    classification: classify(bounded),
    positiveFactors: positive,
    negativeFactors: negative,
    calculatedAt: new Date(),
    algorithmVersion: CONFIDENCE_ALGORITHM_VERSION,
  };
}
