# syntax=docker/dockerfile:1

# ---------- deps ----------
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# ---------- builder ----------
FROM node:20-alpine AS builder
WORKDIR /app
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Next build
RUN npm run build

# ---------- runner (production) ----------
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
# (ixtiyoriy) next telemetry off
ENV NEXT_TELEMETRY_DISABLED=1

# Faqat kerakli fayllarni olib o'tamiz
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/next.config.* ./ 2>/dev/null || true
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules

EXPOSE 3000
CMD ["npm","run","start"]