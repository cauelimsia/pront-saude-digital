# Regras de segurança

- Segredos SOMENTE via variáveis de ambiente validadas na inicialização (`loadEnv`). `.env` está no .gitignore; `.env.example` nunca contém valores reais.
- Nunca armazenar: senha em texto aberto, credenciais de casas de apostas, segredos em fixtures/Git, dados sensíveis em logs (pino redact configurado).
- CORS restritivo (origem do dashboard via `WEB_ORIGIN`).
- Autenticação (Fase 7): Argon2id, JWT curto, refresh rotativo com hash persistido, RBAC (USER/ANALYST/ADMIN), rate limiting, Helmet.
- Validação rigorosa de URLs de webhook e proteção SSRF antes de qualquer integração externa (Fase 9).
- Timeouts em toda requisição externa; retry limitado com backoff + jitter.
- Escopo proibido (nunca implementar): apostas automáticas, contorno de CAPTCHA/KYC/geolocalização/limites, rotação de identidade, scraping contra ToS.
