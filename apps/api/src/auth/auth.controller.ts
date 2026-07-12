import {
  Body,
  Controller,
  Get,
  Inject,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";
import { credentialsSchema, refreshSchema, type Credentials, type RefreshInput } from "@rataria/shared";
import { ZodValidationPipe } from "../zod.pipe";
import { AuthService } from "./auth.service";
import { JwtAuthGuard, type AuthedRequest } from "./auth.guards";

@ApiTags("auth")
@Controller("auth")
export class AuthController {
  constructor(@Inject(AuthService) private readonly auth: AuthService) {}

  // Endpoints sensíveis: rate limit apertado contra brute force.
  @Post("register")
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @ApiOperation({ summary: "Cadastro de usuário (papel USER)" })
  register(@Body(new ZodValidationPipe(credentialsSchema)) body: Credentials) {
    return this.auth.register(body.email, body.password);
  }

  @Post("login")
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiOperation({ summary: "Login — retorna access + refresh token" })
  async login(@Body(new ZodValidationPipe(credentialsSchema)) body: Credentials) {
    const { user, tokens } = await this.auth.login(body.email, body.password);
    return { user, ...tokens };
  }

  @Post("refresh")
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @ApiOperation({ summary: "Rotaciona o refresh token e emite novo access" })
  async refresh(@Body(new ZodValidationPipe(refreshSchema)) body: RefreshInput) {
    const { user, tokens } = await this.auth.refresh(body.refreshToken);
    return { user, ...tokens };
  }

  @Post("logout")
  @ApiOperation({ summary: "Revoga o refresh token apresentado" })
  async logout(@Body(new ZodValidationPipe(refreshSchema)) body: RefreshInput) {
    await this.auth.logout(body.refreshToken);
    return { ok: true };
  }
}

@ApiTags("auth")
@Controller("me")
export class MeController {
  constructor(@Inject(AuthService) private readonly auth: AuthService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Usuário autenticado atual" })
  me(@Req() req: AuthedRequest) {
    return this.auth.me(req.user!.sub);
  }
}
