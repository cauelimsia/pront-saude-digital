import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { ZodValidationPipe } from "../zod.pipe";
import { MatchingService } from "./matching.service";
import { MatchReviewGuard } from "./match-review.guard";
import {
  listEventMatchesQuerySchema,
  listReviewsQuerySchema,
  reviewDecisionBodySchema,
  type ListEventMatchesQuery,
  type ListReviewsQuery,
  type ReviewDecisionBody,
} from "./matching.schemas";

@ApiTags("matching")
@Controller("matching")
export class MatchingController {
  constructor(@Inject(MatchingService) private readonly matching: MatchingService) {}

  @Get("reviews")
  @ApiOperation({ summary: "Fila de revisão manual de correspondências" })
  listReviews(@Query(new ZodValidationPipe(listReviewsQuerySchema)) query: ListReviewsQuery) {
    return this.matching.listReviews(query);
  }

  @Get("reviews/:id")
  @ApiOperation({ summary: "Detalhe de uma revisão com explicação completa" })
  getReview(@Param("id", ParseUUIDPipe) id: string) {
    return this.matching.getReview(id);
  }

  @Post("reviews/:id/approve")
  @UseGuards(MatchReviewGuard)
  @ApiOperation({ summary: "Aprova a associação (proteção temporária, Fase 4)" })
  approve(
    @Param("id", ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(reviewDecisionBodySchema)) body: ReviewDecisionBody,
  ) {
    return this.matching.approveReview(id, body);
  }

  @Post("reviews/:id/reject")
  @UseGuards(MatchReviewGuard)
  @ApiOperation({ summary: "Rejeita a associação (proteção temporária, Fase 4)" })
  reject(
    @Param("id", ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(reviewDecisionBodySchema)) body: ReviewDecisionBody,
  ) {
    return this.matching.rejectReview(id, body);
  }

  @Get("event-matches")
  @ApiOperation({ summary: "Decisões de matching com filtros" })
  listEventMatches(
    @Query(new ZodValidationPipe(listEventMatchesQuerySchema)) query: ListEventMatchesQuery,
  ) {
    return this.matching.listEventMatches(query);
  }

  @Get("event-matches/:id")
  @ApiOperation({ summary: "Detalhe de uma decisão de matching" })
  getEventMatch(@Param("id", ParseUUIDPipe) id: string) {
    return this.matching.getEventMatch(id);
  }
}
