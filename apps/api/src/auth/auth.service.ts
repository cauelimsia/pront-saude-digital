import { randomBytes, createHash } from "node:crypto";
import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { hash as argonHash, verify as argonVerify } from "@node-rs/argon2";
import jwt from "jsonwebtoken";
import { getPrisma } from "@rataria/database";
import { loadEnv, type AuthTokens, type AuthUser, type JwtPayload } from "@rataria/shared";

const env = loadEnv();

/** Hash SHA-256 do refresh token — só o hash é persistido. */
function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

@Injectable()
export class AuthService {
  async register(email: string, password: string): Promise<AuthUser> {
    const prisma = getPrisma();
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new ConflictException("E-mail já cadastrado");
    }
    // Argon2id (default do @node-rs/argon2).
    const passwordHash = await argonHash(password);
    const user = await prisma.user.create({
      data: { email, passwordHash, role: "USER" },
    });
    return { id: user.id, email: user.email, role: user.role };
  }

  async login(email: string, password: string): Promise<{ user: AuthUser; tokens: AuthTokens }> {
    const prisma = getPrisma();
    const user = await prisma.user.findUnique({ where: { email } });
    // Verificação em tempo ~constante: sempre roda um verify, mesmo sem usuário.
    const ok = user
      ? await argonVerify(user.passwordHash, password).catch(() => false)
      : await argonVerify(
          "$argon2id$v=19$m=19456,t=2,p=1$c29tZXNhbHR2YWx1ZQ$0000000000000000000000000000000000000000000",
          password,
        ).catch(() => false);
    if (!user || !ok) {
      throw new UnauthorizedException("Credenciais inválidas");
    }
    const authUser: AuthUser = { id: user.id, email: user.email, role: user.role };
    const tokens = await this.issueTokens(authUser);
    return { user: authUser, tokens };
  }

  /** Emite access JWT + refresh token (persistindo apenas o hash). */
  private async issueTokens(user: AuthUser, replacesTokenId?: string): Promise<AuthTokens> {
    const prisma = getPrisma();
    const payload: JwtPayload = { sub: user.id, email: user.email, role: user.role };
    const accessToken = jwt.sign(payload, env.JWT_SECRET, {
      expiresIn: env.JWT_ACCESS_TTL as jwt.SignOptions["expiresIn"],
      // jti único por emissão: cada token é distinto e revogável no futuro.
      jwtid: randomBytes(12).toString("hex"),
    });

    const refreshToken = randomBytes(48).toString("base64url");
    const expiresAt = new Date(Date.now() + env.REFRESH_TTL_DAYS * 86_400_000);
    const created = await prisma.refreshToken.create({
      data: { userId: user.id, tokenHash: hashToken(refreshToken), expiresAt },
    });
    if (replacesTokenId) {
      await prisma.refreshToken.update({
        where: { id: replacesTokenId },
        data: { revokedAt: new Date(), replacedBy: created.id },
      });
    }

    // TTL de acesso em segundos para o cliente agendar o refresh.
    const decoded = jwt.decode(accessToken) as { exp: number; iat: number };
    return { accessToken, refreshToken, expiresIn: decoded.exp - decoded.iat };
  }

  /**
   * Rotação de refresh: valida, revoga o antigo e emite um novo par.
   * Detecção de reuso: token já revogado invalida toda a cadeia do usuário.
   */
  async refresh(rawToken: string): Promise<{ user: AuthUser; tokens: AuthTokens }> {
    const prisma = getPrisma();
    const record = await prisma.refreshToken.findUnique({
      where: { tokenHash: hashToken(rawToken) },
      include: { user: true },
    });
    if (!record || record.expiresAt < new Date()) {
      throw new UnauthorizedException("Refresh token inválido ou expirado");
    }
    if (record.revokedAt) {
      // Reuso de token revogado: revoga todas as sessões ativas do usuário.
      await prisma.refreshToken.updateMany({
        where: { userId: record.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      throw new UnauthorizedException("Refresh token reutilizado — sessões revogadas");
    }
    const user: AuthUser = {
      id: record.user.id,
      email: record.user.email,
      role: record.user.role,
    };
    const tokens = await this.issueTokens(user, record.id);
    return { user, tokens };
  }

  /** Logout: revoga o refresh token apresentado (idempotente). */
  async logout(rawToken: string): Promise<void> {
    const prisma = getPrisma();
    await prisma.refreshToken.updateMany({
      where: { tokenHash: hashToken(rawToken), revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async me(userId: string): Promise<AuthUser> {
    const prisma = getPrisma();
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException("Usuário não encontrado");
    return { id: user.id, email: user.email, role: user.role };
  }

  verifyAccessToken(token: string): JwtPayload {
    try {
      return jwt.verify(token, env.JWT_SECRET) as JwtPayload;
    } catch {
      throw new UnauthorizedException("Token de acesso inválido ou expirado");
    }
  }
}
