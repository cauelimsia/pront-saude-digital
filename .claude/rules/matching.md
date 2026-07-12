# Regras do matching de eventos (`packages/matching`)

- Biblioteca TypeScript PURA e determinística. Sem NestJS/Prisma/Redis/HTTP/IO. `Date` só via valores injetados nos tipos de entrada.
- Etapas separadas e testáveis: normalização de texto → geração de candidatos (blocking) → extração de features → regras eliminatórias → score → decisão.
- Pesos, tolerâncias e thresholds SÓ em `MatchingConfig` (`DEFAULT_MATCHING_CONFIG`). Nenhum número mágico no código.
- Normalização preserva o original: chamadores persistem original + normalizado + `NORMALIZER_VERSION`. Não usar normalização agressiva que colapse entidades diferentes.
- Regras eliminatórias (hard conflicts) prevalecem sobre score textual alto — esporte/data/categoria/competição incompatíveis forçam REJECTED.
- Ordem invertida nunca silenciosa: penalidade + revisão obrigatória em esportes com mando; remapeamento de seleções HOME/AWAY na ingestão.
- Score determinístico e versionado (`MATCHING_ALGORITHM_VERSION`). Mudança de fórmula exige bump de versão + novos testes conhecidos + manutenção dos property-based.
- Só combinar odds de eventos com associação APROVADA. PENDING_REVIEW não persiste odds; rejeitado não combina.
- Persistência: `EventMatch.features`/`explanation` em JSON (auditável); `providerKeys`/`minMatchScore`/`manualMatch` em colunas consultáveis.
- Aprovação/rejeição de revisão são idempotentes; toda decisão manual gera `AuditLog`.
