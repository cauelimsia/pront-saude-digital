# ADR-0010 — Aliases e persistência de explicações

Data: 2026-07-12 · Status: aceita

## Aliases
`NameAlias` guarda aliases aprovados de participantes e competições
(canônico + original + normalizado + tipo + origem + quem/quando aprovou +
evidência). Aliases APPROVED elevam a similaridade no matching futuro
(similaridade máxima quando há alias exato).

- Seed traz aliases de competição determinísticos (ex.: "Campeonato Brasileiro
  Série A" → "Brasileirão Série A").
- Aprovação manual de uma revisão cria aliases de participante a partir dos
  nomes do vínculo, respeitando a orientação (direta/invertida). Aliases
  redundantes (que normalizam igual) NÃO são criados.
- Nunca se cria alias permanente automaticamente a partir de score
  intermediário — só por aprovação manual ou seed.

## Persistência das explicações
`EventMatch.features` e `EventMatch.explanation` guardam, em JSON, as features
e as razões (positivas/negativas/eliminatórias) — auditáveis, não
consultáveis. A oportunidade de surebet guarda `providerKeys`, `minMatchScore`
e `manualMatch` em COLUNAS (consultáveis/indexáveis), além do bloco `matching`
dentro de `explanation`.

## Consequências
A UI apenas exibe as explicações vindas da API; nunca recalcula score.
