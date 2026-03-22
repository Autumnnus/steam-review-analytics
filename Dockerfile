FROM oven/bun:1.3.10 AS base
WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends redis-server curl \
  && rm -rf /var/lib/apt/lists/*

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

COPY . .
RUN chmod +x /app/docker-entrypoint.sh

ENV NODE_ENV=production
ENV REDIS_URL=redis://127.0.0.1:6379
ENV PORT=3010
EXPOSE 3010

HEALTHCHECK --interval=3s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -fs http://localhost:${PORT:-3010}/health || exit 1

CMD ["/app/docker-entrypoint.sh"]
