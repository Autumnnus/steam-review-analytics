# Steam Review Analytics — MVP İlerleme Planı

## Tech Stack

- **Runtime:** Bun
- **Framework:** Hono (API + SSR + Static serve — tek process)
- **UI:** HTMX + Hono JSX
- **Grafik:** Chart.js (CDN)
- **Stil:** Tailwind CSS (CDN)
- **Cache:** In-memory Map (TTL: 15dk)
- **Deploy:** Self-hosted, Docker

---

## Faz 1 — Proje Altyapısı

- [ ] Bun + Hono projesi oluştur (tek `package.json`)
- [ ] Steam API key al ve `.env`'e ekle
- [ ] Proje yapısını belirle (`/src/routes`, `/src/views`, `/src/services`)
- [ ] CORS ve logger middleware ekle

## Faz 2 — Steam API Entegrasyonu

- [ ] `/api/reviews/:appId` endpoint'i yaz
- [ ] Dil parametresi desteği (`?language=turkish,english,...`)
- [ ] TTL'li in-memory cache yaz (Map + setTimeout, 15dk)
- [ ] Steam API response'unu parse et
- [ ] Dil bazlı review sayısı (pozitif / negatif) hesapla
- [ ] Response DTO'su oluştur
- [ ] Hata yönetimi — geçersiz appId, API hatası, rate limit

## Faz 3 — UI (Hono JSX + HTMX)

- [ ] Ana sayfa layout'u — Hono JSX ile SSR
- [ ] Oyun arama input'u (appId)
- [ ] HTMX ile arama sonucu yükleme (sayfa yenilemeden)
- [ ] Loading ve error state'leri
- [ ] Tailwind ile temel stil (CDN)

## Faz 4 — Grafikler

- [ ] Chart.js CDN entegrasyonu
- [ ] Dil bazlı review dağılımı — Bar Chart
- [ ] Pozitif/Negatif oranı — Stacked Bar veya Pie Chart
- [ ] Dil bazlı ortalama skor — Horizontal Bar Chart
- [ ] Responsive tasarım

## Faz 5 — Polish & Deploy

- [ ] Oyun adı + kapak görseli göster (Steam Store API)
- [ ] Dark mode
- [ ] Dockerfile yaz (tek container)
- [ ] Self-hosted sunucuya deploy et

---

## MVP Kapsamı (Faz 1–4)

> Kullanıcı bir Steam appId girer, uygulama o oyunun review'larını dil bazlı istatistiklerle grafik olarak gösterir.
> Tek Bun process, tek container, minimum kaynak tüketimi.

## MVP Dışı (Sonra Eklenebilir)

- Oyun adıyla arama (autocomplete)
- Tarih bazlı review trendi
- Birden fazla oyun karşılaştırma
- Redis cache
- Kullanıcı favorileri
