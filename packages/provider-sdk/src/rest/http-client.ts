import { CircuitBreaker, CircuitOpenError, type CircuitBreakerOptions } from "./circuit-breaker";
import { RateLimiter, type RateLimiterOptions } from "./rate-limiter";

export interface HttpResponse {
  status: number;
  ok: boolean;
  json<T>(): Promise<T>;
  text(): Promise<string>;
}

/** Abstração mínima de fetch — permite injetar mock nos testes (sem rede). */
export type FetchLike = (
  url: string,
  init: { method: string; headers: Record<string, string>; signal: AbortSignal; body?: string },
) => Promise<HttpResponse>;

export interface RetryOptions {
  /** Máximo de tentativas (inclui a primeira). */
  maxAttempts: number;
  /** Base do backoff exponencial, em ms. */
  baseDelayMs: number;
  /** Teto do backoff, em ms. */
  maxDelayMs: number;
}

export interface ResilientHttpOptions {
  timeoutMs: number;
  retry: RetryOptions;
  circuitBreaker: CircuitBreakerOptions;
  rateLimiter: RateLimiterOptions;
  /** Injeções para testes determinísticos. */
  fetchImpl?: FetchLike;
  sleep?: (ms: number) => Promise<void>;
  random?: () => number;
  now?: () => number;
}

export interface RequestResult<T> {
  data: T;
  status: number;
  latencyMs: number;
  attempts: number;
}

const RETRYABLE_STATUS = new Set([408, 425, 429, 500, 502, 503, 504]);

/**
 * Cliente HTTP resiliente para provedores externos. Combina, nesta ordem:
 * rate limiting (token-bucket) → circuit breaker → timeout por tentativa →
 * retry com backoff exponencial + jitter. Erros transitórios (rede, timeout,
 * 5xx/429) são retentados; 4xx (exceto os retryáveis) falham direto.
 *
 * NUNCA loga credenciais — headers de auth ficam com o chamador.
 */
export class ResilientHttpClient {
  private readonly breaker: CircuitBreaker;
  private readonly limiter: RateLimiter;
  private readonly fetchImpl: FetchLike;
  private readonly sleep: (ms: number) => Promise<void>;
  private readonly random: () => number;

  constructor(private readonly options: ResilientHttpOptions) {
    this.breaker = new CircuitBreaker(options.circuitBreaker);
    this.limiter = new RateLimiter(options.rateLimiter);
    this.fetchImpl = options.fetchImpl ?? defaultFetch;
    this.sleep = options.sleep ?? ((ms) => new Promise((r) => setTimeout(r, ms)));
    this.random = options.random ?? Math.random;
  }

  circuitState() {
    return this.breaker.getState();
  }

  async getJson<T>(
    url: string,
    headers: Record<string, string> = {},
  ): Promise<RequestResult<T>> {
    return this.request<T>("GET", url, headers);
  }

  private async request<T>(
    method: string,
    url: string,
    headers: Record<string, string>,
    body?: string,
  ): Promise<RequestResult<T>> {
    this.breaker.assertCanRequest();
    const start = (this.options.now ?? Date.now)();
    let lastError: unknown;

    for (let attempt = 1; attempt <= this.options.retry.maxAttempts; attempt++) {
      await this.limiter.acquire(this.sleep);
      try {
        const response = await this.withTimeout(method, url, headers, body);
        if (response.ok) {
          this.breaker.recordSuccess();
          const data = (await response.json<T>()) as T;
          return {
            data,
            status: response.status,
            latencyMs: (this.options.now ?? Date.now)() - start,
            attempts: attempt,
          };
        }
        // HTTP não-ok: retryável só para status transitórios.
        if (!RETRYABLE_STATUS.has(response.status)) {
          this.breaker.recordFailure();
          throw new HttpError(response.status, `HTTP ${response.status} em ${url}`);
        }
        lastError = new HttpError(response.status, `HTTP ${response.status} (transitório)`);
        this.breaker.recordFailure();
      } catch (error) {
        if (error instanceof CircuitOpenError || error instanceof HttpError) {
          if (error instanceof HttpError && !RETRYABLE_STATUS.has(error.status)) throw error;
        }
        lastError = error;
        this.breaker.recordFailure();
      }

      // Backoff exponencial com jitter completo, respeitando o teto.
      if (attempt < this.options.retry.maxAttempts) {
        const exp = Math.min(
          this.options.retry.maxDelayMs,
          this.options.retry.baseDelayMs * 2 ** (attempt - 1),
        );
        const jittered = exp * (0.5 + this.random() * 0.5);
        await this.sleep(Math.round(jittered));
      }
    }
    throw new ProviderRequestError(
      `Falha após ${this.options.retry.maxAttempts} tentativas em ${url}`,
      lastError,
    );
  }

  private async withTimeout(
    method: string,
    url: string,
    headers: Record<string, string>,
    body?: string,
  ): Promise<HttpResponse> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.options.timeoutMs);
    try {
      return await this.fetchImpl(url, { method, headers, body, signal: controller.signal });
    } finally {
      clearTimeout(timer);
    }
  }
}

export class HttpError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "HttpError";
  }
}

export class ProviderRequestError extends Error {
  constructor(
    message: string,
    public readonly reason?: unknown,
  ) {
    super(message);
    this.name = "ProviderRequestError";
  }
}

const defaultFetch: FetchLike = async (url, init) => {
  const res = await fetch(url, init);
  return {
    status: res.status,
    ok: res.ok,
    json: <T>() => res.json() as Promise<T>,
    text: () => res.text(),
  };
};
