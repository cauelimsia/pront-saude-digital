# ADR-0002 — pnpm workspaces sem Turborepo (por ora)

Data: 2026-07-11 · Status: aceita

## Decisão
Monorepo com pnpm workspaces puro; scripts recursivos (`pnpm -r`).
Turborepo fica adiado até haver dor real de cache/orquestração.

## Justificativa
Sete workspaces com grafo simples; `pnpm -r` resolve ordem topológica de
build. Menos uma dependência de infraestrutura no caminho crítico do MVP.

## Consequências
Reavaliar quando os tempos de build/CI justificarem cache incremental.
