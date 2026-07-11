import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Sse,
} from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { map, type Observable } from "rxjs";
import { ZodValidationPipe } from "../zod.pipe";
import { RedisService } from "../redis.service";
import { SurebetsService } from "./surebets.service";
import {
  listSurebetsQuerySchema,
  simulateBodySchema,
  type ListSurebetsQuery,
  type SimulateBody,
} from "./surebets.schemas";

@ApiTags("surebets")
@Controller("surebets")
export class SurebetsController {
  // @Inject explícito: o runner de dev (tsx/esbuild) não emite
  // emitDecoratorMetadata, então a injeção por tipo não funciona.
  constructor(
    @Inject(SurebetsService) private readonly surebets: SurebetsService,
    @Inject(RedisService) private readonly redis: RedisService,
  ) {}

  @Get()
  @ApiOperation({ summary: "Lista oportunidades com filtros e paginação" })
  list(@Query(new ZodValidationPipe(listSurebetsQuerySchema)) query: ListSurebetsQuery) {
    return this.surebets.list(query);
  }

  @Sse("stream")
  @ApiOperation({ summary: "SSE: eventos de oportunidade em tempo real" })
  stream(): Observable<MessageEvent> {
    return this.redis
      .liveEvents()
      .pipe(map((event) => ({ data: event }) as MessageEvent));
  }

  @Get(":id")
  @ApiOperation({ summary: "Detalhe da oportunidade com pernas e explicações" })
  getById(@Param("id", ParseUUIDPipe) id: string) {
    return this.surebets.getById(id);
  }

  @Post(":id/simulate")
  @ApiOperation({ summary: "Simula distribuição da banca para a oportunidade" })
  simulate(
    @Param("id", ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(simulateBodySchema)) body: SimulateBody,
  ) {
    return this.surebets.simulate(id, body);
  }
}
