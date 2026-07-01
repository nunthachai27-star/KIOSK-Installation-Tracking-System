# KIOSK Installation Tracking System — production image (Next.js 16 + Prisma 6)
FROM node:22-bookworm-slim AS base
# Prisma needs openssl at build- and run-time
RUN apt-get update && apt-get install -y --no-install-recommends openssl \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app

# ---- build stage ----
FROM base AS build
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npx prisma generate && npm run build

# ---- run stage ----
FROM base AS run
ENV NODE_ENV=production
# Bring the built app plus node_modules (keeps prisma CLI + tsx for migrate/seed)
COPY --from=build /app ./
EXPOSE 3000
# Apply pending migrations on boot (idempotent), then start the server.
CMD ["sh", "-c", "npx prisma migrate deploy && npx next start -p 3000 -H 0.0.0.0"]
