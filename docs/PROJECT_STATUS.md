# Status do projeto — ponto de retomada

Atualizado: 2026-07-12

## Última tarefa concluída
Fase 4 — matching multi-provedor explicável, verificado de ponta a ponta AO VIVO:
dois provedores mockados (mock-primary + mock-bravo) representam os mesmos
eventos com nomes/horários/ordem diferentes; o sistema associa corretamente,
detecta uma SUREBET MULTI-PROVEDOR (Flamengo×Palmeiras, totais 2.5: OVER 1.92
da Bet Alpha via mock-primary + UNDER 2.10 da Bet Charlie via mock-bravo),
envia o caso ambíguo (Grêmio×Internacional, +3h) para revisão manual, e rejeita
falsos positivos (São Paulo U20 por conflito de categoria; Barcelona La Liga vs
Barcelona SC LigaPro por competição diferente).

## Tarefa atual
Nenhuma em andamento — Fase 4 entregue.

## Próxima tarefa
Fase 7 (autenticação: Argon2id + JWT + refresh rotativo + RBAC), que substitui a
proteção temporária dos endpoints de revisão (ADR-0012, item
REMOVER-ANTES-DA-FASE-7). Ver `docs/IMPLEMENTATION_PLAN.md`.

## Testes (90 passando, 0 falhando)
- odds-engine 36 (unit + property-based; confidence com fator de matching)
- matching 22 (negativos primeiro, positivos, invariantes property-based)
- provider-sdk 10 (contrato dos dois mocks)
- shared 5 (loadEnv: falha em produção com revisão sem auth)
- worker 11 (pipeline single-provider + 7 de matching multi-provedor)
- api 6 (revisão: approve/reject idempotentes, alias, auditoria, conflito)
- Integração exige `DATABASE_URL`/`REDIS_URL`; arquivos que mutam o banco rodam
  sequencialmente (`fileParallelism:false` + `--workspace-concurrency=1`).

## Comandos relevantes
```
pnpm db:migrate && pnpm db:seed
pnpm build && pnpm typecheck && pnpm lint && pnpm test   # todos verdes
# stack local com revisão habilitada (dev):
ENABLE_UNAUTHENTICATED_MATCH_REVIEW=true pnpm --filter @rataria/worker dev
ENABLE_UNAUTHENTICATED_MATCH_REVIEW=true pnpm --filter @rataria/api dev
pnpm --filter @rataria/web dev
```

## Decisões recentes
ADRs 0007 (arquitetura de matching), 0008 (score e regras eliminatórias),
0009 (ordem invertida), 0010 (aliases e persistência de explicações),
0011 (dedupeKey parcial por ciclo de vida — corrige bug EXPIRED→ACTIVE),
0012 (proteção temporária da revisão antes do RBAC).

## Pendências conhecidas
- Autenticação (Fase 7) substitui `ENABLE_UNAUTHENTICATED_MATCH_REVIEW`.
- Adaptador REST demonstrativo com retry/circuit breaker pendente (Fase 3).
- Alertas (Fase 9), retenção de snapshots e observabilidade completa (Fase 10).
- E2E Playwright de matching escrito em `apps/web/e2e/matching.e2e.mjs`; roda
  com a stack no ar (Chromium pré-instalado). `docker compose up` não pôde ser
  executado nesta sessão (sem daemon Docker — ADR-0006); CI usa services.

## Bloqueios reais
Nenhum.
