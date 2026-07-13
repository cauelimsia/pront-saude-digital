export type CircuitState = "CLOSED" | "OPEN" | "HALF_OPEN";

export interface CircuitBreakerOptions {
  /** Falhas consecutivas para abrir o circuito. */
  failureThreshold: number;
  /** Tempo (ms) que o circuito fica aberto antes de tentar meia-abertura. */
  resetTimeoutMs: number;
  /** Sucessos em HALF_OPEN para fechar de novo. */
  halfOpenSuccessThreshold: number;
  /** Relógio injetável (testes determinísticos). */
  now?: () => number;
}

/**
 * Circuit breaker: protege o pipeline de um provedor em falha.
 * CLOSED → (falhas ≥ threshold) → OPEN → (após resetTimeout) → HALF_OPEN
 * → (sucessos) → CLOSED  |  (falha) → OPEN.
 */
export class CircuitBreaker {
  private state: CircuitState = "CLOSED";
  private failures = 0;
  private successes = 0;
  private openedAt = 0;
  private readonly now: () => number;

  constructor(private readonly options: CircuitBreakerOptions) {
    this.now = options.now ?? Date.now;
  }

  getState(): CircuitState {
    // Transição preguiçosa OPEN → HALF_OPEN quando o tempo de reset passa.
    if (this.state === "OPEN" && this.now() - this.openedAt >= this.options.resetTimeoutMs) {
      this.state = "HALF_OPEN";
      this.successes = 0;
    }
    return this.state;
  }

  /** Lança se o circuito está aberto (chamada deve ser bloqueada). */
  assertCanRequest(): void {
    if (this.getState() === "OPEN") {
      throw new CircuitOpenError(this.remainingMs());
    }
  }

  recordSuccess(): void {
    if (this.state === "HALF_OPEN") {
      this.successes += 1;
      if (this.successes >= this.options.halfOpenSuccessThreshold) {
        this.close();
      }
    } else {
      this.failures = 0;
    }
  }

  recordFailure(): void {
    if (this.state === "HALF_OPEN") {
      this.open();
      return;
    }
    this.failures += 1;
    if (this.failures >= this.options.failureThreshold) {
      this.open();
    }
  }

  private open(): void {
    this.state = "OPEN";
    this.openedAt = this.now();
    this.failures = 0;
    this.successes = 0;
  }

  private close(): void {
    this.state = "CLOSED";
    this.failures = 0;
    this.successes = 0;
  }

  private remainingMs(): number {
    return Math.max(0, this.options.resetTimeoutMs - (this.now() - this.openedAt));
  }
}

export class CircuitOpenError extends Error {
  constructor(public readonly retryAfterMs: number) {
    super(`Circuit breaker aberto; nova tentativa em ${retryAfterMs}ms`);
    this.name = "CircuitOpenError";
  }
}
