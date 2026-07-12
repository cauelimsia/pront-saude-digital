import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { disconnectPrisma, getPrisma } from "@rataria/database";
import { AuthService } from "./auth.service";

const hasInfra = Boolean(process.env.DATABASE_URL);

/**
 * Fluxo de autenticação: Argon2id, JWT, rotação de refresh com detecção de
 * reuso, RBAC via verificação de token. Usa PostgreSQL real.
 */
describe.skipIf(!hasInfra)("autenticação (integração)", () => {
  const service = new AuthService();
  const email = `test-${Date.now()}@rataria.dev`;
  const password = "senha-de-teste-123";

  beforeAll(async () => {
    const prisma = getPrisma();
    await prisma.user.deleteMany({ where: { email: { startsWith: "test-" } } });
  });

  afterAll(async () => {
    const prisma = getPrisma();
    await prisma.user.deleteMany({ where: { email: { startsWith: "test-" } } });
    await disconnectPrisma();
  });

  it("registra usuário com senha hasheada (Argon2id) e papel USER", async () => {
    const user = await service.register(email, password);
    expect(user.email).toBe(email);
    expect(user.role).toBe("USER");
    const prisma = getPrisma();
    const row = await prisma.user.findUnique({ where: { email } });
    expect(row!.passwordHash).toMatch(/^\$argon2id\$/);
    expect(row!.passwordHash).not.toContain(password);
  });

  it("recusa cadastro duplicado", async () => {
    await expect(service.register(email, password)).rejects.toThrow();
  });

  it("login com senha correta emite access + refresh; senha errada falha", async () => {
    const { user, tokens } = await service.login(email, password);
    expect(user.email).toBe(email);
    expect(tokens.accessToken.split(".")).toHaveLength(3); // JWT
    expect(tokens.refreshToken.length).toBeGreaterThan(20);
    expect(tokens.expiresIn).toBeGreaterThan(0);

    const payload = service.verifyAccessToken(tokens.accessToken);
    expect(payload.email).toBe(email);
    expect(payload.role).toBe("USER");

    await expect(service.login(email, "senha-errada")).rejects.toThrow();
    await expect(service.login("nao-existe@x.dev", password)).rejects.toThrow();
  });

  it("refresh rotaciona o token e revoga o anterior", async () => {
    const { tokens } = await service.login(email, password);
    const rotated = await service.refresh(tokens.refreshToken);
    expect(rotated.tokens.refreshToken).not.toBe(tokens.refreshToken);
    expect(rotated.tokens.accessToken).not.toBe(tokens.accessToken);

    // o refresh antigo agora está revogado → reuso falha
    await expect(service.refresh(tokens.refreshToken)).rejects.toThrow();
  });

  it("detecção de reuso revoga toda a cadeia de sessões", async () => {
    const { tokens } = await service.login(email, password);
    const rotated = await service.refresh(tokens.refreshToken);
    // reusar o token JÁ revogado dispara revogação em massa
    await expect(service.refresh(tokens.refreshToken)).rejects.toThrow(/reutilizado/);
    // o token rotacionado (válido até então) também foi revogado pela detecção
    await expect(service.refresh(rotated.tokens.refreshToken)).rejects.toThrow();
  });

  it("logout revoga o refresh apresentado (idempotente)", async () => {
    const { tokens } = await service.login(email, password);
    await service.logout(tokens.refreshToken);
    await expect(service.refresh(tokens.refreshToken)).rejects.toThrow();
    await service.logout(tokens.refreshToken); // idempotente, não lança
  });

  it("token de acesso adulterado é rejeitado", () => {
    expect(() => service.verifyAccessToken("nao.e.um.jwt")).toThrow();
  });
});
