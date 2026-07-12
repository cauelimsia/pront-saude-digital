import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { MATCH_REVIEW_ROLES } from "@rataria/shared";
import { ZodValidationPipe } from "../zod.pipe";
import { MatchingService } from "./matching.service";
import { JwtAuthGuard, Roles, RolesGuard, type AuthedRequest } from "../auth/auth.guards";
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

  // RBAC (Fase 7): apenas ANALYST/ADMIN decidem revisões. O ator é o usuário
  // autenticado — o cliente não escolhe `decidedBy`.
  @Post("reviews/:id/approve")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...MATCH_REVIEW_ROLES)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Aprova a associação (requer ANALYST/ADMIN)" })
  approve(
    @Param("id", ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(reviewDecisionBodySchema)) body: ReviewDecisionBody,
    @Req() req: AuthedRequest,
  ) {
    return this.matching.approveReview(id, { ...body, decidedBy: req.user!.email });
  }

  @Post("reviews/:id/reject")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...MATCH_REVIEW_ROLES)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Rejeita a associação (requer ANALYST/ADMIN)" })
  reject(
    @Param("id", ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(reviewDecisionBodySchema)) body: ReviewDecisionBody,
    @Req() req: AuthedRequest,
  ) {
    return this.matching.rejectReview(id, { ...body, decidedBy: req.user!.email });
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
