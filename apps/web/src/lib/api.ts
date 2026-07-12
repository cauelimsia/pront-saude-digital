/**
 * Camada de acesso tipada à API. Todo dado exibido no dashboard atravessa
 * este módulo — componentes nunca fabricam dados nem refazem cálculos
 * críticos do domínio.
 */

export const API_URL =
  typeof window === "undefined"
    ? process.env.API_URL ?? "http://localhost:3001"
    : process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export interface SurebetLeg {
  selection: string;
  selectionName: string;
  bookmaker: { key: string; name: string };
  odd: string;
  stakeRatio: string;
  suggestedStake: string;
  grossReturn: string;
  oddsCollectedAt: string;
}

export interface Surebet {
  id: string;
  status: string;
  sport: { key: string; name: string };
  competition: { name: string; country: string | null };
  event: { id: string; home: string; away: string; startsAt: string; status: string };
  market: { type: string; period: string; line: string | null };
  inverseSum: string;
  profitPercent: string;
  profitPercentRounded: string;
  referenceStake: string;
  worstProfit: string;
  bestProfit: string;
  confidenceScore: number;
  providerKeys: string[];
  providerCount: number;
  minMatchScore: number | null;
  manualMatch: boolean;
  oddsAgeSeconds: number;
  detectedAt: string;
  lastValidatedAt: string | null;
  expiresAt: string;
  legs: SurebetLeg[];
  explanation: unknown;
  validations: Array<{ result: string; details: unknown; at: string }>;
}

export interface SurebetList {
  page: number;
  pageSize: number;
  total: number;
  items: Surebet[];
}

export interface SimulationResult {
  opportunityId: string;
  disclaimer: string;
  viable: boolean;
  viability: string;
  requestedStake: string;
  totalStaked: string;
  unallocated: string;
  worstProfit: string;
  bestProfit: string;
  worstReturn: string;
  bestReturn: string;
  profitPercentAfterRounding: string;
  legs: Array<{
    selectionKey: string;
    bookmakerKey: string;
    odd: string;
    idealStake: string;
    roundedStake: string;
    grossReturn: string;
    profitIfWins: string;
  }>;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
    cache: "no-store",
  });
  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`API ${response.status} em ${path}: ${body.slice(0, 200)}`);
  }
  return response.json() as Promise<T>;
}

export function listSurebets(params?: {
  status?: string;
  minProfit?: number;
  page?: number;
}): Promise<SurebetList> {
  const search = new URLSearchParams();
  if (params?.status) search.set("status", params.status);
  if (params?.minProfit !== undefined) search.set("minProfit", String(params.minProfit));
  if (params?.page) search.set("page", String(params.page));
  const qs = search.toString();
  return request<SurebetList>(`/surebets${qs ? `?${qs}` : ""}`);
}

export function getSurebet(id: string): Promise<Surebet> {
  return request<Surebet>(`/surebets/${id}`);
}

export function simulate(
  id: string,
  body: { totalStake: string; stakeIncrement?: string },
): Promise<SimulationResult> {
  return request<SimulationResult>(`/surebets/${id}/simulate`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

// ─────────────────────────── Matching ───────────────────────────

export interface MatchReason {
  code: string;
  label: string;
  impact: number;
}

export interface EventMatchView {
  id: string;
  score: number;
  decision: string;
  algorithmVersion: string;
  reversedParticipants: boolean;
  features: {
    competitionSimilarity: number;
    participantDirectSimilarity: number;
    participantReversedSimilarity: number;
    startTimeDifferenceSeconds: number;
    countryCompatible: boolean | null;
    hardConflictReasons: string[];
  };
  explanation: {
    positiveReasons: MatchReason[];
    negativeReasons: MatchReason[];
    hardConflictReasons: MatchReason[];
  };
  createdAt: string;
  providerEvent: {
    providerKey: string;
    externalId: string;
    home: string | null;
    away: string | null;
    competition: string | null;
    startsAt: string | null;
    status: string;
  };
  candidateEvent: {
    id: string;
    home: string;
    away: string;
    competition: string;
    sport: string;
    country: string | null;
    startsAt: string;
  };
}

export interface MatchReview {
  id: string;
  status: string;
  decidedBy: string | null;
  note: string | null;
  decidedAt: string | null;
  createdAt: string;
  match: EventMatchView;
}

export interface ReviewList {
  page: number;
  pageSize: number;
  total: number;
  items: MatchReview[];
}

export function listReviews(status = "PENDING"): Promise<ReviewList> {
  return request<ReviewList>(`/matching/reviews?status=${status}`);
}

export function decideReview(
  id: string,
  action: "approve" | "reject",
  body: { note?: string; decidedBy?: string } = {},
): Promise<{ status: string; idempotent: boolean }> {
  return request(`/matching/reviews/${id}/${action}`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}
