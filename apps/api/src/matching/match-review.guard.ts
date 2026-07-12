import { CanActivate, ForbiddenException, Injectable } from "@nestjs/common";
import { loadEnv } from "@rataria/shared";

/**
 * PROTEÇÃO TEMPORÁRIA (Fase 4) — REMOVER-ANTES-DA-FASE-7.
 *
 * As mutações de revisão de matching (approve/reject) ficam DESABILITADAS por
 * padrão. Só são liberadas fora de produção quando
 * ENABLE_UNAUTHENTICATED_MATCH_REVIEW=true. A checagem de produção acontece já
 * em `loadEnv` (falha de inicialização). Isto NÃO substitui autenticação —
 * será trocado por RBAC autenticado (ADR-0012).
 */
@Injectable()
export class MatchReviewGuard implements CanActivate {
  canActivate(): boolean {
    const env = loadEnv();
    if (!env.ENABLE_UNAUTHENTICATED_MATCH_REVIEW) {
      throw new ForbiddenException(
        "Mutações de revisão de matching estão desabilitadas. Defina " +
          "ENABLE_UNAUTHENTICATED_MATCH_REVIEW=true fora de produção (proteção temporária, Fase 4).",
      );
    }
    return true;
  }
}
