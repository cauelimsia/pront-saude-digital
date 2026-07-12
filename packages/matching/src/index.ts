export * from "./types";
export {
  DEFAULT_MATCHING_CONFIG,
  MATCHING_ALGORITHM_VERSION,
  NORMALIZER_VERSION,
  type MatchingConfig,
} from "./config";
export {
  normalizeText,
  stripSuffixes,
  levenshtein,
  levenshteinSimilarity,
  tokenSimilarity,
  nameSimilarity,
  detectCategoryMarkers,
} from "./text";
export {
  generateCandidates,
  extractFeatures,
  scoreMatch,
  matchAgainstCandidates,
} from "./match";
