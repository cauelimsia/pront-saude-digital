export interface RateLimiterOptions {
  /** Capacidade máxima de tokens (rajada permitida). */
  capacity: number;
  /** Tokens repostos por segundo. */
  refillPerSecond: number;
  now?: () => number;
}

/**
 * Rate limiter token-bucket. `acquire()` resolve quando há token disponível,
 * aguardando o tempo necessário de reposição — nunca estoura o provedor.
 */
export class RateLimiter {
  private tokens: number;
  private lastRefill: number;
  private readonly now: () => number;

  constructor(private readonly options: RateLimiterOptions) {
    this.now = options.now ?? Date.now;
    this.tokens = options.capacity;
    this.lastRefill = this.now();
  }

  private refill(): void {
    const elapsed = (this.now() - this.lastRefill) / 1000;
    if (elapsed <= 0) return;
    this.tokens = Math.min(
      this.options.capacity,
      this.tokens + elapsed * this.options.refillPerSecond,
    );
    this.lastRefill = this.now();
  }

  /** Milissegundos até haver um token (0 se já disponível). Não consome. */
  msUntilAvailable(): number {
    this.refill();
    if (this.tokens >= 1) return 0;
    const deficit = 1 - this.tokens;
    return Math.ceil((deficit / this.options.refillPerSecond) * 1000);
  }

  /** Consome um token; assume que já há disponibilidade (checar antes). */
  consume(): boolean {
    this.refill();
    if (this.tokens >= 1) {
      this.tokens -= 1;
      return true;
    }
    return false;
  }

  /** Aguarda (via sleeper injetável) até obter um token e o consome. */
  async acquire(sleep: (ms: number) => Promise<void> = defaultSleep): Promise<void> {
    // Loop defensivo: reposição fracionária pode exigir mais de uma espera.
    for (let i = 0; i < 100; i++) {
      const wait = this.msUntilAvailable();
      if (wait === 0 && this.consume()) return;
      await sleep(wait || 1);
    }
    throw new Error("RateLimiter: não foi possível adquirir token");
  }
}

function defaultSleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
