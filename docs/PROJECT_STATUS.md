# Status do projeto — ponto de retomada

Atualizado: 2026-07-12

## Última tarefa concluída
Fase 7 — autenticação e RBAC (ADR-0013), com redesign profissional do dashboard.
- Argon2id, JWT curto (jti), refresh rotativo com hash + detecção de reuso.
- RBAC USER/ANALYST/ADMIN; revisão de matching agora exige ANALYST/ADMIN
  (proteção temporária da Fase 4 REMOVIDA — flag e guard apagados).
- Rate limiting (throttler), Helmet, CORS restritivo.
- Frontend: login/cadastro, sessão com auto-refresh, header com usuário/logout,
  botões de revisão gated por papel; interface repaginada (design system com
  paleta validada + lucide-react).

## Tarefa atual
Nenhuma em andamento — Fase 7 entregue.

## Próxima tarefa
Fase 9 (alertas) ou Fase 10 (hardening: /metrics, observabilidade completa,
retenção de snapshots, e2e Playwright no CI). Ver `docs/IMPLEMENTATION_PLAN.md`.

## Testes (101 passando, 0 falhando)
- odds-engine 36, matching 22, provider-sdk 10, shared 5, worker 11, api 17.
- api inclui auth (integração: registro/login/rotação/reuso/logout) + RolesGuard
  (unit) + matching (integração).
- Integração exige `DATABASE_URL`/`REDIS_URL` (+ `JWT_SECRET` tem default dev).
  IMPORTANTE: pare o worker de fundo antes de rodar a suíte localmente — ele
  ingere no mesmo banco e causa corrida (não é problema no CI).

## Comandos relevantes
```
pnpm db:migrate && pnpm db:seed
pnpm build && pnpm typecheck && pnpm lint && pnpm test   # todos verdes
# stack local (dev):
JWT_SECRET=<32+ chars> pnpm --filter @rataria/api dev
pnpm --filter @rataria/worker dev
pnpm --filter @rataria/web dev
# criar admin: POST /auth/register + UPDATE "User" SET role='ADMIN'
```

## Decisões recentes
ADR-0013 (autenticação + RBAC) supersede ADR-0012 (proteção temporária).

## Pendências conhecidas
- Transporte do refresh: hoje em localStorage com auto-refresh; produção deve
  migrar para cookie HttpOnly atrás de mesma origem/reverse proxy (ADR-0013).
- Adaptador REST demonstrativo (Fase 3), alertas (Fase 9), /metrics + retenção
  + e2e no CI (Fase 10).
- `docker compose up` não pôde rodar nesta sessão (sem daemon Docker — ADR-0006);
  o compose agora exige `JWT_SECRET` via ambiente.

## Bloqueios reais
Nenhum.
