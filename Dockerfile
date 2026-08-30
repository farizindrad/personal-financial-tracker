# ============================================================
# Stage 1: Builder
# Compile TypeScript (backend) + build React static (frontend).
# TIDAK butuh koneksi database asli, dan TIDAK boleh menerima
# credential apa pun (ARG/ENV) di stage ini.
# ============================================================
FROM node:20-alpine AS builder
WORKDIR /app

COPY backend/package*.json backend/
COPY frontend/package*.json frontend/

RUN cd backend && npm ci
RUN cd frontend && npm ci

COPY backend backend
COPY frontend frontend

# prisma generate cuma baca schema.prisma, tidak connect ke DB
RUN cd backend && npx prisma generate
RUN cd backend && npm run build
RUN cd frontend && npm run build

# ============================================================
# Stage 2: Runtime
# Cuma copy hasil build + production dependencies.
# Credential HANYA masuk lewat environment variable saat
# container dijalankan (docker-compose env_file), bukan di sini.
# ============================================================
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY backend/package*.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/backend/dist ./dist
COPY --from=builder /app/backend/prisma ./prisma
COPY --from=builder /app/backend/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/frontend/dist ./public
COPY ecosystem.config.cjs ./

EXPOSE 3000
# PM2 runtime: 1 fork process, restart in-container; mem dibatasi juga di compose
CMD ["npx", "pm2-runtime", "start", "ecosystem.config.cjs"]
