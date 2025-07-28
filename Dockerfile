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

RUN npm install -g bun @elizaos/cli@latest

RUN ln -s /usr/bin/python3 /usr/bin/python

COPY package.json bun.lock bunfig.toml tsconfig.json tsconfig.build.json tsup.config.ts ./
COPY plugins ./plugins

RUN bun install

COPY tsconfig.build.json ./
COPY . .

# Build the main project
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
COPY --from=builder /app/bun.lock* ./
COPY --from=builder /app/tsconfig.json ./
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/src ./src
COPY --from=builder /app/plugins ./plugins

# Install dependencies to recreate symlinks for local plugins
RUN bun install

ENV NODE_ENV=production

# Health check using standard ElizaOS pattern
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

EXPOSE 3000
EXPOSE 50000-50100/udp

# Use ElizaOS CLI for production start with project and explicit port
CMD ["elizaos", "start", "--port", "3000"]

