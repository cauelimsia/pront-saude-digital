import { describe, expect, it } from "vitest";
import { loadEnv } from "./env";

const base = {
  DATABASE_URL: "postgresql://u:p@localhost:5432/db",
  REDIS_URL: "redis://localhost:6379",
};

const strongSecret = "a-very-strong-production-secret-key-0123456789";

describe("loadEnv", () => {
  it("aplica defaults seguros em desenvolvimento", () => {
    const env = loadEnv(base);
    expect(env.NODE_ENV).toBe("development");
    expect(env.API_PORT).toBe(3001);
    expect(env.JWT_ACCESS_TTL).toBe("15m");
    expect(env.REFRESH_TTL_DAYS).toBe(7);
    // default dev do JWT_SECRET permitido fora de produção
    expect(env.JWT_SECRET).toContain("dev-only");
  });

  it("FALHA em produção sem JWT_SECRET forte (usando o default dev)", () => {
    expect(() => loadEnv({ ...base, NODE_ENV: "production" })).toThrow(/JWT_SECRET/);
  });

  it("FALHA em produção com JWT_SECRET curto", () => {
    expect(() =>
      loadEnv({ ...base, NODE_ENV: "production", JWT_SECRET: "curto" }),
    ).toThrow(/JWT_SECRET/);
  });

  it("aceita produção com JWT_SECRET forte", () => {
    const env = loadEnv({ ...base, NODE_ENV: "production", JWT_SECRET: strongSecret });
    expect(env.NODE_ENV).toBe("production");
    expect(env.JWT_SECRET).toBe(strongSecret);
  });

  it("rejeita configuração inválida", () => {
    expect(() => loadEnv({ REDIS_URL: "redis://x" })).toThrow(/inválidas/);
  });
});
