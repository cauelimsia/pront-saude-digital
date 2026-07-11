# ADR-0003 — Estratégia decimal

Data: 2026-07-11 · Status: aceita

## Decisão
- Motor: `decimal.js` com precisão 34 e ROUND_HALF_EVEN; odds entram como
  string e viram Decimal na fronteira.
- Banco: `Prisma.Decimal` (`@db.Decimal`) para odds (12,4), dinheiro (14,2)
  e somas inversas (18,12).
- API: valores decimais serializados como STRING no JSON; a UI apenas formata.
- Ordenação canônica das seleções antes da soma: a adição decimal em precisão
  finita não é associativa, e a ordenação torna o resultado exatamente
  invariante a permutações (defeito encontrado por property-based test).

## Proibições
Float nativo nunca é persistido nem usado em decisão de viabilidade.
