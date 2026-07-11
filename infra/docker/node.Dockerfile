# Imagem única para api e worker; o serviço define o comando.
FROM node:22-alpine AS base
RUN corepack enable
WORKDIR /app

FROM base AS build
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY packages ./packages
COPY apps/api ./apps/api
COPY apps/worker ./apps/worker
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @rataria/database db:generate
RUN pnpm --filter "@rataria/*" build

FROM base AS runtime
ENV NODE_ENV=production
COPY --from=build /app ./
CMD ["node", "apps/api/dist/main.js"]
