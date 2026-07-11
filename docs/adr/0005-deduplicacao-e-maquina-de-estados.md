# ADR-0005 — Deduplicação e máquina de estados de oportunidades

Data: 2026-07-11 · Status: aceita

## Deduplicação
`dedupeKey = eventId | marketId | pares outcome:bookmaker ordenados`.
Redetecção da mesma estrutura ATUALIZA (odds, margens, expiresAt) em vez de
criar registro novo. Ingestão: batch único por `(providerId, cycle)`;
snapshot único por `(provider, bookmaker, selection, providerTimestamp)`.

## Máquina de estados
DETECTED → VALIDATING → ACTIVE/UNEXECUTABLE; ACTIVE ⇄ STALE;
qualquer ativo → INVALIDATED/EXPIRED (terminais). Transições validadas por
`canTransition` em `packages/shared` — worker nunca seta status livremente.
No fluxo vertical a validação é síncrona (detecção JÁ recalcula com odds
frescas), então DETECTED/VALIDATING são efêmeros e persiste-se direto
ACTIVE ou UNEXECUTABLE, com registro em `SurebetValidation`.
