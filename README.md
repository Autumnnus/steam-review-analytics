# steam-review-analytics

A lightweight Bun + Hono app that shows language-based review statistics for Steam games.

## Stack

- Bun
- Hono
- Hono JSX + HTMX
- Chart.js CDN
- Tailwind CSS CDN
- TTL cache with persisted analytics snapshots

## Setup

```bash
bun install
cp .env.example .env
```

Set `SITE_URL` in `.env` to your production domain (for canonical, sitemap, and social tags).

## Run

```bash
bun run dev
```

The app runs at `http://localhost:3010` by default.

## Endpoints

- `GET /` SSR home page
- `GET /analytics?appId=620&language=english&language=turkish` HTMX result fragment
- `GET /api/reviews/620?language=english,turkish` JSON API
- `GET /robots.txt` crawler rules
- `GET /sitemap.xml` sitemap

## Cache Behavior

- Game details, language-based review summaries, and the full analytics result are cached for `1 hour`.
- Redis is used as the shared TTL cache when `REDIS_URL` is configured.
- If Redis is unavailable, the app falls back to in-memory TTL caching (no disk cache).
- Back-to-back requests for the same `appId` or the same `appId + language` do not trigger extra Steam API calls.
- Concurrent duplicate requests are coalesced through a single fetch promise.

## Docker

```bash
docker build -t steam-review-analytics .
docker run --rm -p 3010:3010 --env-file .env steam-review-analytics
```

The Docker image starts both Redis and the Bun app in the same container, so no extra Redis service is required in Coolify.

## SEO Deployment Checklist

- Verify the site in Google Search Console.
- Submit `https://yourdomain.com/sitemap.xml` in Search Console.
- Choose one canonical domain strategy (`www` or non-`www`) and redirect the other.
- Request indexing for the home page after deployment.

## Support

For support, visit: https://github.com/Autumnnus/steam-review-analytics
