# ADR-0011 — Unicidade parcial do dedupeKey por ciclo de vida

Data: 2026-07-12 · Status: aceita · Complementa ADR-0005

## Contexto
A `dedupeKey` era `@unique` global. Depois que uma oportunidade expira
(EXPIRED) ou é invalidada (INVALIDATED) — estados terminais —, a MESMA estrutura
de mercado pode reaparecer num novo ciclo. Com unique global, a redetecção
tentava violar a constraint e a oportunidade ficava presa em EXPIRED
(bug observado: warns "transição não permitida EXPIRED→ACTIVE" em loop).

## Decisão
Índice único PARCIAL: `dedupeKey` é único apenas entre estados NÃO-terminais
(DETECTED, VALIDATING, ACTIVE, STALE, UNEXECUTABLE, MANUAL_REVIEW). Estados
terminais não participam da unicidade. A detecção busca a oportunidade ativa
por `(dedupeKey, status in não-terminais)`; se não houver, cria um novo
registro (novo ciclo de vida). Redetecção de uma ativa continua atualizando.

## Consequências
- Uma oportunidade que expira e reaparece gera um novo registro — o histórico
  de ciclos fica preservado (auditável), sem duplicar ativas.
- Índice adicional não-único em `dedupeKey` para a busca.
- Coberto por `pipeline.integration.test.ts` (redetecção idempotente) e
  `multiprovider.integration.test.ts`.
