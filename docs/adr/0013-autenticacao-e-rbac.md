# ADR-0013 — Autenticação, JWT e RBAC

Data: 2026-07-12 · Status: aceita · Supersede ADR-0012

## Contexto
A revisão de matching precisava sair da proteção temporária (ADR-0012) para um
controle de acesso real antes de qualquer exposição pública.

## Decisão
- **Hashing**: Argon2id via `@node-rs/argon2` (binários pré-compilados, sem
  compilação nativa). Só o hash é persistido; login roda verify em tempo ~
  constante mesmo sem usuário (mitiga enumeração).
- **Access token**: JWT HS256 curto (`JWT_ACCESS_TTL`, default 15m) com `jti`
  único por emissão (distinto e revogável no futuro).
- **Refresh token**: opaco (48 bytes), rotativo; apenas o **hash SHA-256** é
  persistido (`RefreshToken`). Cada rotação revoga o anterior e o encadeia
  (`replacedBy`). **Detecção de reuso**: apresentar um refresh já revogado
  revoga todas as sessões ativas do usuário.
- **RBAC**: papéis USER/ANALYST/ADMIN. `JwtAuthGuard` valida o Bearer e anexa o
  payload; `RolesGuard` + `@Roles(...)` restringe endpoints. As mutações de
  revisão de matching exigem ANALYST/ADMIN, e o ator auditado é o e-mail do
  usuário autenticado (o cliente não escolhe `decidedBy`).
- **Hardening**: Helmet (cabeçalhos de segurança), rate limiting global
  (`@nestjs/throttler`, 10 req/s) com limites apertados em `/auth/*`, CORS
  restritivo (`WEB_ORIGIN`), validação Zod em toda entrada.
- **JWT_SECRET**: default só-dev; `loadEnv` FALHA em produção se ausente/fraco
  (< 32 chars) ou se for o default dev.

## Transporte de token
O access token vai no corpo da resposta (cliente mantém em memória) e o refresh
no `localStorage`, com refresh transparente no 401. Em produção atrás de mesma
origem/reverse proxy, o refresh deve migrar para cookie HttpOnly+Secure+SameSite
— trocável sem alterar o contrato da API.

## Consequências
- `ENABLE_UNAUTHENTICATED_MATCH_REVIEW` e o `MatchReviewGuard` foram REMOVIDOS.
- Cobertura: unit (RolesGuard) + integração (registro/login/rotação/reuso/
  logout) com PostgreSQL real; env test cobre a exigência de segredo em produção.
