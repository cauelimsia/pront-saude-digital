import { Controller, Get, Inject, ServiceUnavailableException } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { getPrisma } from "@rataria/database";
import { RedisService } from "./redis.service";

@ApiTags("health")
@Controller()
export class HealthController {
  constructor(@Inject(RedisService) private readonly redis: RedisService) {}

  @Get("health")
  @ApiOperation({ summary: "Liveness: o processo está de pé" })
  health() {
    return { status: "ok", service: "api", at: new Date().toISOString() };
  }

  @Get("ready")
  @ApiOperation({ summary: "Readiness: PostgreSQL e Redis acessíveis" })
  async ready() {
    const checks: Record<string, boolean> = {};
    try {
      await getPrisma().$queryRaw`SELECT 1`;
      checks.postgres = true;
    } catch {
      checks.postgres = false;
    }
    checks.redis = await this.redis.ping();

    const ready = Object.values(checks).every(Boolean);
    if (!ready) {
      throw new ServiceUnavailableException({ status: "degraded", checks });
    }
    return { status: "ready", checks };
  }
}
