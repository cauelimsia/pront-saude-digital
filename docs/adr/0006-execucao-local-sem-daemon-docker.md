# ADR-0006 — Compose como caminho oficial; fallback sem daemon Docker

Data: 2026-07-11 · Status: aceita

## Contexto
O ambiente de desenvolvimento remoto desta sessão tem o CLI do Docker, mas
sem daemon disponível (`/var/run/docker.sock` ausente).

## Decisão
`docker-compose.yml` é o caminho oficial e reproduzível para desenvolvedores.
Para verificação nesta sessão, PostgreSQL 16 e Redis 7 do host foram usados
com as MESMAS variáveis de ambiente — nenhuma diferença de código entre os
dois modos.

## Consequências
O compose não foi executado nesta sessão (impossibilidade do ambiente, não do
projeto); CI usa services equivalentes (postgres:16-alpine, redis:7-alpine).
