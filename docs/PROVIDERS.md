# Provedores de odds — como conectar um feed real

O Rataria separa **resiliência** (igual para todo provedor) de **mapeamento**
(específico de cada API). Você implementa apenas o mapeamento; a infraestrutura
resiliente já está pronta e testada em `packages/provider-sdk/src/rest`.

## Arquitetura

```
API real do provedor
      │  (HTTP)
      ▼
ResilientHttpClient   ← timeout, retry+backoff+jitter, circuit breaker, rate limit
      │
      ▼
RestProviderMapper    ← VOCÊ escreve: resposta crua → payload neutro
      │
      ▼
providerOddsPayloadSchema (Zod)  ← validação de fronteira; payload inválido é rejeitado
      │
      ▼
Pipeline (ingestão → matching → detecção)
```

O `RestOddsProvider` **não** contém lógica de arbitragem nem de matching —
é só adaptação. Credenciais **nunca** ficam no código: vêm de variáveis de
ambiente validadas.

## Passo a passo para adicionar um provedor REST

1. **Descubra o contrato da API**: URL base, autenticação (header/bearer/query),
   endpoints de odds, e o formato JSON da resposta.

2. **Escreva o mapper** implementando `RestProviderMapper`
   (`packages/provider-sdk/src/rest/rest-provider.ts`):

   ```ts
   const meuMapper: RestProviderMapper = {
     buildOddsRequests: (query) => [{ path: "/v3/odds?sport=all" }],
     mapToPayload: (providerId, [raw], now) => {
       const dados = raw as MinhaRespostaDaApi;
       return {
         sports: /* → ProviderSport[] */,
         competitions: /* → ProviderCompetition[] */,
         events: /* → ProviderEvent[] */,
         odds: /* → ProviderOddsEntry[] (odds como string, mercados canônicos) */,
       };
     },
     healthPath: "/status",
   };
   ```

3. **Configure via ambiente** (nunca hardcode a chave):

   ```bash
   REST_PROVIDER_ID=meu-feed
   REST_PROVIDER_BASE_URL=https://api.provedor.com
   REST_PROVIDER_AUTH_KIND=header        # header | bearer | query
   REST_PROVIDER_AUTH_NAME=X-API-Key     # nome do header/param (não usado em bearer)
   REST_PROVIDER_API_KEY=***             # SÓ no .env (fora do Git)
   ```

4. **Registre no worker** (`apps/worker/src/main.ts`), ao lado dos mocks:

   ```ts
   import { RestOddsProvider, defaultHttpOptions } from "@rataria/provider-sdk";
   if (env.REST_PROVIDER_API_KEY) {
     registry.register(
       new RestOddsProvider({
         providerId: env.REST_PROVIDER_ID,
         baseUrl: env.REST_PROVIDER_BASE_URL,
         auth: {
           kind: env.REST_PROVIDER_AUTH_KIND,
           name: env.REST_PROVIDER_AUTH_NAME,
           apiKey: env.REST_PROVIDER_API_KEY,
         },
         mapper: meuMapper,
         http: defaultHttpOptions(),
       }),
     );
   }
   ```

5. **Registre o provedor no banco** (seed ou migração) com a mesma `key`, para
   o pipeline associar `ProviderHealthLog`/`IngestionBatch`.

## Provedor pronto: API-Football (api-football.com)

Já existe um mapper pronto (`createApiFootballMapper`) para o feed da
**API-Football v3**, que entrega odds de vários bookmakers por jogo — ideal para
surebet. Para ativar, basta configurar a chave no `.env`:

```bash
REST_PROVIDER_API_KEY=SUA_CHAVE        # só no .env; nunca no Git
REST_PROVIDER_ID=api-football
REST_PROVIDER_BASE_URL=https://v3.football.api-sports.io
REST_PROVIDER_AUTH_NAME=x-apisports-key
REST_PROVIDER_MAX_PAGES=3               # ~10 jogos por página
# REST_PROVIDER_DATE=2026-07-13         # vazio = hoje (UTC)
```

Com a chave presente, o worker registra o provedor automaticamente (senão, roda
só com os mocks). Mercados mapeados: **Match Winner → 1X2**, **Goals Over/Under
→ Totais**, **Both Teams Score → BTTS**.

> Se você usa a API-Football via **RapidAPI**, mude a base para
> `https://api-football-v1.p.rapidapi.com/v3` e `REST_PROVIDER_AUTH_NAME` para
> `x-rapidapi-key` (e adicione o header `x-rapidapi-host` no mapper, se preciso).

**Smoke test recomendado** (confirmar contra uma resposta real, com sua chave):
```bash
curl -s -H "x-apisports-key: $REST_PROVIDER_API_KEY" \
  "https://v3.football.api-sports.io/fixtures?date=$(date -u +%F)" | head -c 500
```
Se a estrutura bater com a esperada (`response[].teams.home.name`, etc.), o
mapper funciona direto. Observação: no plano gratuito a cota e a disponibilidade
de odds são limitadas — para operar de verdade normalmente é preciso plano pago.

## Resiliência (já pronta, `defaultHttpOptions`)

| Recurso | Padrão | Ajuste |
|---|---|---|
| Timeout por tentativa | 8 s | `http.timeoutMs` |
| Retry | 3 tentativas | `http.retry` |
| Backoff | exponencial + jitter (300 ms→4 s) | `http.retry` |
| Circuit breaker | abre em 5 falhas, meia-abertura em 30 s | `http.circuitBreaker` |
| Rate limit | 5 req/s (rajada 5) | `http.rateLimiter` |

Erros transitórios (rede, timeout, 429, 5xx) são retentados; 4xx permanentes
falham direto. Um provedor em falha **não derruba o pipeline** — o ciclo é
pulado e registrado em `ProviderHealthLog`.

## Compliance (obrigatório)

- Use **apenas feeds oficiais/licenciados** que você tem direito de consumir.
  Nada de scraping contra os termos de uso.
- A chave de API vive **só** em variável de ambiente (o `.env` está no
  `.gitignore`). Nunca commite credenciais nem as coloque em fixtures.
- Timeouts e rate limiting respeitam os limites do provedor.
