# Steam Review Analytics

A Bun + Hono app that shows language-based review statistics for Steam games.

## Stack

- Bun
- Hono
- Hono JSX
- HTMX
- Tailwind CSS CDN
- Chart.js CDN
- In-memory TTL cache with optional Redis-backed persistence

## Setup

```bash
bun install
cp .env.example .env
```

Set these values in `.env` before running the app:

- `STEAM_API_KEY` for Steam review and store lookups
- `SITE_URL` for canonical URLs, `robots.txt`, and `sitemap.xml`
- `REDIS_URL` if you want to point at a remote Redis instance
- `PORT` if you want to change the default `3010`

## Run

```bash
bun run dev
```

The app runs at `http://localhost:3010` by default.

## Scripts

- `bun run dev` starts the app in hot-reload mode
- `bun run start` starts the app without hot reload
- `bun run typecheck` runs TypeScript type checking

## Endpoints

- `GET /` server-rendered home page
- `GET /analytics?appId=620` analytics fragment for the selected game
- `GET /api/reviews/620` JSON API
- `GET /api/cached-games` recent game cache
- `POST /api/cached-games` store a recent game
- `GET /search?term=portal` Steam autocomplete fragment
- `GET /robots.txt` crawler rules
- `GET /sitemap.xml` sitemap

## Cache Behavior

- Game details, language-based review summaries, search suggestions, and the full analytics result are cached for `1 hour` by default.
- Redis is used as the shared TTL cache when `REDIS_URL` is configured and reachable.
- If Redis is unavailable, the app falls back to in-memory TTL caching.
- Back-to-back requests for the same `appId` or the same `appId + language` do not trigger extra Steam API calls.
- Concurrent duplicate requests are coalesced through a single fetch promise.

## Docker

```bash
docker build -t steam-review-analytics .
docker run --rm -p 3010:3010 --env-file .env steam-review-analytics
```

The Docker image starts Redis and the Bun app in the same container, so no separate Redis service is required.
