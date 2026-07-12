import { DEFAULT_MATCHING_CONFIG, MATCHING_ALGORITHM_VERSION, type MatchingConfig } from "./config";
import { detectCategoryMarkers, nameSimilarity, stripSuffixes } from "./text";
import type {
  ApprovedAlias,
  CandidateGenerationResult,
  EventMatchFeatures,
  EventMatchResult,
  MatchableCanonicalEvent,
  MatchableProviderEvent,
  MatchReason,
} from "./types";

/**
 * Geração de candidatos (blocking): mesmo esporte + janela de horário.
 * Evita comparar cada evento com toda a base.
 */
export function generateCandidates(
  providerEvent: MatchableProviderEvent,
  canonicalEvents: ReadonlyArray<MatchableCanonicalEvent>,
  config: MatchingConfig = DEFAULT_MATCHING_CONFIG,
): CandidateGenerationResult {
  const candidates = canonicalEvents.filter(
    (candidate) =>
      candidate.sportKey === providerEvent.sportKey &&
      Math.abs(candidate.startsAt.getTime() - providerEvent.startsAt.getTime()) <=
        config.candidateWindowMs,
  );
  return { candidates, evaluated: canonicalEvents.length };
}

interface ParticipantComparison {
  similarity: number;
  aliasMatches: number;
}

/** Similaridade de participante com apoio de aliases aprovados. */
function participantSimilarity(
  a: string,
  b: string,
  aliases: ReadonlyArray<ApprovedAlias>,
  config: MatchingConfig,
): ParticipantComparison {
  const strippedA = stripSuffixes(a, config.strippableSuffixes);
  const strippedB = stripSuffixes(b, config.strippableSuffixes);

  // Alias exato aprovado: participante A é alias registrado do canônico B (ou vice-versa).
  const aliasMatch = aliases.some(
    (alias) =>
      alias.kind === "PARTICIPANT" &&
      ((alias.aliasNormalized === strippedA && alias.canonicalNormalized === strippedB) ||
        (alias.aliasNormalized === strippedB && alias.canonicalNormalized === strippedA)),
  );
  if (aliasMatch) return { similarity: 1, aliasMatches: 1 };

  return {
    similarity: Math.max(nameSimilarity(a, b), nameSimilarity(strippedA, strippedB)),
    aliasMatches: 0,
  };
}

/**
 * Extração de características determinísticas e auditáveis do par
 * (evento do provedor, candidato canônico).
 */
export function extractFeatures(
  providerEvent: MatchableProviderEvent,
  candidate: MatchableCanonicalEvent,
  aliases: ReadonlyArray<ApprovedAlias> = [],
  config: MatchingConfig = DEFAULT_MATCHING_CONFIG,
): EventMatchFeatures {
  const hardConflictReasons: string[] = [];

  const sportCompatible = providerEvent.sportKey === candidate.sportKey;
  if (!sportCompatible) hardConflictReasons.push("SPORT_MISMATCH");

  const timeDiffMs = Math.abs(
    candidate.startsAt.getTime() - providerEvent.startsAt.getTime(),
  );
  if (timeDiffMs > config.candidateWindowMs) {
    hardConflictReasons.push("START_TIME_INCOMPATIBLE");
  }

  // Participantes: direto e cruzado (ordem invertida).
  const homeVsHome = participantSimilarity(
    providerEvent.homeNameNormalized,
    candidate.homeNameNormalized,
    aliases,
    config,
  );
  const awayVsAway = participantSimilarity(
    providerEvent.awayNameNormalized,
    candidate.awayNameNormalized,
    aliases,
    config,
  );
  const homeVsAway = participantSimilarity(
    providerEvent.homeNameNormalized,
    candidate.awayNameNormalized,
    aliases,
    config,
  );
  const awayVsHome = participantSimilarity(
    providerEvent.awayNameNormalized,
    candidate.homeNameNormalized,
    aliases,
    config,
  );

  const participantDirectSimilarity = (homeVsHome.similarity + awayVsAway.similarity) / 2;
  const participantReversedSimilarity = (homeVsAway.similarity + awayVsHome.similarity) / 2;
  const bestOrientation = Math.max(participantDirectSimilarity, participantReversedSimilarity);
  const exactAliasMatches =
    participantDirectSimilarity >= participantReversedSimilarity
      ? homeVsHome.aliasMatches + awayVsAway.aliasMatches
      : homeVsAway.aliasMatches + awayVsHome.aliasMatches;

  if (bestOrientation < config.minParticipantSimilarity) {
    hardConflictReasons.push("PARTICIPANTS_STRUCTURALLY_DIFFERENT");
  }

  // Categoria (base/feminino): marcador presente em um lado e não no outro
  // elimina o par — "São Paulo" nunca une com "São Paulo U20".
  const providerMarkers = detectCategoryMarkers(
    `${providerEvent.homeNameNormalized} ${providerEvent.awayNameNormalized} ${providerEvent.competitionNameNormalized}`,
  );
  const candidateMarkers = detectCategoryMarkers(
    `${candidate.homeNameNormalized} ${candidate.awayNameNormalized} ${candidate.competitionNameNormalized}`,
  );
  const categoryConflict =
    providerMarkers.youth !== candidateMarkers.youth ||
    providerMarkers.female !== candidateMarkers.female;
  if (categoryConflict) hardConflictReasons.push("CATEGORY_CONFLICT");

  // Competição: similaridade + aliases aprovados.
  const competitionAliasMatch = aliases.some(
    (alias) =>
      alias.kind === "COMPETITION" &&
      ((alias.aliasNormalized === providerEvent.competitionNameNormalized &&
        alias.canonicalNormalized === candidate.competitionNameNormalized) ||
        (alias.aliasNormalized === candidate.competitionNameNormalized &&
          alias.canonicalNormalized === providerEvent.competitionNameNormalized)),
  );
  const competitionSimilarity = competitionAliasMatch
    ? 1
    : nameSimilarity(
        providerEvent.competitionNameNormalized,
        candidate.competitionNameNormalized,
      );

  const countryCompatible =
    providerEvent.country && candidate.country
      ? providerEvent.country.toLowerCase() === candidate.country.toLowerCase()
      : null;

  // Competições explicitamente diferentes: similaridade baixa sem alias e
  // sem país compatível — nomes de participantes parecidos NÃO salvam o par.
  if (
    !competitionAliasMatch &&
    competitionSimilarity < config.competitionConflictFloor &&
    countryCompatible !== true
  ) {
    hardConflictReasons.push("COMPETITION_EXPLICITLY_DIFFERENT");
  }

  return {
    sportCompatible,
    competitionSimilarity,
    competitionAliasMatch,
    participantDirectSimilarity,
    participantReversedSimilarity,
    startTimeDifferenceSeconds: Math.round(timeDiffMs / 1000),
    countryCompatible,
    exactAliasMatches,
    categoryConflict,
    hardConflictReasons,
  };
}

/**
 * Score determinístico e explicável. Regras eliminatórias SEMPRE prevalecem
 * sobre o score textual.
 */
export function scoreMatch(
  providerEvent: MatchableProviderEvent,
  candidate: MatchableCanonicalEvent,
  aliases: ReadonlyArray<ApprovedAlias> = [],
  config: MatchingConfig = DEFAULT_MATCHING_CONFIG,
): EventMatchResult {
  const features = extractFeatures(providerEvent, candidate, aliases, config);
  const positive: MatchReason[] = [];
  const negative: MatchReason[] = [];
  const hard: MatchReason[] = features.hardConflictReasons.map((code) => ({
    code,
    label: HARD_CONFLICT_LABELS[code] ?? code,
    impact: -100,
  }));

  const reversed =
    features.participantReversedSimilarity > features.participantDirectSimilarity;
  const orientationSimilarity = reversed
    ? features.participantReversedSimilarity
    : features.participantDirectSimilarity;

  let score = 0;

  // Participantes
  const participantPoints = orientationSimilarity * config.weights.participants;
  score += participantPoints;
  (orientationSimilarity >= 0.8 ? positive : negative).push({
    code: reversed ? "PARTICIPANTS_REVERSED_SIMILARITY" : "PARTICIPANTS_SIMILARITY",
    label: `Similaridade de participantes ${(orientationSimilarity * 100).toFixed(0)}%${reversed ? " (ordem invertida)" : ""}`,
    impact: Math.round(participantPoints),
  });

  // Penalidade explícita por ordem invertida (nunca aceita silenciosamente)
  if (reversed) {
    score -= config.reversedOrderPenalty;
    negative.push({
      code: "REVERSED_ORDER_PENALTY",
      label: "Ordem dos participantes invertida em relação ao candidato",
      impact: -config.reversedOrderPenalty,
    });
  }

  // Competição
  const competitionPoints = features.competitionSimilarity * config.weights.competition;
  score += competitionPoints;
  (features.competitionSimilarity >= 0.7 ? positive : negative).push({
    code: features.competitionAliasMatch ? "COMPETITION_ALIAS" : "COMPETITION_SIMILARITY",
    label: features.competitionAliasMatch
      ? "Competição correspondida por alias aprovado"
      : `Similaridade de competição ${(features.competitionSimilarity * 100).toFixed(0)}%`,
    impact: Math.round(competitionPoints),
  });

  // Horário
  const diffMs = features.startTimeDifferenceSeconds * 1000;
  let timeRatio: number;
  if (diffMs <= config.startTimeAutoToleranceMs) {
    timeRatio = 1;
  } else if (diffMs <= config.startTimeReviewWindowMs) {
    timeRatio =
      1 -
      (diffMs - config.startTimeAutoToleranceMs) /
        (config.startTimeReviewWindowMs - config.startTimeAutoToleranceMs);
  } else {
    timeRatio = 0;
  }
  const timePoints = timeRatio * config.weights.startTime;
  score += timePoints;
  (timeRatio === 1 ? positive : negative).push({
    code: "START_TIME_DIFFERENCE",
    label: `Diferença de horário de ${Math.round(features.startTimeDifferenceSeconds / 60)} min`,
    impact: Math.round(timePoints),
  });

  // País
  if (features.countryCompatible === true) {
    score += config.weights.country;
    positive.push({
      code: "COUNTRY_MATCH",
      label: "País compatível",
      impact: config.weights.country,
    });
  } else if (features.countryCompatible === false) {
    negative.push({ code: "COUNTRY_MISMATCH", label: "País divergente", impact: 0 });
  }

  // Bônus de alias de participante
  if (features.exactAliasMatches > 0) {
    score += config.weights.aliasBonus;
    positive.push({
      code: "PARTICIPANT_ALIAS",
      label: `${features.exactAliasMatches} participante(s) com alias aprovado`,
      impact: config.weights.aliasBonus,
    });
  }

  const bounded = Math.max(0, Math.min(100, Math.round(score)));

  // Decisão
  let decision: EventMatchResult["decision"];
  if (hard.length > 0) {
    decision = "REJECTED";
  } else if (bounded >= config.autoApproveThreshold) {
    decision = "AUTO_APPROVED";
  } else if (bounded >= config.reviewThreshold) {
    decision = "REVIEW_REQUIRED";
  } else {
    decision = "REJECTED";
  }

  // Restrições que rebaixam aprovação automática para revisão:
  if (decision === "AUTO_APPROVED") {
    // 1) diferença de horário acima da tolerância nunca aprova sozinha;
    if (diffMs > config.startTimeAutoToleranceMs) {
      decision = "REVIEW_REQUIRED";
      negative.push({
        code: "TIME_ABOVE_AUTO_TOLERANCE",
        label: "Horário fora da tolerância de aprovação automática",
        impact: 0,
      });
    }
    // 2) ordem invertida em esporte com mando relevante exige revisão
    //    (pode ser o confronto reverso listado com data errada).
    if (reversed && !config.sportsWithIrrelevantOrder.includes(providerEvent.sportKey)) {
      decision = "REVIEW_REQUIRED";
      negative.push({
        code: "REVERSED_ORDER_NEEDS_REVIEW",
        label: "Ordem invertida em esporte com mando de campo — revisão obrigatória",
        impact: 0,
      });
    }
  }

  return {
    candidateEventId: candidate.eventId,
    score: bounded,
    decision,
    algorithmVersion: MATCHING_ALGORITHM_VERSION,
    matchedWithReversedParticipants: reversed,
    positiveReasons: positive,
    negativeReasons: negative,
    hardConflictReasons: hard,
    features,
  };
}

const HARD_CONFLICT_LABELS: Record<string, string> = {
  SPORT_MISMATCH: "Esportes diferentes",
  START_TIME_INCOMPATIBLE: "Datas incompatíveis",
  PARTICIPANTS_STRUCTURALLY_DIFFERENT: "Participantes estruturalmente diferentes",
  CATEGORY_CONFLICT: "Categorias diferentes (base/feminino vs principal)",
  COMPETITION_EXPLICITLY_DIFFERENT: "Competições explicitamente diferentes",
};

/**
 * Avalia todos os candidatos e retorna os resultados ordenados por score
 * (melhor primeiro). Determinístico para as mesmas entradas e versão.
 */
export function matchAgainstCandidates(
  providerEvent: MatchableProviderEvent,
  canonicalEvents: ReadonlyArray<MatchableCanonicalEvent>,
  aliases: ReadonlyArray<ApprovedAlias> = [],
  config: MatchingConfig = DEFAULT_MATCHING_CONFIG,
): { results: EventMatchResult[]; candidatesEvaluated: number } {
  const { candidates } = generateCandidates(providerEvent, canonicalEvents, config);
  const results = candidates
    .map((candidate) => scoreMatch(providerEvent, candidate, aliases, config))
    .sort((a, b) => b.score - a.score || a.candidateEventId.localeCompare(b.candidateEventId));
  return { results, candidatesEvaluated: candidates.length };
}
