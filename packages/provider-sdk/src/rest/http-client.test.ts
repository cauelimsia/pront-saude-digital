import { describe, expect, it, vi } from "vitest";
import { CircuitBreaker, CircuitOpenError } from "./circuit-breaker";
import { RateLimiter } from "./rate-limiter";
import {
  HttpError,
  ProviderRequestError,
  ResilientHttpClient,
  type FetchLike,
  type HttpResponse,
} from "./http-client";

function jsonResponse(status: number, body: unknown): HttpResponse {
  return {
    status,
    ok: status >= 200 && status < 300,
    json: async () => body,
    text: async () => JSON.stringify(body),
  };
}

const noSleep = async () => {};

function client(fetchImpl: FetchLike, overrides = {}) {
  return new ResilientHttpClient({
    timeoutMs: 1000,
    retry: { maxAttempts: 3, baseDelayMs: 10, maxDelayMs: 100 },
    circuitBreaker: { failureThreshold: 5, resetTimeoutMs: 1000, halfOpenSuccessThreshold: 1 },
    rateLimiter: { capacity: 100, refillPerSecond: 100 },
    fetchImpl,
    sleep: noSleep,
    random: () => 0.5,
    ...overrides,
  });
}

describe("CircuitBreaker", () => {
  it("abre após o limiar de falhas e bloqueia chamadas", () => {
    const cb = new CircuitBreaker({
      failureThreshold: 3,
      resetTimeoutMs: 1000,
      halfOpenSuccessThreshold: 1,
      now: () => 0,
    });
    cb.recordFailure();
    cb.recordFailure();
    expect(cb.getState()).toBe("CLOSED");
    cb.recordFailure();
    expect(cb.getState()).toBe("OPEN");
    expect(() => cb.assertCanRequest()).toThrow(CircuitOpenError);
  });

  it("passa a HALF_OPEN após resetTimeout e fecha no sucesso", () => {
    let t = 0;
    const cb = new CircuitBreaker({
      failureThreshold: 1,
      resetTimeoutMs: 1000,
      halfOpenSuccessThreshold: 2,
      now: () => t,
    });
    cb.recordFailure();
    expect(cb.getState()).toBe("OPEN");
    t = 1000;
    expect(cb.getState()).toBe("HALF_OPEN");
    cb.recordSuccess();
    expect(cb.getState()).toBe("HALF_OPEN"); // precisa de 2
    cb.recordSuccess();
    expect(cb.getState()).toBe("CLOSED");
  });

  it("uma falha em HALF_OPEN reabre o circuito", () => {
    let t = 0;
    const cb = new CircuitBreaker({
      failureThreshold: 1,
      resetTimeoutMs: 500,
      halfOpenSuccessThreshold: 1,
      now: () => t,
    });
    cb.recordFailure();
    t = 500;
    expect(cb.getState()).toBe("HALF_OPEN");
    cb.recordFailure();
    expect(cb.getState()).toBe("OPEN");
  });
});

describe("RateLimiter", () => {
  it("permite rajada até a capacidade e depois exige espera", () => {
    let t = 0;
    const rl = new RateLimiter({ capacity: 2, refillPerSecond: 1, now: () => t });
    expect(rl.msUntilAvailable()).toBe(0);
    expect(rl.consume()).toBe(true);
    expect(rl.consume()).toBe(true);
    expect(rl.consume()).toBe(false); // esgotado
    expect(rl.msUntilAvailable()).toBe(1000); // 1 token/s
    t = 1000;
    expect(rl.msUntilAvailable()).toBe(0);
    expect(rl.consume()).toBe(true);
  });

  it("acquire aguarda via sleeper injetado e consome", async () => {
    let t = 0;
    const rl = new RateLimiter({ capacity: 1, refillPerSecond: 10, now: () => t });
    const sleeps: number[] = [];
    await rl.acquire(async () => {}); // primeiro é imediato
    await rl.acquire(async (ms) => {
      sleeps.push(ms);
      t += ms; // avança o relógio conforme dorme
    });
    expect(sleeps.length).toBeGreaterThan(0);
  });
});

describe("ResilientHttpClient", () => {
  it("retorna dados no primeiro sucesso", async () => {
    const fetchImpl = vi.fn(async () => jsonResponse(200, { ok: true }));
    const c = client(fetchImpl);
    const result = await c.getJson<{ ok: boolean }>("http://x/api");
    expect(result.data.ok).toBe(true);
    expect(result.attempts).toBe(1);
    expect(fetchImpl).toHaveBeenCalledOnce();
  });

  it("retenta em 503 e sucede na segunda tentativa", async () => {
    let call = 0;
    const fetchImpl = vi.fn(async () => {
      call += 1;
      return call === 1 ? jsonResponse(503, {}) : jsonResponse(200, { v: 42 });
    });
    const c = client(fetchImpl);
    const result = await c.getJson<{ v: number }>("http://x/api");
    expect(result.data.v).toBe(42);
    expect(result.attempts).toBe(2);
  });

  it("NÃO retenta em 400 (erro permanente)", async () => {
    const fetchImpl = vi.fn(async () => jsonResponse(400, { error: "bad" }));
    const c = client(fetchImpl);
    await expect(c.getJson("http://x/api")).rejects.toBeInstanceOf(HttpError);
    expect(fetchImpl).toHaveBeenCalledOnce();
  });

  it("esgota tentativas e lança ProviderRequestError em falha persistente", async () => {
    const fetchImpl = vi.fn(async () => jsonResponse(500, {}));
    const c = client(fetchImpl);
    await expect(c.getJson("http://x/api")).rejects.toBeInstanceOf(ProviderRequestError);
    expect(fetchImpl).toHaveBeenCalledTimes(3);
  });

  it("timeout aborta a tentativa e é tratado como falha transitória", async () => {
    // fetch que rejeita quando o signal aborta
    const fetchImpl: FetchLike = (_url, init) =>
      new Promise((_resolve, reject) => {
        init.signal.addEventListener("abort", () => reject(new Error("aborted")));
      });
    const c = client(fetchImpl, {
      timeoutMs: 5,
      sleep: async () => {},
      retry: { maxAttempts: 2, baseDelayMs: 1, maxDelayMs: 5 },
    });
    await expect(c.getJson("http://x/api")).rejects.toBeInstanceOf(ProviderRequestError);
  });

  it("abre o circuito após falhas consecutivas e passa a bloquear rápido", async () => {
    const fetchImpl = vi.fn(async () => jsonResponse(500, {}));
    const c = client(fetchImpl, {
      retry: { maxAttempts: 1, baseDelayMs: 1, maxDelayMs: 1 },
      circuitBreaker: { failureThreshold: 3, resetTimeoutMs: 10000, halfOpenSuccessThreshold: 1 },
    });
    // 3 requisições (1 tentativa cada) → 3 falhas → circuito abre
    for (let i = 0; i < 3; i++) {
      await expect(c.getJson("http://x/api")).rejects.toBeTruthy();
    }
    expect(c.circuitState()).toBe("OPEN");
    // próxima chamada é bloqueada pelo breaker (sem novo fetch)
    const before = fetchImpl.mock.calls.length;
    await expect(c.getJson("http://x/api")).rejects.toBeInstanceOf(CircuitOpenError);
    expect(fetchImpl.mock.calls.length).toBe(before);
  });
});
