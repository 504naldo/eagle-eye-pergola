# ──────────────────────────────────────────────────────────────────────────────
# Stage 1 — Install all deps and build
# ──────────────────────────────────────────────────────────────────────────────
FROM node:22-alpine AS builder

WORKDIR /app

RUN npm install -g pnpm@10.4.1

# Copy manifests first for better layer caching
COPY package.json pnpm-lock.yaml ./
COPY patches/ ./patches/

# Install all deps (devDeps needed for build)
RUN pnpm install --frozen-lockfile

# Copy source
COPY . .

# Build: Vite (frontend) + esbuild (server bundle → dist/index.js)
RUN pnpm build

# ──────────────────────────────────────────────────────────────────────────────
# Stage 2 — Production image (runtime deps + built artifacts only)
# ──────────────────────────────────────────────────────────────────────────────
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

RUN npm install -g pnpm@10.4.1

# netcat is used in the entrypoint to wait for MySQL to be reachable
RUN apk add --no-cache netcat-openbsd

# Copy manifests
COPY package.json pnpm-lock.yaml ./
COPY patches/ ./patches/

# Install production deps only (this also rebuilds native modules, e.g. sharp,
# for the correct linux/x86_64 platform)
RUN pnpm install --frozen-lockfile --prod

# Built server bundle
COPY --from=builder /app/dist ./dist

# Drizzle migration files (SQL + meta journal)
COPY drizzle/ ./drizzle/

# Migration runner script
COPY scripts/ ./scripts/

# Entrypoint
COPY docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh

EXPOSE 3000

ENTRYPOINT ["/app/docker-entrypoint.sh"]
