# Regras de testes

- Vitest em todos os pacotes. Pirâmide: unitários (motor, normalização, dedupe) > integração (pipeline com PG+Redis reais) > e2e.
- Motor de surebet: casos com valores CONHECIDOS (frações exatas quando possível) + property-based (fast-check) para invariantes. Toda correção de bug ganha teste de regressão.
- Testes de integração usam `describe.skipIf(!process.env.DATABASE_URL)` para rodar apenas com infraestrutura disponível (local e CI têm PG+Redis).
- Não usar snapshot de UI como única evidência.
- Um teste que falha de forma intermitente é um bug a investigar, não a silenciar.
