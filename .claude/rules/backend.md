# Regras de backend (api + worker)

- Validação de entrada SEMPRE com Zod (schemas em `@rataria/shared` ou locais). Não usar class-validator.
- Payloads de provedores são validados na fronteira da ingestão (`providerOddsPayloadSchema`) antes de qualquer processamento.
- Erros: nunca catch vazio. Tratar, propagar, converter em erro de domínio, retentar ou ignorar COM justificativa em comentário/log.
- Um provedor com falha não pode derrubar o pipeline: pular ciclo, registrar em `ProviderHealthLog`.
- Jobs BullMQ: jobId determinístico quando possível, attempts limitados, backoff exponencial, idempotência garantida por uniques do banco (batch `providerId+cycle`; snapshot `provider+bookmaker+selection+providerTimestamp`; oportunidade `dedupeKey`).
- Logs: pino JSON estruturado com correlação (batchId/jobId/opportunityId). NUNCA logar segredos, URLs com credenciais, tokens.
- NestJS: usar `@Inject(Token)` explícito nos construtores — o runner de dev (tsx/esbuild) não emite decorator metadata.
- SSE: eventos pequenos (id + tipo); o cliente refaz o fetch. Não enviar payloads grandes pelo stream.
