# Base stage
FROM node:20-alpine AS base
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Build dependencies
FROM base AS build-deps
COPY package.json package-lock.json* ./
RUN npm ci && npm cache clean --force

# Builder stage
FROM base AS builder
COPY --from=build-deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# Production runner - minimal Node.js runtime
FROM node:20-alpine AS runner

ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=3000

WORKDIR /app

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nuxtjs -u 1001

# Copy only build output (Nuxt .output is self-contained)
COPY --from=builder --chown=nuxtjs:nodejs /app/.output ./.output

USER nuxtjs

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

CMD ["node", ".output/server/index.mjs"]

