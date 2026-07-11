# Status do projeto — ponto de retomada

Atualizado: 2026-07-11

## Última tarefa concluída
Fluxo vertical completo do MVP, verificado de ponta a ponta AO VIVO:
worker ingeriu odds do mock a cada 15 s → snapshots no PostgreSQL → motor
detectou a surebet de tênis (margem 3,7349%, pior lucro R$ 37,34 para banca
de R$ 1.000) → API expôs em `GET /surebets` → dashboard exibiu com SSE
conectado → simulador calculou distribuição para R$ 2.500 (lucro R$ 93,37 em
todos os cenários) → mercados 1X2/totais NÃO geraram oportunidade → expiração
testada.

## Tarefa atual
Nenhuma em andamento — fluxo vertical entregue.

## Próxima tarefa
Fase 7 (autenticação: Argon2id + JWT + refresh rotativo + RBAC) ou Fase 4
(matching probabilístico), conforme prioridade do produto. Ver
`docs/IMPLEMENTATION_PLAN.md`.

## Testes
- Passando (43): odds-engine 34 (unit + property-based), provider-sdk 5,
  worker 4 (integração com PG+Redis reais).
- Falhando: nenhum.
- Integração exige `DATABASE_URL`/`REDIS_URL` (skipIf caso ausentes).

## Comandos relevantes
```
pnpm db:generate && pnpm db:migrate && pnpm db:seed
pnpm --filter @rataria/worker dev | pnpm --filter @rataria/api dev | pnpm --filter @rataria/web dev
pnpm build && pnpm typecheck && pnpm lint && pnpm test   # todos verdes
```

## Decisões recentes
ADRs 0001–0006 (branch dedicada, pnpm sem turbo, estratégia decimal, SSE,
dedupe/máquina de estados, execução sem daemon Docker nesta sessão).

## Pendências conhecidas
- Modelos de auth/alertas/matching ainda não existem no schema (fases 4/7/9).
- Adaptador REST demonstrativo com retry/circuit breaker pendente (Fase 3).
- Retenção/limpeza de snapshots pendente (Fase 10).
- `docker compose up` não pôde ser executado NESTA sessão (sem daemon Docker
  no ambiente remoto — ADR-0006); serviços foram verificados com PG/Redis do
  host e o CI usa services equivalentes.

## Bloqueios reais
Nenhum.
