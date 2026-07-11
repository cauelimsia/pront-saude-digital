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
  return parsed.data;
}
