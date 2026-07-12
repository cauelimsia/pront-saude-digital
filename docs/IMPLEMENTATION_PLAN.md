# Plano de implementação — Rataria

## Estado atual (2026-07-11)
Fluxo vertical do MVP implementado e verificado de ponta a ponta:
mock → ingestão → validação → normalização → snapshots → detecção →
revalidação → persistência → API → dashboard com SSE.

## Arquitetura
Monorepo pnpm. Motor matemático puro (`odds-engine`), adaptadores de
provedores (`provider-sdk`), Prisma/PostgreSQL (`database`), worker BullMQ,
API NestJS, dashboard Next.js. Tempo real: Redis pub/sub → SSE.
Decisões registradas em `docs/adr/`.

## Riscos
- Fase 4 (matching multi-provedor) é a de maior complexidade algorítmica; o
  vínculo atual é por externalId (1 provedor), correto porém não generaliza.
- Retenção de snapshots sem limpeza pode crescer; política de retenção
  pendente (Fase 10).
- Autenticação ainda não existe — API não deve ser exposta publicamente antes
  da Fase 7.

## Fases

### Fase 0 — Descoberta e preparação ✅
- [x] Inspeção do repositório (app anterior preservado em branch própria — ADR-0001)
- [x] CLAUDE.md + .claude/rules + .claude/agents
- [x] Plano, status e ADRs iniciais

### Fase 1 — Fundação do monorepo ✅
- [x] pnpm workspaces, tsconfig base, ESLint 9, Prettier
- [x] Docker Compose (postgres, redis, migrate, api, worker, web) com healthchecks
- [x] CI GitHub Actions (install → lint → migrate → seed → build → typecheck → test → scan de segredos)
- Evidência: `pnpm install/build/typecheck/lint` verdes localmente.

### Fase 2 — Banco e domínio ✅ (escopo do fluxo vertical)
- [x] Schema Prisma com Decimal, enums, uniques de dedupe, índices
- [x] Migração reproduzível em banco vazio + seed determinístico idempotente
- [x] Máquina de estados de oportunidade (`canTransition` em shared)
- [x] Modelos de matching (F4): ProviderEventLink, EventMatch, EventMatchReview,
      NameAlias, AuditLog
- [ ] Modelos das fases futuras: User/Session/RefreshToken (F7),
      AlertRule/AlertDelivery (F9), BookmakerLimit, SystemSetting (F10)

### Fase 3 — Provedor mockado e ingestão ✅
- [x] Contrato `OddsProvider` + schemas Zod de payload
- [x] `MockOddsProvider` determinístico (+ variabilidade opcional reprodutível por ciclo)
- [x] Ingestão idempotente (batch unique por ciclo; snapshots com skipDuplicates)
- [x] Health log de provedor por ciclo
- [ ] Adaptador REST genérico demonstrativo com timeout/retry/circuit breaker
- Evidência: teste de integração `pipeline.integration.test.ts` (4/4).

### Fase 4 — Matching multi-provedor ✅
- [x] Núcleo puro `packages/matching`: normalização, blocking, features, regras
      eliminatórias, score determinístico versionado (22 testes, incl. property-based)
- [x] Segundo provedor `MockOddsProviderBravo` com variações realistas (nomes,
      abreviações, acentos, horário, ordem invertida, competição) + testes de contrato
- [x] Persistência: `ProviderEventLink` (estados + eventId nullable), `EventMatch`,
      `EventMatchReview`, `NameAlias`, `AuditLog`; migração reproduzível
- [x] Worker: matching na ingestão, remap de seleções em ordem invertida, odds
      retidas em PENDING_REVIEW, detecção multi-provedor (7 testes de integração)
- [x] API `/matching/*` (reviews, event-matches, approve/reject, provider-events)
      com proteção temporária (ADR-0012) + 6 testes de integração
- [x] Dashboard: tela de revisão com diffs destacados + badges multi-provedor na lista
- [x] Aliases aprovados persistidos; aprovação/rejeição idempotentes com auditoria
- [x] Confidence score conectado à qualidade do matching (`minMatchScore`, `manualMatch`)
- REMOVER-ANTES-DA-FASE-7: `ENABLE_UNAUTHENTICATED_MATCH_REVIEW` + `MatchReviewGuard`
  substituídos por RBAC autenticado na Fase 7 (ADR-0012).

### Fase 5 — Motor de surebet ✅
- [x] Detecção, alocação, arredondamento com recálculo, limites, viabilidade
- [x] Confidence score com pesos configuráveis e monotonicidade testada
- [x] 39 testes unitários incl. property-based
- Evidência: `pnpm --filter @rataria/odds-engine test` (34) + confidence (5).

### Fase 6 — Detecção e revalidação ✅
- [x] Pipeline com dedupeKey, revalidação antes de ACTIVE, invalidação, expiração
- [x] Idempotência (redetecção atualiza; jobs determinísticos)

### Fase 7 — API e autenticação ◐
- [x] Endpoints: health/ready, sports, events, events/:id/odds, surebets (+filtros,
      paginação), surebets/:id, simulate, providers, providers/status, SSE, Swagger
- [ ] Auth (Argon2id, JWT + refresh rotativo), RBAC, rate limiting, Helmet
- [ ] /metrics, versionamento de API

### Fase 8 — Dashboard ◐
- [x] Lista com margem/pior lucro/confiança/idade/casas + indicador de tempo real
- [x] Detalhe com pernas, explicação auditável, revalidações, simulador de banca
- [x] Estados loading/empty/error + avisos de risco
- [ ] Login/cadastro, comparador de odds, histórico, configurações, auditoria

### Fase 9 — Alertas ⬜
### Fase 10 — Hardening ⬜ (observabilidade completa, e2e Playwright, retenção)

## Critérios de aceite do fluxo vertical (todos atendidos)
- [x] Compila; sobe com serviços locais; migração em banco vazio; seed
- [x] Mock ingere odds por fluxo real; repetição não duplica
- [x] Pelo menos uma surebet detectada (tênis 2 vias, ~3,73%)
- [x] Pelo menos um mercado sem arbitragem (1X2 e totais não geram oportunidade)
- [x] Oportunidades antigas expiram (job de expiração testado)
- [x] API lista/detalha/simula; dashboard exibe dados reais com SSE
