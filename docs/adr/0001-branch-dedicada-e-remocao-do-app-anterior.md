# ADR-0001 — Branch dedicada e remoção do app anterior

Data: 2026-07-11 · Status: aceita

## Contexto
O repositório continha uma aplicação Next.js de outro produto ("Pront.",
saúde digital), desenvolvida na branch `claude/pront-app-recreation-zhfv36`.
A branch atual (`claude/surebet-detection-dashboard-lgzyiq`) é dedicada ao
sistema de surebets e partia do mesmo conteúdo.

## Decisão
Remover os arquivos do app anterior NESTA branch e construir o monorepo do
zero. O app anterior permanece intacto na sua branch de origem.

## Consequências
Sem risco de perda (histórico Git + branch preservada); estrutura limpa para
o monorepo pnpm.
