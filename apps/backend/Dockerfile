FROM node:26.13.0-alpine AS base

RUN apk update && apk add --no-cache libc6-compat

WORKDIR /app

FROM base AS pruner

COPY package*.json turbo.json tsconfig.json ./
COPY apps/ ./apps

RUN npx turbo prune --scope="@apps/backend" --docker

FROM base AS installer

COPY --from=pruner /app/out/json/ .
COPY --from=pruner /app/out/package-lock.json ./package-lock.json
COPY tsconfig.json ./

RUN npm ci

COPY --from=pruner /app/out/full/ .

RUN npm run build --filter="@apps/backend"

FROM base AS runner

ENV NODE_ENV=production
ENV NODE_CONFIG_DIR=/app/apps/backend/config

COPY package*.json ./
COPY --from=installer /app/apps/backend/dist ./apps/backend
COPY --from=installer /app/apps/backend/config ./apps/backend/config
COPY --from=installer /app/apps/backend/package.json ./apps/backend/package.json

RUN npm ci --omit=dev

USER node

CMD ["node", "apps/backend/src/index.js"]
