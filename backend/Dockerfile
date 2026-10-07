# syntax=docker/dockerfile:1

# ─── build stage ──────────────────────────────────────────────────────────────
# Dependencies are installed in a stage of their own so the runtime image never
# carries npm's cache or the dev dependencies.
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# ─── runtime stage ────────────────────────────────────────────────────────────
FROM node:20-alpine AS runtime
WORKDIR /app

# dumb-init makes PID 1 forward SIGTERM properly, which is what lets the
# graceful shutdown in src/server.js actually run on a deploy or scale-down.
RUN apk add --no-cache dumb-init curl

ENV NODE_ENV=production
ENV PORT=4000

COPY --from=deps /app/node_modules ./node_modules
COPY package.json ./
COPY src ./src
COPY scripts ./scripts
COPY seed ./seed

# Never run as root: a container escape should not land on a privileged user.
# The node image already ships an unprivileged `node` user.
USER node

EXPOSE 4000

# Checks the readiness probe, so an instance that cannot reach MongoDB is marked
# unhealthy and drained rather than left serving errors.
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD curl -fsS http://127.0.0.1:4000/ready || exit 1

ENTRYPOINT ["dumb-init", "--"]

# Overridden to `npm run worker` for the worker deployment; same image, so the
# two can never drift apart in version.
CMD ["node", "src/server.js"]
