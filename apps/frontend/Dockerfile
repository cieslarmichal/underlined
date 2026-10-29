FROM node:26.5.0-alpine AS base

RUN apk update && apk add --no-cache libc6-compat

WORKDIR /app

FROM base AS pruner

COPY package*.json turbo.json tsconfig.json ./
COPY apps/ ./apps

RUN npx turbo prune --scope="@apps/frontend" --docker

FROM base AS installer

COPY --from=pruner /app/out/json/ .
COPY --from=pruner /app/out/package-lock.json ./package-lock.json
COPY tsconfig.json ./

RUN npm ci

COPY --from=pruner /app/out/full/ .

RUN npm run build --filter="@apps/frontend"

FROM nginx as static

COPY --from=installer /app/apps/frontend/nginx/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=installer /app/apps/frontend/dist /usr/share/nginx/html
