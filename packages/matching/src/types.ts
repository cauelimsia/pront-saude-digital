/** Representação neutra de um evento vindo de um provedor (já normalizada). */
export interface MatchableProviderEvent {
  providerKey: string;
  externalId: string;
  sportKey: string;
  homeNameOriginal: string;
  awayNameOriginal: string;
  homeNameNormalized: string;
  awayNameNormalized: string;
  competitionNameOriginal: string;
  competitionNameNormalized: string;
  country: string | null;
  startsAt: Date;
}

/** Representação neutra de um evento canônico candidato. */
export interface MatchableCanonicalEvent {
  eventId: string;
  sportKey: string;
  homeNameNormalized: string;
  awayNameNormalized: string;
  competitionNameNormalized: string;
  country: string | null;
  startsAt: Date;
}

/** Alias aprovado, já em forma normalizada. */
export interface ApprovedAlias {
  kind: "PARTICIPANT" | "COMPETITION";
  aliasNormalized: string;
  canonicalNormalized: string;
}

export interface MatchReason {
  code: string;
  label: string;
  impact: number;
}

export interface EventMatchFeatures {
  sportCompatible: boolean;
  competitionSimilarity: number;
  competitionAliasMatch: boolean;
  participantDirectSimilarity: number;
  participantReversedSimilarity: number;
  startTimeDifferenceSeconds: number;
  countryCompatible: boolean | null;
  exactAliasMatches: number;
  categoryConflict: boolean;
  hardConflictReasons: string[];
}

export type MatchDecisionKind = "AUTO_APPROVED" | "REVIEW_REQUIRED" | "REJECTED";

export interface EventMatchResult {
  candidateEventId: string;
  score: number;
  decision: MatchDecisionKind;
  algorithmVersion: string;
  matchedWithReversedParticipants: boolean;
  positiveReasons: MatchReason[];
  negativeReasons: MatchReason[];
  hardConflictReasons: MatchReason[];
  features: EventMatchFeatures;
}

export interface CandidateGenerationResult {
  candidates: MatchableCanonicalEvent[];
  /** Total de eventos considerados antes do blocking (métrica). */
  evaluated: number;
}
