# Rataria — Agregação de odds e detecção de surebets

## Produto
Sistema web que agrega odds de provedores autorizados, detecta oportunidades
matemáticas de arbitragem (surebets), calcula distribuição de banca e as exibe
em dashboard com atualização em tempo real. **Nunca realiza apostas
automaticamente. Nunca promete lucro garantido.**

## Arquitetura
Monorepo pnpm workspaces:
- `packages/odds-engine` — motor matemático PURO (só decimal.js; sem Nest/Prisma/Redis/HTTP).
- `packages/provider-sdk` — contrato `OddsProvider` + `MockOddsProvider` + registry. Sem lógica de arbitragem.
- `packages/database` — Prisma + PostgreSQL. Decimal para odds/dinheiro. Migrações + seed determinístico.
- `packages/shared` — vocabulário de mercados, máquina de estados, validação de env (Zod).
- `apps/worker` — BullMQ: ingestão → validação → normalização → snapshots → detecção → revalidação → expiração. Publica eventos no Redis pub/sub.
- `apps/api` — NestJS: REST + SSE (`/surebets/stream`) + Swagger em `/docs`. Validação com Zod (não class-validator).
- `apps/web` — Next.js App Router + Tailwind. Todo dado vem da API via `src/lib/api.ts`.

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
- `dedupeKey` determinística: redetecção atualiza, nunca duplica.
- Mercados incompatíveis (linhas/períodos diferentes, suspensos) nunca se comparam.

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
