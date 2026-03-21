# steam-review-analytics

Steam oyunlari icin dil bazli review istatistiklerini gosteren hafif bir Bun + Hono uygulamasi.

## Stack

- Bun
- Hono
- Hono JSX + HTMX
- Chart.js CDN
- Tailwind CSS CDN
- TTL cache with persisted analytics snapshots

## Kurulum

```bash
bun install
cp .env.example .env
```

## Calistirma

```bash
bun run dev
```

Uygulama varsayilan olarak `http://localhost:3000` adresinde acilir.

## Endpointler

- `GET /` SSR ana sayfa
- `GET /analytics?appId=620&language=english&language=turkish` HTMX sonuc parcasi
- `GET /api/reviews/620?language=english,turkish` JSON API

## Cache davranisi

- Oyun detaylari, dil bazli review ozetleri ve tam analytics sonucu `1 saat` tutulur.
- Tam analytics sonucu diskte de saklanir; uygulama yeniden baslasa da TTL dolmadiysa Steam'e tekrar gitmeden kullanilabilir.
- Ayni `appId` veya ayni `appId + dil` icin pes pese gelen isteklerde Steam API tekrar cagrilmaz.
- Eszamanli duplicate istekler tek bir fetch promise'i uzerinden birlestirilir.

## Docker

```bash
docker build -t steam-review-analytics .
docker run --rm -p 3000:3000 --env-file .env steam-review-analytics
```
