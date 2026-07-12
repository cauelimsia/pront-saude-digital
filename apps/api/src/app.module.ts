import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import { HealthController } from "./health.controller";
import { SurebetsController } from "./surebets/surebets.controller";
import { SurebetsService } from "./surebets/surebets.service";
import { CatalogController } from "./catalog.controller";
import { ProvidersController } from "./providers.controller";
import { RedisService } from "./redis.service";
import { MatchingController } from "./matching/matching.controller";
import { MatchingService } from "./matching/matching.service";
import { AuthController, MeController } from "./auth/auth.controller";
import { AuthService } from "./auth/auth.service";
import { JwtAuthGuard, RolesGuard } from "./auth/auth.guards";

@Module({
  imports: [
    // Rate limiting global (10 req/s por IP); endpoints de auth têm limites próprios.
    ThrottlerModule.forRoot([{ ttl: 1000, limit: 10 }]),
  ],
  controllers: [
    HealthController,
    SurebetsController,
    CatalogController,
    ProvidersController,
    MatchingController,
    AuthController,
    MeController,
  ],
  providers: [
    SurebetsService,
    RedisService,
    MatchingService,
    AuthService,
    JwtAuthGuard,
    RolesGuard,
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
