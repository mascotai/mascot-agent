FROM node:23.3.0-slim AS builder

WORKDIR /app

RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    ffmpeg \
    g++ \
    git \
    make \
    python3 \
    unzip && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

RUN npm install -g bun@1.2.5 @elizaos/cli@latest

RUN ln -s /usr/bin/python3 /usr/bin/python

COPY package.json bun.lock* bunfig.toml* tsconfig.json* ./
COPY plugins/plugin-connections/package.json ./plugins/plugin-connections/

RUN SKIP_POSTINSTALL=1 bun install --no-cache

COPY . .

RUN bun run build

FROM node:23.3.0-slim

WORKDIR /app

RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    curl \
    ffmpeg \
    git \
    python3 \
    unzip && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

RUN npm install -g bun@1.2.5 @elizaos/cli@latest

COPY --from=builder /app/package.json ./
COPY --from=builder /app/tsconfig.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/characters ./characters
COPY --from=builder /app/src ./src

ENV NODE_ENV=production

# Health check using standard ElizaOS pattern
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

EXPOSE 3000
EXPOSE 50000-50100/udp

# Use ElizaOS CLI for production start with production character and explicit port
CMD ["elizaos", "start", "--character", "characters/production.json", "--port", "3000"]

