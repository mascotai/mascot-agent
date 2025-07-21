FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN bun install --production

COPY . .

# The healthcheck endpoint needs to be implemented in the agent first
# HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
#   CMD node healthcheck.js

EXPOSE 8443

CMD ["bun", "start"]

