# syntax=docker/dockerfile:1

########################
# Builder stage
########################
FROM node:20-slim AS builder

WORKDIR /app

# Copy configs & sources
COPY package*.json tsconfig.json ./
COPY src ./src

# Install deps (incl dev deps for TS)
RUN npm ci --silent

# 🔑 Generate Prisma Client for TypeScript
RUN npx prisma generate --schema=src/prisma/schema.prisma

# Build TypeScript
RUN npm run build

########################
# Production stage
########################
FROM node:20-slim

WORKDIR /app
ENV NODE_ENV=production

# Copy package metadata
COPY package*.json ./

# Install prod deps only
RUN npm ci --only=production --silent

# Copy build output & prisma schema
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/src/prisma ./prisma

# 🔑 Generate Prisma Client for runtime
RUN npx prisma generate --schema=prisma/schema.prisma

# Entrypoint
COPY docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x ./docker-entrypoint.sh

EXPOSE 5000

ENTRYPOINT ["sh", "/app/docker-entrypoint.sh"]
CMD ["node", "dist/server.js"]
