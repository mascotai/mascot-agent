# Stage 1: Builder
# This stage installs all dependencies (including dev) and builds the application.
FROM node:23.3.0-slim AS builder

WORKDIR /app

# Install system dependencies required for the build
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    build-essential curl ffmpeg g++ git make python3 unzip && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Install bun and the elizaos CLI
RUN npm install -g bun @elizaos/cli@latest
RUN ln -s /usr/bin/python3 /usr/bin/python

# Copy dependency definition files first to leverage Docker cache
COPY package.json bun.lock bunfig.toml tsconfig.json tsconfig.build.json tsup.config.ts ./

# Copy local plugins before installing dependencies
COPY plugins ./plugins

# Install ALL dependencies, including devDependencies needed for the build
RUN bun install

# Copy the rest of the source code
COPY . .

# Build the main project, creating the /app/dist directory
RUN bun run build


# Stage 2: Runner
# This stage creates the final, small production image.
FROM node:23.3.0-slim

WORKDIR /app

# Install only the system dependencies required for running the app
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    curl ffmpeg git python3 unzip && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Install bun and the elizaos CLI
RUN npm install -g bun@1.2.5 @elizaos/cli@latest

# Copy dependency definitions
COPY --from=builder /app/package.json ./
COPY --from=builder /app/bun.lock* ./

# Copy the local plugin source for linking
COPY --from=builder /app/plugins ./plugins

# Install ONLY production dependencies and do NOT run any build scripts
RUN bun install --production

# Copy the compiled application code from the builder stage
COPY --from=builder /app/dist ./dist

ENV NODE_ENV=production

# Health check using standard ElizaOS pattern
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

EXPOSE 3000
EXPOSE 50000-50100/udp

# Use ElizaOS CLI for production start. It will run the code from the "dist" directory.
CMD ["elizaos", "start", "--port", "3000"]
