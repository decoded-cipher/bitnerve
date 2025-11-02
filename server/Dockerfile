FROM oven/bun:1-alpine AS base

# Install dependencies only
FROM base AS deps
WORKDIR /app
COPY package.json bun.lockb ./
RUN bun install --frozen-lockfile

# Build stage
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY package.json bun.lockb tsconfig.json ./
COPY src ./src

# Build the TypeScript code
RUN bun run build

# Production image
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

# Copy package files and install only production dependencies
COPY package.json bun.lockb ./
RUN bun install --frozen-lockfile --production && \
    bun pm cache rm

# Copy only built files
COPY --from=builder /app/dist ./dist

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S bunjs -u 1001 && \
    chown -R bunjs:nodejs /app
USER bunjs

EXPOSE 3000

# Run the application
CMD ["bun", "run", "dist/index.js"]

