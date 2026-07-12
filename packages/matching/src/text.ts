import type { MatchingConfig } from "./config";

/**
 * Normalização de texto para comparação. NUNCA substitui o valor original —
 * chamadores persistem original + normalizado + versão do normalizador.
 */
export function normalizeText(value: string, config?: Pick<MatchingConfig, "abbreviations">): string {
  let text = value
    .normalize("NFKD")
    // remove diacríticos para comparação (São Paulo → sao paulo)
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    // pontuação controlada vira espaço (mantém dígitos e letras)
    .replace(/[.,;:!?@()[\]{}'"/\\|_–—-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (config?.abbreviations) {
    text = text
      .split(" ")
      .map((token) => config.abbreviations[token] ?? token)
      .join(" ");
  }
  return text;
}

/** Remove sufixos configuráveis do FINAL do nome (Flamengo RJ → flamengo). */
export function stripSuffixes(normalized: string, suffixes: ReadonlyArray<string>): string {
  const tokens = normalized.split(" ");
  while (tokens.length > 1 && suffixes.includes(tokens[tokens.length - 1]!)) {
    tokens.pop();
  }
  return tokens.join(" ");
}

/** Distância de Levenshtein clássica (iterativa, O(n×m)). */
export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;
  let previous = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const current = [i];
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      current[j] = Math.min(current[j - 1]! + 1, previous[j]! + 1, previous[j - 1]! + cost);
    }
    previous = current;
  }
  return previous[b.length]!;
}

/** Similaridade [0,1] baseada em Levenshtein normalizado. */
export function levenshteinSimilarity(a: string, b: string): number {
  if (a.length === 0 && b.length === 0) return 1;
  const distance = levenshtein(a, b);
  return 1 - distance / Math.max(a.length, b.length);
}

/**
 * Similaridade por tokens com suporte a iniciais: "j monteiro" ≈ "joao monteiro".
 * Um token de 1 caractere que coincide com a inicial de um token do outro lado
 * conta como correspondência parcial (0.9) — comum em abreviações de tênis.
 */
export function tokenSimilarity(a: string, b: string): number {
  const tokensA = a.split(" ").filter(Boolean);
  const tokensB = b.split(" ").filter(Boolean);
  if (tokensA.length === 0 || tokensB.length === 0) return 0;

  const used = new Set<number>();
  let total = 0;
  for (const tokenA of tokensA) {
    let best = 0;
    let bestIdx = -1;
    for (let i = 0; i < tokensB.length; i++) {
      if (used.has(i)) continue;
      const tokenB = tokensB[i]!;
      let sim: number;
      if (tokenA === tokenB) {
        sim = 1;
      } else if (tokenA.length === 1 && tokenB.startsWith(tokenA)) {
        sim = 0.9;
      } else if (tokenB.length === 1 && tokenA.startsWith(tokenB)) {
        sim = 0.9;
      } else {
        sim = levenshteinSimilarity(tokenA, tokenB);
      }
      if (sim > best) {
        best = sim;
        bestIdx = i;
      }
    }
    if (bestIdx >= 0 && best >= 0.5) used.add(bestIdx);
    total += best;
  }
  return total / Math.max(tokensA.length, tokensB.length);
}

/** Similaridade de nomes: melhor entre string inteira e por tokens. */
export function nameSimilarity(a: string, b: string): number {
  if (a === b) return 1;
  return Math.max(levenshteinSimilarity(a, b), tokenSimilarity(a, b));
}

const YOUTH_MARKERS = /\b(u\s?1[6-9]|u\s?2[0-3]|sub\s?1[6-9]|sub\s?2[0-3]|junior|juniores|youth|reserves|b)\b/;
const FEMALE_MARKERS = /\b(w|women|feminino|feminina|fem|ladies)\b/;

export interface CategoryMarkers {
  youth: boolean;
  female: boolean;
}

/** Detecta marcadores de categoria (base/feminino) em nome NORMALIZADO. */
export function detectCategoryMarkers(normalized: string): CategoryMarkers {
  return {
    youth: YOUTH_MARKERS.test(normalized),
    female: FEMALE_MARKERS.test(normalized),
  };
}
