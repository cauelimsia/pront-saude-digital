# Regras de segurança

- Segredos SOMENTE via variáveis de ambiente validadas na inicialização (`loadEnv`). `.env` está no .gitignore; `.env.example` nunca contém valores reais.
- Nunca armazenar: senha em texto aberto, credenciais de casas de apostas, segredos em fixtures/Git, dados sensíveis em logs (pino redact configurado).
- CORS restritivo (origem do dashboard via `WEB_ORIGIN`).
- Autenticação (Fase 7, implementada — ADR-0013): Argon2id (`@node-rs/argon2`); JWT HS256 curto com `jti`; refresh rotativo opaco com apenas o HASH persistido + detecção de reuso; RBAC USER/ANALYST/ADMIN (`JwtAuthGuard`+`RolesGuard`+`@Roles`); rate limiting (`@nestjs/throttler`); Helmet. `JWT_SECRET` obrigatório e forte em produção (`loadEnv` falha). Mutação de revisão exige ANALYST/ADMIN; ator auditado = usuário autenticado.
- Validação rigorosa de URLs de webhook e proteção SSRF antes de qualquer integração externa (Fase 9).
- Timeouts em toda requisição externa; retry limitado com backoff + jitter.
- Escopo proibido (nunca implementar): apostas automáticas, contorno de CAPTCHA/KYC/geolocalização/limites, rotação de identidade, scraping contra ToS.
