import { Module } from "@nestjs/common";
import { HealthController } from "./health.controller";
import { SurebetsController } from "./surebets/surebets.controller";
import { SurebetsService } from "./surebets/surebets.service";
import { CatalogController } from "./catalog.controller";
import { ProvidersController } from "./providers.controller";
import { RedisService } from "./redis.service";

@Module({
  controllers: [HealthController, SurebetsController, CatalogController, ProvidersController],
  providers: [SurebetsService, RedisService],
})
export class AppModule {}
