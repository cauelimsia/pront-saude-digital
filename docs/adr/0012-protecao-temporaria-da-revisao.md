# ADR-0012 — Proteção temporária da revisão antes do RBAC

Data: 2026-07-12 · Status: SUPERSEDED por ADR-0013 (autenticação + RBAC)

## Contexto
Os endpoints de aprovação/rejeição de matching mutam dados sensíveis (associam
eventos, criam aliases). A autenticação completa (Argon2id, JWT, RBAC) é a
Fase 7. Não se pode deixar mutação administrativa aberta no interim.

## Decisão
Proteção temporária em duas camadas:
1. `MatchReviewGuard` bloqueia as mutações por padrão (HTTP 403). Só libera
   quando `ENABLE_UNAUTHENTICATED_MATCH_REVIEW=true`.
2. `loadEnv` FALHA na inicialização se essa flag for `true` em
   `NODE_ENV=production` — impossível subir produção com revisão sem auth.

Leituras (`GET /matching/*`) permanecem abertas. Nenhuma chave hardcoded.

Isto NÃO é autenticação: é um portão de desenvolvimento. Há item explícito
**REMOVER-ANTES-DA-FASE-7** em `docs/IMPLEMENTATION_PLAN.md`.

## Consequências
Coberto por testes de `loadEnv` (falha em produção; default seguro). Ao entrar
a Fase 7, o guard é substituído por RBAC (papel ANALYST/ADMIN) e a flag é
removida.

## Superseded por
ADR-0013 — autenticação (Argon2id + JWT + refresh rotativo) e RBAC. A flag
`ENABLE_UNAUTHENTICATED_MATCH_REVIEW` e o `MatchReviewGuard` foram removidos; as
mutações de revisão exigem papel ANALYST/ADMIN.
