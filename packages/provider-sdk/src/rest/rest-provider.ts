import {
  providerOddsPayloadSchema,
  type OddsProvider,
  type OddsQuery,
  type ProviderCompetition,
  type ProviderEvent,
  type ProviderHealth,
  type ProviderOddsPayload,
  type ProviderSport,
} from "../contract";
import { ResilientHttpClient, type ResilientHttpOptions } from "./http-client";

/**
 * Como o adaptador autentica na API do provedor. A CHAVE nunca é hardcoded —
 * vem de `apiKey` (lido de env pelo chamador).
 */
export interface RestAuthConfig {
  /** "header" → header custom; "bearer" → Authorization: Bearer; "query" → ?param=. */
  kind: "header" | "bearer" | "query";
  /** Nome do header (kind=header) ou do parâmetro (kind=query). */
  name?: string;
  /** Valor do segredo (injetado de env). */
  apiKey: string;
}

/**
 * Contrato de mapeamento: transforma a resposta CRUA da API do provedor no
 * payload neutro do Rataria. É a única parte específica de cada provedor —
 * preenchida quando se conhece o formato real da API (ver docs/PROVIDERS.md).
 */
export interface RestProviderMapper {
  /** Endpoint(s) a chamar para obter o snapshot de odds. */
  buildOddsRequests(query: OddsQuery | undefined): Array<{ path: string }>;
  /** Converte as respostas cruas no payload validável. */
  mapToPayload(
    providerId: string,
    rawResponses: unknown[],
    now: Date,
  ): Omit<ProviderOddsPayload, "providerId" | "generatedAt">;
  /** Caminho do health check (ex.: "/status"); default: primeiro odds request. */
  healthPath?: string;
}

export interface RestOddsProviderConfig {
  providerId: string;
  baseUrl: string;
  auth: RestAuthConfig;
  mapper: RestProviderMapper;
  http: ResilientHttpOptions;
  clock?: () => Date;
}

/**
 * Provedor de odds sobre API REST autorizada, com toda a resiliência do
 * `ResilientHttpClient` (timeout, retry+backoff+jitter, circuit breaker, rate
 * limit). Valida o payload mapeado com Zod ANTES de expor — payload inválido
 * do provedor nunca entra no pipeline.
 *
 * NÃO contém lógica de arbitragem nem de matching (só adaptação).
 */
export class RestOddsProvider implements OddsProvider {
  readonly providerId: string;
  private readonly client: ResilientHttpClient;
  private readonly clock: () => Date;

  constructor(private readonly config: RestOddsProviderConfig) {
    this.providerId = config.providerId;
    this.client = new ResilientHttpClient(config.http);
    this.clock = config.clock ?? (() => new Date());
  }

  private headers(): Record<string, string> {
    const base: Record<string, string> = { Accept: "application/json" };
    if (this.config.auth.kind === "bearer") {
      base.Authorization = `Bearer ${this.config.auth.apiKey}`;
    } else if (this.config.auth.kind === "header" && this.config.auth.name) {
      base[this.config.auth.name] = this.config.auth.apiKey;
    }
    return base;
  }

  private url(path: string): string {
    const url = new URL(path, this.config.baseUrl);
    if (this.config.auth.kind === "query" && this.config.auth.name) {
      url.searchParams.set(this.config.auth.name, this.config.auth.apiKey);
    }
    return url.toString();
  }

  async getOdds(query?: OddsQuery): Promise<ProviderOddsPayload> {
    const now = this.clock();
    const requests = this.config.mapper.buildOddsRequests(query);
    const raw: unknown[] = [];
    for (const req of requests) {
      const result = await this.client.getJson<unknown>(this.url(req.path), this.headers());
      raw.push(result.data);
    }
    const mapped = this.config.mapper.mapToPayload(this.providerId, raw, now);
    const payload = { providerId: this.providerId, generatedAt: now, ...mapped };

    // Validação na fronteira: rejeita payload malformado antes do pipeline.
    const parsed = providerOddsPayloadSchema.safeParse(payload);
    if (!parsed.success) {
      throw new Error(
        `Payload do provedor ${this.providerId} inválido após mapeamento: ` +
          parsed.error.issues
            .slice(0, 3)
            .map((i) => `${i.path.join(".")}: ${i.message}`)
            .join("; "),
      );
    }
    return parsed.data;
  }

  async getSports(): Promise<ProviderSport[]> {
    return (await this.getOdds()).sports;
  }

  async getCompetitions(): Promise<ProviderCompetition[]> {
    return (await this.getOdds()).competitions;
  }

  async getEvents(): Promise<ProviderEvent[]> {
    return (await this.getOdds()).events;
  }

  async healthCheck(): Promise<ProviderHealth> {
    const started = Date.now();
    try {
      const path =
        this.config.mapper.healthPath ??
        this.config.mapper.buildOddsRequests(undefined)[0]?.path ??
        "/";
      await this.client.getJson<unknown>(this.url(path), this.headers());
      return {
        providerId: this.providerId,
        healthy: true,
        latencyMs: Date.now() - started,
        checkedAt: this.clock(),
        message: `circuito: ${this.client.circuitState()}`,
      };
    } catch (error) {
      return {
        providerId: this.providerId,
        healthy: false,
        latencyMs: Date.now() - started,
        checkedAt: this.clock(),
        message: error instanceof Error ? error.message : "falha no health check",
      };
    }
  }
}

/** Defaults sensatos de resiliência para provedores REST reais. */
export function defaultHttpOptions(
  overrides: Partial<ResilientHttpOptions> = {},
): ResilientHttpOptions {
  return {
    timeoutMs: 8000,
    retry: { maxAttempts: 3, baseDelayMs: 300, maxDelayMs: 4000 },
    circuitBreaker: { failureThreshold: 5, resetTimeoutMs: 30000, halfOpenSuccessThreshold: 2 },
    rateLimiter: { capacity: 5, refillPerSecond: 5 },
    ...overrides,
  };
}
