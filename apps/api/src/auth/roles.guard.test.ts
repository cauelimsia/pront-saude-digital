import { describe, expect, it } from "vitest";
import { Reflector } from "@nestjs/core";
import type { ExecutionContext } from "@nestjs/common";
import type { UserRole } from "@rataria/shared";
import { RolesGuard, ROLES_KEY } from "./auth.guards";

function contextWith(role: UserRole | null, required?: UserRole[]): ExecutionContext {
  const handler = () => undefined;
  if (required) Reflect.defineMetadata(ROLES_KEY, required, handler);
  return {
    getHandler: () => handler,
    getClass: () => class {},
    switchToHttp: () => ({
      getRequest: () => ({ user: role ? { sub: "1", email: "a@b.c", role } : undefined }),
    }),
  } as unknown as ExecutionContext;
}

describe("RolesGuard", () => {
  const guard = new RolesGuard(new Reflector());

  it("libera quando não há papéis exigidos", () => {
    expect(guard.canActivate(contextWith("USER"))).toBe(true);
  });

  it("libera ANALYST e ADMIN quando exigido [ANALYST, ADMIN]", () => {
    expect(guard.canActivate(contextWith("ANALYST", ["ANALYST", "ADMIN"]))).toBe(true);
    expect(guard.canActivate(contextWith("ADMIN", ["ANALYST", "ADMIN"]))).toBe(true);
  });

  it("bloqueia USER quando exigido [ANALYST, ADMIN]", () => {
    expect(() => guard.canActivate(contextWith("USER", ["ANALYST", "ADMIN"]))).toThrow();
  });

  it("bloqueia sem usuário autenticado", () => {
    expect(() => guard.canActivate(contextWith(null, ["ADMIN"]))).toThrow();
  });
});
