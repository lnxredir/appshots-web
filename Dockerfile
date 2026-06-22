FROM node:20-bookworm-slim AS builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY tsconfig.json tsup.config.ts ./
COPY src ./src
RUN npm run build

WORKDIR /app/ui

COPY ui/package.json ui/package-lock.json ./
RUN npm ci

COPY ui/index.html ui/tsconfig.json ui/tsconfig.node.json ui/vite.config.ts ./
COPY ui/public ./public
COPY ui/server ./server
COPY ui/src ./src
RUN npm run build

FROM node:20-bookworm-slim AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8084
ENV HOST=0.0.0.0

COPY package.json package-lock.json ./
COPY --from=builder /app/dist ./dist
RUN npm ci --omit=dev

WORKDIR /app/ui

COPY ui/package.json ui/package-lock.json ./
COPY --from=builder /app/ui/dist ./dist
COPY ui/server ./server
RUN npm ci --omit=dev

EXPOSE 8084

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:' + (process.env.PORT || 8084) + '/api/devices').then((r) => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

CMD ["npm", "start"]
