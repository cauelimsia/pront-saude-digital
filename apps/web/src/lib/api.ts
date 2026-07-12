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

// ── Auth token store (memória + refresh persistido) ──────────────────────
let accessToken: string | null = null;
const REFRESH_KEY = "rataria.refresh";

export function setAccessToken(token: string | null) {
  accessToken = token;
}
export function getRefreshToken(): string | null {
  return typeof window === "undefined" ? null : localStorage.getItem(REFRESH_KEY);
}
export function setRefreshToken(token: string | null) {
  if (typeof window === "undefined") return;
  if (token) localStorage.setItem(REFRESH_KEY, token);
  else localStorage.removeItem(REFRESH_KEY);
}

/** Erro tipado que carrega o status HTTP. */
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

async function rawRequest<T>(path: string, init?: RequestInit, withAuth = true): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(init?.headers as Record<string, string>),
  };
  if (withAuth && accessToken) headers.Authorization = `Bearer ${accessToken}`;
  const response = await fetch(`${API_URL}${path}`, { ...init, headers, cache: "no-store" });
  if (!response.ok) {
    const body = await response.text().catch(() => "");
    let message = body.slice(0, 300);
    try {
      const parsed = JSON.parse(body);
      message = parsed.message ?? message;
    } catch {
      /* mantém texto bruto */
    }
    throw new ApiError(response.status, message || `API ${response.status} em ${path}`);
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

/** Requisição com refresh transparente em caso de 401 (token expirado). */
async function request<T>(path: string, init?: RequestInit): Promise<T> {
  try {
    return await rawRequest<T>(path, init);
  } catch (e) {
    if (e instanceof ApiError && e.status === 401 && accessToken && getRefreshToken()) {
      const refreshed = await tryRefresh();
      if (refreshed) return rawRequest<T>(path, init);
    }
    throw e;
  }
}

async function tryRefresh(): Promise<boolean> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return false;
  try {
    const result = await rawRequest<AuthResponse>(
      "/auth/refresh",
      { method: "POST", body: JSON.stringify({ refreshToken }) },
      false,
    );
    setAccessToken(result.accessToken);
    setRefreshToken(result.refreshToken);
    return true;
  } catch {
    setAccessToken(null);
    setRefreshToken(null);
    return false;
  }
}

// ── Auth API ──────────────────────────────────────────────────────────────
export type UserRole = "USER" | "ANALYST" | "ADMIN";
export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
}
export interface AuthResponse extends AuthUser {
  user: AuthUser;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export function register(email: string, password: string): Promise<AuthUser> {
  return rawRequest<AuthUser>(
    "/auth/register",
    { method: "POST", body: JSON.stringify({ email, password }) },
    false,
  );
}

export async function login(email: string, password: string): Promise<AuthUser> {
  const res = await rawRequest<AuthResponse>(
    "/auth/login",
    { method: "POST", body: JSON.stringify({ email, password }) },
    false,
  );
  setAccessToken(res.accessToken);
  setRefreshToken(res.refreshToken);
  return res.user;
}

export function me(): Promise<AuthUser> {
  return request<AuthUser>("/me");
}

export async function logout(): Promise<void> {
  const refreshToken = getRefreshToken();
  if (refreshToken) {
    await rawRequest("/auth/logout", {
      method: "POST",
      body: JSON.stringify({ refreshToken }),
    }).catch(() => undefined);
  }
  setAccessToken(null);
  setRefreshToken(null);
}

/** Restaura a sessão a partir do refresh token persistido (boot da app). */
export async function restoreSession(): Promise<AuthUser | null> {
  if (!getRefreshToken()) return null;
  const ok = await tryRefresh();
  if (!ok) return null;
  return me().catch(() => null);
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
