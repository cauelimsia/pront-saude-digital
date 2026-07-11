# Regras do motor de surebet (`packages/odds-engine`)

- Biblioteca TypeScript pura e determinística. Dependência permitida: `decimal.js`. Proibido: NestJS, Prisma, Redis, HTTP, IO, Date.now() implícito.
- Fórmulas canônicas:
  - `inverseSum = Σ(1/odd_i)`; arbitragem ⇔ `inverseSum < 1` (estrito; `= 1` NÃO é arbitragem).
  - `payoutMultiplier = 1/inverseSum`; `profitPercent = (payoutMultiplier − 1) × 100`.
  - `stake_i = totalStake × (1/odd_i)/inverseSum`.
- Odds entram como STRING e viram Decimal na fronteira. Odd válida: finita e `> 1`.
- Seleções são ordenadas canonicamente por `selectionKey` antes da soma (invariância exata a permutações).
- Arredondamento: alinhar ao incremento, depois RECALCULAR retornos/lucros de todos os cenários; viabilidade decidida pelo pior lucro pós-arredondamento. Nunca assumir que a margem sobrevive.
- Qualquer mudança nas fórmulas exige novos casos de teste com valores conhecidos (frações exatas quando possível) e manutenção dos testes property-based.
- Confidence score é confiança OPERACIONAL (0–100), nunca probabilidade de lucro. Manter monotonicidade: piorar um fator (ex.: idade da odd) nunca aumenta o score.
