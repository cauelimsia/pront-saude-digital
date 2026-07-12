# Rataria — Agregação de odds e detecção de surebets

## Produto
Sistema web que agrega odds de provedores autorizados, detecta oportunidades
matemáticas de arbitragem (surebets), calcula distribuição de banca e as exibe
em dashboard com atualização em tempo real. **Nunca realiza apostas
automaticamente. Nunca promete lucro garantido.**

## Arquitetura
Monorepo pnpm workspaces:
- `packages/odds-engine` — motor matemático PURO (só decimal.js; sem Nest/Prisma/Redis/HTTP).
- `packages/matching` — matching de eventos PURO (normalização, score explicável, regras eliminatórias). Sem IO.
- `packages/provider-sdk` — contrato `OddsProvider` + `MockOddsProvider`/`MockOddsProviderBravo` + registry. Sem lógica de arbitragem nem de matching.
- `packages/database` — Prisma + PostgreSQL. Decimal para odds/dinheiro. Migrações + seed determinístico.
- `packages/shared` — vocabulário de mercados, máquina de estados, validação de env (Zod).
- `apps/worker` — BullMQ: ingestão → validação → matching/normalização → snapshots → detecção → revalidação → expiração. Publica eventos no Redis pub/sub.
- `apps/api` — NestJS: REST + SSE (`/surebets/stream`) + `/matching/*` + Swagger em `/docs`. Validação com Zod (não class-validator).
- `apps/web` — Next.js App Router + Tailwind. Todo dado vem da API via `src/lib/api.ts`. Páginas: oportunidades e revisão de matching.

## Comandos oficiais
```
pnpm install            # instala tudo
pnpm db:generate        # cliente Prisma
pnpm db:migrate         # prisma migrate deploy
pnpm db:seed            # seed determinístico (provider + bookmakers)
pnpm build / lint / typecheck / test
pnpm docker:up          # compose: postgres, redis, migrate, api, worker, web
pnpm --filter @rataria/worker dev   # worker local
pnpm --filter @rataria/api dev      # API local (porta 3001)
pnpm --filter @rataria/web dev      # dashboard (porta 3000)
```

## Invariantes do domínio (nunca violar)
- Arbitragem existe somente quando `Σ(1/odd_i) < 1` em mercado COMPLETO
  (todos os resultados de `MARKET_OUTCOMES[type]` presentes) — ver `.claude/rules/surebet-engine.md`.
- Odds/dinheiro: SEMPRE `Decimal` (decimal.js/Prisma.Decimal); nunca float nativo persistido.
- Após arredondar stakes, RECALCULAR todos os cenários; pior lucro decide viabilidade.
- Oportunidade só fica ACTIVE após revalidação; odds mais velhas que `MAX_ODDS_AGE_MS` não publicam.
- Transições de estado só via `canTransition` (shared). EXPIRED/INVALIDATED são terminais.
- `dedupeKey` determinística com unicidade PARCIAL (só estados não-terminais): redetecção atualiza a ativa; após EXPIRED/INVALIDATED começa novo ciclo (ADR-0011).
- Mercados incompatíveis (linhas/períodos diferentes, suspensos) nunca se comparam.
- Odds só se combinam entre eventos com associação de matching APROVADA (auto ou manual). Eventos em PENDING_REVIEW não têm odds persistidas; rejeitados não se combinam.
- Regras eliminatórias do matching prevalecem sobre score textual (ADR-0008). Ordem invertida nunca é silenciosa (ADR-0009).
- Revisão de matching sem auth é proteção TEMPORÁRIA via `ENABLE_UNAUTHENTICATED_MATCH_REVIEW` (falha em produção) — REMOVER-ANTES-DA-FASE-7 (ADR-0012).

## Definição de pronto
Código compila + typecheck + lint + testes relevantes passam + integrado ao
fluxo principal + docs atualizadas. Nada de dados fixos em componente,
endpoints hardcoded, TODOs no lugar de lógica.

## Práticas proibidas
Apostas automáticas; scraping contra ToS; contorno de CAPTCHA/KYC/geo/limites;
credenciais de casas; segredos no Git ou em fixtures; catch vazio; linguagem
"lucro garantido"; `number` para dinheiro persistido; UI recalculando regra de
domínio de forma própria.

## Documentação
- Plano e status: `docs/IMPLEMENTATION_PLAN.md`, `docs/PROJECT_STATUS.md` (atualizar antes de encerrar sessão).
- Decisões: `docs/adr/`.
- Regras detalhadas: `.claude/rules/*.md`.
