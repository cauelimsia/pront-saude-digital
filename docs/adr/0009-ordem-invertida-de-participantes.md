# ADR-0009 — Tratamento de ordem invertida dos participantes

Data: 2026-07-12 · Status: aceita

## Contexto
Provedores representam o mesmo confronto com mando trocado
(ex.: "Alpha vs Beta" e "Beta @ Alpha"). Aceitar a inversão silenciosamente
pode trocar seleções HOME/AWAY e fabricar uma falsa surebet.

## Decisão
A extração de features calcula similaridade direta E cruzada; a melhor
orientação define `matchedWithReversedParticipants`. A inversão nunca é
silenciosa:
- aplica penalidade explícita ao score (`reversedOrderPenalty`);
- em esportes com mando relevante (futebol etc.), força REVIEW_REQUIRED —
  nunca aprovação automática;
- em esportes sem mando (tênis, `sportsWithIrrelevantOrder`), pode aprovar.

Quando a orientação aprovada é invertida, a ingestão **remapeia** as seleções
dependentes de mando (HOME↔AWAY em MATCH_WINNER_2WAY e ONE_X_TWO) antes de
persistir os snapshots. DRAW e mercados independentes de mando (totais, BTTS)
não são remapeados.

## Consequências
Odds de um provedor invertido caem na seleção canônica correta — testado em
`multiprovider.integration.test.ts` (o UNDER/OVER e o HOME/AWAY do tênis).
Falsos positivos por troca de lado são evitados.
