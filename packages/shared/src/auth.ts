import { z } from "zod";

export const USER_ROLES = ["USER", "ANALYST", "ADMIN"] as const;
export type UserRole = (typeof USER_ROLES)[number];

/** Papéis autorizados a decidir revisões de matching. */
export const MATCH_REVIEW_ROLES: ReadonlyArray<UserRole> = ["ANALYST", "ADMIN"];

export const credentialsSchema = z.object({
  email: z.string().email().max(160).transform((v) => v.toLowerCase()),
  password: z.string().min(8, "senha deve ter ao menos 8 caracteres").max(200),
});
export type Credentials = z.infer<typeof credentialsSchema>;

export const refreshSchema = z.object({
  refreshToken: z.string().min(20),
});
export type RefreshInput = z.infer<typeof refreshSchema>;

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
}

export interface JwtPayload {
  sub: string;
  email: string;
  role: UserRole;
}
