import { z } from "zod";

/**
 * Validação de variáveis de ambiente na inicialização.
 * Falha rápido e com mensagem clara — nunca com valores segredos no log.
 */
export const envSchema = z.object({
  DATABASE_URL: z.string().url().or(z.string().startsWith("postgresql://")),
  REDIS_URL: z.string().startsWith("redis://").default("redis://localhost:6379"),
  API_PORT: z.coerce.number().int().positive().default(3001),
  INGESTION_INTERVAL_MS: z.coerce.number().int().min(1000).default(15000),
  /** Idade máxima de uma odd para participar de detecção/revalidação. */
  MAX_ODDS_AGE_MS: z.coerce.number().int().min(1000).default(90000),
  /** TTL de uma oportunidade ativa sem reconfirmação. */
  OPPORTUNITY_TTL_MS: z.coerce.number().int().min(5000).default(120000),
  /** Margem mínima (%) para publicar uma oportunidade. */
  MIN_PROFIT_PERCENT: z.coerce.number().min(0).default(0.1),
  /** Banca de referência usada no plano de stakes persistido. */
  REFERENCE_BANKROLL: z.coerce.number().positive().default(1000),
  /** Ativa variação pseudo-aleatória (determinística por ciclo) no mock. */
  MOCK_VARIABILITY: z
    .enum(["true", "false"])
    .default("false")
    .transform((v) => v === "true"),
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  /**
   * Segredo de assinatura do JWT de acesso. Em produção é OBRIGATÓRIO e deve
   * ter ao menos 32 chars (validado abaixo). Em dev/test usa um default óbvio.
   */
  JWT_SECRET: z.string().default("dev-only-insecure-jwt-secret-change-me-000"),
  /** TTL do access token (curto). Ex.: "15m", "900". */
  JWT_ACCESS_TTL: z.string().default("15m"),
  /** Validade do refresh token, em dias. */
  REFRESH_TTL_DAYS: z.coerce.number().int().min(1).default(7),

  // ── Provedor REST real (opcional) — ex.: API-Football ──────────────────
  /** Chave da API do provedor. SÓ via env; ausente = provedor desativado. */
  REST_PROVIDER_API_KEY: z.string().min(1).optional(),
  REST_PROVIDER_ID: z.string().default("api-football"),
  REST_PROVIDER_NAME: z.string().default("API-Football"),
  REST_PROVIDER_BASE_URL: z.string().url().default("https://v3.football.api-sports.io"),
  REST_PROVIDER_AUTH_NAME: z.string().default("x-apisports-key"),
  /** Data (YYYY-MM-DD) a consultar; vazio = hoje (UTC). */
  REST_PROVIDER_DATE: z.string().optional(),
  REST_PROVIDER_MAX_PAGES: z.coerce.number().int().min(1).max(50).default(3),
});

export type AppEnv = z.infer<typeof envSchema>;

export function loadEnv(source: NodeJS.ProcessEnv = process.env): AppEnv {
  const parsed = envSchema.safeParse(source);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `${i.path.join(".")}: ${i.message}`)
      .join("; ");
    throw new Error(`Variáveis de ambiente inválidas — ${issues}`);
  }
  const env = parsed.data;

  // Em produção, o JWT_SECRET deve ser forte e explícito (nunca o default dev).
  if (env.NODE_ENV === "production") {
    if (env.JWT_SECRET.length < 32 || env.JWT_SECRET.startsWith("dev-only")) {
      throw new Error(
        "JWT_SECRET ausente ou fraco em produção — defina um segredo com ≥ 32 caracteres.",
      );
    }
  }
  return env;
}
