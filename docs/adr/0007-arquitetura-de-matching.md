# ADR-0007 — Arquitetura do matching de eventos

Data: 2026-07-12 · Status: aceita

## Contexto
Com múltiplos provedores, o mesmo evento chega com nomes, horários e formatos
diferentes. É preciso associar representações ao mesmo evento canônico sem unir
eventos distintos.

## Decisão
Núcleo de matching em `packages/matching` — biblioteca TypeScript PURA
(sem NestJS/Prisma/Redis/HTTP), determinística e testável. Etapas separadas:
normalização de texto → geração de candidatos (blocking) → extração de features
→ regras eliminatórias → score → decisão. O worker (`apps/worker/src/matching.ts`)
orquestra persistência; a API expõe revisão; a detecção só combina odds de
eventos com vínculo aprovado.

O vínculo `ProviderEventLink` ganhou estados (AUTO_LINKED, MANUALLY_LINKED,
NEW_EVENT, PENDING_REVIEW) e `eventId` nullable (null enquanto em revisão).

## Consequências
- O núcleo puro tem property-based tests e roda sem infraestrutura.
- Novos provedores reais entram sem mexer no algoritmo.
- Trade-off: blocking por esporte + janela de horário pode perder pares muito
  distantes no tempo; a janela (48h) é configurável em `MatchingConfig`.
