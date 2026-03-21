FROM oven/bun:1.3.10 AS base
WORKDIR /app

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

COPY . .

ENV NODE_ENV=production
EXPOSE 3010

CMD ["bun", "run", "index.ts"]
