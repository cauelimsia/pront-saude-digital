# Regras de banco de dados

- PostgreSQL + Prisma. UUIDs, datas em UTC, createdAt/updatedAt em todos os modelos.
- `Decimal` para odds e dinheiro (`@db.Decimal`); enums para estados fechados; FKs sempre.
- JSON somente para payload original, metadados variáveis e explicações auditáveis (`explanation`, `details`). Nada consultável/indexável em JSON.
- Toda mudança de schema via `prisma migrate dev` (migração versionada e reproduzível em banco vazio). Nunca editar migração já commitada.
- Seed (`db:seed`) é determinístico e idempotente (upserts). O seed NÃO fabrica snapshots nem oportunidades — dados fluem pelo pipeline.
- Uniques compostos com coluna nullable não deduplicam NULLs no Postgres — usar find-or-create explícito (ver `Market.line`).
- Índices para filtros frequentes (status+profitPercent, status+expiresAt, selection+bookmaker+collectedAt).
