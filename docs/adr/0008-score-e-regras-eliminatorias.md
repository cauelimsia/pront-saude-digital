# ADR-0008 — Score de matching e regras eliminatórias

Data: 2026-07-12 · Status: aceita

## Decisão
Score determinístico e versionado (`MATCHING_ALGORITHM_VERSION`), com pesos e
tolerâncias centralizados em `MatchingConfig` (nenhum número mágico espalhado).

Pesos iniciais (somam 100): participantes 55, competição 20, horário 15,
país 5, bônus de alias 5. Thresholds: aprovação automática ≥ 85, revisão ≥ 60,
abaixo disso rejeição.

**Regras eliminatórias prevalecem sobre o score textual.** São hard conflicts:
esporte diferente, data fora da janela, participantes estruturalmente
diferentes (similaridade < 0,55), conflito de categoria (base/feminino vs
principal) e competição explicitamente diferente (similaridade < 0,35 sem alias
nem país compatível). Qualquer hard conflict força REJECTED, mesmo com nomes
idênticos.

Restrições que rebaixam AUTO→REVIEW: diferença de horário acima da tolerância
(30 min) e ordem invertida em esporte com mando de campo.

## Consequências
Ajustes de calibragem alteram apenas `DEFAULT_MATCHING_CONFIG`. Mudança de
comportamento do algoritmo exige bump de versão e novos testes. Property-based
tests garantem: score em [0,100]; hard conflict sempre bloqueia; mais diferença
de horário nunca aumenta o score; alias aprovado nunca piora o score.
