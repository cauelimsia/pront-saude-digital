import pino from "pino";

export const logger = pino({
  level: process.env.LOG_LEVEL ?? "info",
  base: { service: "worker" },
  // Nunca logar segredos ou URLs com credenciais.
  redact: ["DATABASE_URL", "REDIS_URL", "*.password", "*.token"],
});
