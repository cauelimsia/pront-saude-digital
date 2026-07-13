#!/usr/bin/env bash
# Instalador de produção do Rataria (VPS). Um comando faz tudo:
# instala Docker, gera segredos, monta o .env, sobe o stack e testa.
#
# Uso, na raiz do projeto já clonado na VPS:
#   bash infra/deploy/setup.sh
#
# Modo não-interativo (passe por variáveis de ambiente):
#   DOMAIN=rataria.cauedev.shop DATABASE_URL='postgres://...' \
#   REST_PROVIDER_API_KEY='...' bash infra/deploy/setup.sh
set -euo pipefail

cd "$(cd "$(dirname "$0")/../.." && pwd)"
info() { printf "\033[1;36m[rataria]\033[0m %s\n" "$*"; }
err()  { printf "\033[1;31m[rataria]\033[0m %s\n" "$*" >&2; }

# 1) Docker
if ! command -v docker >/dev/null 2>&1; then
  info "Instalando Docker..."
  curl -fsSL https://get.docker.com | sh
fi
docker compose version >/dev/null 2>&1 || { err "Docker Compose v2 não encontrado."; exit 1; }

# 2) .env (reaproveita se já existir)
if [ -f .env ]; then
  info ".env já existe — reaproveitando. (apague o arquivo para reconfigurar)"
else
  DOMAIN="${DOMAIN:-}"
  DATABASE_URL="${DATABASE_URL:-}"
  REST_PROVIDER_API_KEY="${REST_PROVIDER_API_KEY:-}"
  if [ -z "$DOMAIN" ]; then
    read -rp "Domínio (ex.: rataria.cauedev.shop): " DOMAIN
  fi
  if [ -z "$DATABASE_URL" ]; then
    read -rp "DATABASE_URL do Supabase (Session Pooler :5432) [enter = Postgres local]: " DATABASE_URL
  fi
  if [ -z "$REST_PROVIDER_API_KEY" ]; then
    read -rp "Chave da API-Football [enter = rodar com dados mockados]: " REST_PROVIDER_API_KEY
  fi
  [ -n "$DOMAIN" ] || { err "Domínio é obrigatório."; exit 1; }

  # Segredos gerados automaticamente — você não precisa inventar nada.
  JWT_SECRET="$(openssl rand -base64 48 | tr -d '\n')"
  POSTGRES_PASSWORD="$(openssl rand -base64 24 | tr -dc 'A-Za-z0-9')"

  {
    echo "DOMAIN=$DOMAIN"
    echo "JWT_SECRET=$JWT_SECRET"
    echo "POSTGRES_PASSWORD=$POSTGRES_PASSWORD"
    [ -n "$DATABASE_URL" ] && echo "DATABASE_URL=$DATABASE_URL"
    [ -n "$REST_PROVIDER_API_KEY" ] && echo "REST_PROVIDER_API_KEY=$REST_PROVIDER_API_KEY"
  } > .env
  chmod 600 .env
  info ".env criado com segredos gerados automaticamente (fica só na VPS)."
fi

# 3) Escolhe os overlays conforme o banco
FILES=(-f docker-compose.yml -f infra/deploy/docker-compose.prod.yml)
if grep -q '^DATABASE_URL=' .env; then
  FILES+=(-f infra/deploy/docker-compose.supabase.yml)
  info "Banco: Supabase (externo)."
else
  info "Banco: PostgreSQL local (container)."
fi

# 4) Sobe o stack
info "Subindo o stack (o primeiro build leva alguns minutos)..."
docker compose "${FILES[@]}" up -d --build

# 5) Health check
DOMAIN_VALUE="$(grep '^DOMAIN=' .env | cut -d= -f2-)"
info "Aguardando HTTPS responder em https://$DOMAIN_VALUE ..."
for _ in $(seq 1 40); do
  if curl -sf "https://$DOMAIN_VALUE/api/health" >/dev/null 2>&1; then
    info "✅ No ar: https://$DOMAIN_VALUE"
    info "Crie sua conta em https://$DOMAIN_VALUE/register e promova a ADMIN (ver docs/DEPLOY.md)."
    exit 0
  fi
  sleep 6
done
err "A API ainda não respondeu em HTTPS. Verifique:"
err "  • o registro DNS A de $DOMAIN_VALUE aponta para o IP desta VPS?"
err "  • as portas 80 e 443 estão abertas no firewall?"
err "Logs: docker compose ${FILES[*]} logs -f caddy api"
exit 1
