# syntax=docker/dockerfile:1.6
FROM node:24-bookworm-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm install --no-audit --no-fund

FROM node:24-bookworm-slim AS builder
WORKDIR /app
ENV NODE_OPTIONS="--max-old-space-size=768" \
    NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ARG NEXT_PUBLIC_EAGASEKE_ORIGIN=http://localhost:3000
ARG NEXT_PUBLIC_CMS_URL=http://localhost:3004
ARG NEXT_PUBLIC_EAGASEKE_WS_ORIGIN=http://localhost:3000
ENV NEXT_PUBLIC_EAGASEKE_ORIGIN=$NEXT_PUBLIC_EAGASEKE_ORIGIN \
    NEXT_PUBLIC_CMS_URL=$NEXT_PUBLIC_CMS_URL \
    NEXT_PUBLIC_EAGASEKE_WS_ORIGIN=$NEXT_PUBLIC_EAGASEKE_WS_ORIGIN

# Next standalone exige public/ même vide
RUN mkdir -p public && npm run build

FROM node:24-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production \
    PORT=3003 \
    HOSTNAME=0.0.0.0 \
    NEXT_TELEMETRY_DISABLED=1

RUN apt-get update && apt-get install -y --no-install-recommends \
    curl ca-certificates \
    && rm -rf /var/lib/apt/lists/* \
    && groupadd -r app && useradd -r -g app app

COPY --from=builder --chown=app:app /app/.next/standalone ./
COPY --from=builder --chown=app:app /app/.next/static ./.next/static
COPY --from=builder --chown=app:app /app/public ./public

USER app
EXPOSE 3003
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=5 \
  CMD curl -fsS http://127.0.0.1:3003/ || exit 1
CMD ["node", "server.js"]
