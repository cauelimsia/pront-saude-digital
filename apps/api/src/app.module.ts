import { Module } from "@nestjs/common";
import { HealthController } from "./health.controller";
import { SurebetsController } from "./surebets/surebets.controller";
import { SurebetsService } from "./surebets/surebets.service";
import { CatalogController } from "./catalog.controller";
import { ProvidersController } from "./providers.controller";
import { RedisService } from "./redis.service";
import { MatchingController } from "./matching/matching.controller";
import { MatchingService } from "./matching/matching.service";

@Module({
  controllers: [
    HealthController,
    SurebetsController,
    CatalogController,
    ProvidersController,
    MatchingController,
  ],
  providers: [SurebetsService, RedisService, MatchingService],
})
export class AppModule {}
