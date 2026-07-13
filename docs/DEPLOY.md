# Deploy em VPS (Docker + HTTPS automático)

Sobe **todo** o sistema (dashboard + API + worker + PostgreSQL + Redis) atrás de
um proxy Caddy com HTTPS automático. Você roda estes comandos **na sua VPS** —
nunca precisa me passar senha nenhuma.

## Pré-requisitos
- VPS Linux com **Docker** e **Docker Compose** (v2).
- Um **domínio** (ou subdomínio) com registro **DNS A** apontando para o **IP da
  VPS**. Ex.: `surebets.seudominio.com → 203.0.113.10`.
- Portas **80** e **443** abertas no firewall da VPS.

Instalar Docker (Ubuntu/Debian), se ainda não tiver:
```bash
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER   # relogue depois
```

## 1) Clonar o projeto
```bash
git clone https://github.com/clsolucoesweb/rataria.git
cd rataria
git checkout claude/multi-provider-event-matching   # ou a branch já mesclada
```

## 2) Configurar o ambiente
```bash
cp .env.production.example .env
# gere segredos fortes:
echo "JWT_SECRET=$(openssl rand -base64 48)" 
echo "POSTGRES_PASSWORD=$(openssl rand -base64 24)"
nano .env    # cole os segredos e ajuste DOMAIN
```
Mínimo a preencher no `.env`: `DOMAIN`, `POSTGRES_PASSWORD`, `JWT_SECRET`.

## 3) Subir tudo
```bash
docker compose -f docker-compose.yml -f infra/deploy/docker-compose.prod.yml up -d --build
```
A primeira vez leva alguns minutos (build das imagens). O Caddy emite o
certificado HTTPS automaticamente assim que o DNS estiver propagado.

## 4) Verificar
```bash
docker compose -f docker-compose.yml -f infra/deploy/docker-compose.prod.yml ps
curl -s https://$DOMAIN/api/health          # {"status":"ok",...}
```
Abra `https://SEU_DOMINIO` no navegador → tela de login.

## 5) Criar o primeiro usuário ADMIN
Opção A — cadastre pela tela `/register` e promova pelo banco:
```bash
docker compose exec postgres psql -U rataria -d rataria \
  -c "UPDATE \"User\" SET role='ADMIN' WHERE email='voce@dominio.com';"
```
Opção B — via `SEED_ADMIN_*` no `.env` (gere o hash da senha primeiro):
```bash
docker compose run --rm api node -e \
  "require('@node-rs/argon2').hash(process.argv[1]).then(h=>console.log(h))" 'SUA_SENHA'
# cole o hash em SEED_ADMIN_PASSWORD_HASH, defina SEED_ADMIN_EMAIL e rode 'up -d' de novo
```

## 6) Conectar o provedor de odds real (opcional)
No `.env`, defina `REST_PROVIDER_API_KEY=<sua-chave>` e recrie o worker/api:
```bash
docker compose -f docker-compose.yml -f infra/deploy/docker-compose.prod.yml up -d worker api
```
Ver `docs/PROVIDERS.md` para detalhes da API-Football. **Sem** a chave, o sistema
roda com os provedores mockados (dados de demonstração).

## Usar Supabase como banco (em vez do Postgres local)

O Supabase é PostgreSQL gerenciado — nada muda no código, só a conexão.

1. No painel do Supabase: **Project → Connect** e copie a string do
   **Session pooler** (porta **5432**, IPv4 — compatível com Prisma e com hosts
   sem IPv6). Evite o *Transaction pooler* (6543): ele não roda migrações bem.
   Formato: `postgresql://postgres.<ref>:<SENHA>@aws-0-<region>.pooler.supabase.com:5432/postgres`

2. No `.env` da VPS, defina:
   ```bash
   DATABASE_URL=postgresql://postgres.<ref>:<SENHA>@aws-0-<region>.pooler.supabase.com:5432/postgres
   ```
   (A senha é a do banco do Supabase — fica só no `.env`, nunca no Git.)

3. Suba incluindo o overlay do Supabase (desliga o Postgres local):
   ```bash
   docker compose -f docker-compose.yml \
     -f infra/deploy/docker-compose.prod.yml \
     -f infra/deploy/docker-compose.supabase.yml up -d --build
   ```

As migrações do Prisma rodam automaticamente contra o Supabase no serviço
`migrate`. Você acompanha as tabelas no **Table Editor** do Supabase.

> Redis (filas + tempo real) continua no container local — o Supabase não
> substitui o Redis. Se quiser Redis gerenciado, use Upstash e aponte
> `REDIS_URL` para ele.

## Atualizar para uma nova versão
```bash
git pull
docker compose -f docker-compose.yml -f infra/deploy/docker-compose.prod.yml up -d --build
```
As migrações do banco rodam sozinhas (idempotentes) no serviço `migrate`.

## Logs e manutenção
```bash
# logs ao vivo
docker compose -f docker-compose.yml -f infra/deploy/docker-compose.prod.yml logs -f api worker
# backup do banco
docker compose exec postgres pg_dump -U rataria rataria > backup_$(date +%F).sql
# derrubar tudo (mantém os volumes/dados)
docker compose -f docker-compose.yml -f infra/deploy/docker-compose.prod.yml down
```

## Notas de segurança (produção)
- `.env` fica só na VPS, nunca no Git (já está no `.gitignore`).
- Postgres e Redis **não** expõem portas públicas neste overlay — só a rede
  interna do Docker.
- Troque `JWT_SECRET` e `POSTGRES_PASSWORD` por valores fortes e únicos.
- O Caddy renova o certificado HTTPS automaticamente.
- Rode `docker compose ... logs` de tempos em tempos e mantenha o SO atualizado.
