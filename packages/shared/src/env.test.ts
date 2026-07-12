import { describe, expect, it } from "vitest";
import { loadEnv } from "./env";

const base = {
  DATABASE_URL: "postgresql://u:p@localhost:5432/db",
  REDIS_URL: "redis://localhost:6379",
};

describe("loadEnv", () => {
  it("aplica defaults seguros", () => {
    const env = loadEnv(base);
    expect(env.ENABLE_UNAUTHENTICATED_MATCH_REVIEW).toBe(false);
    expect(env.NODE_ENV).toBe("development");
    expect(env.API_PORT).toBe(3001);
  });

  it("permite revisão sem auth em desenvolvimento", () => {
    const env = loadEnv({ ...base, ENABLE_UNAUTHENTICATED_MATCH_REVIEW: "true" });
    expect(env.ENABLE_UNAUTHENTICATED_MATCH_REVIEW).toBe(true);
  });

  it("FALHA em produção se a revisão sem autenticação estiver habilitada", () => {
    expect(() =>
      loadEnv({
        ...base,
        NODE_ENV: "production",
        ENABLE_UNAUTHENTICATED_MATCH_REVIEW: "true",
      }),
    ).toThrow(/produção/);
  });

  it("aceita produção com a proteção desabilitada", () => {
    const env = loadEnv({ ...base, NODE_ENV: "production" });
    expect(env.NODE_ENV).toBe("production");
    expect(env.ENABLE_UNAUTHENTICATED_MATCH_REVIEW).toBe(false);
  });

  it("rejeita configuração inválida", () => {
    expect(() => loadEnv({ REDIS_URL: "redis://x" })).toThrow(/inválidas/);
  });
});
