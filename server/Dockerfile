FROM oven/bun:1-alpine AS base

FROM base AS deps
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --production && \
    bun pm cache rm

FROM base AS runner
WORKDIR /app

ARG NODE_ENV=production
ENV NODE_ENV=${NODE_ENV}

COPY --from=deps /app/node_modules ./node_modules
COPY package.json bun.lock tsconfig.json ./
COPY src ./src

RUN addgroup -g 1001 -S nodejs && \
    adduser -S bunjs -u 1001 && \
    chown -R bunjs:nodejs /app
USER bunjs

CMD ["bun", "run", "src/mcp/index.ts"]
