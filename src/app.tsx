/** @jsxImportSource hono/jsx */
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { jsxRenderer } from "hono/jsx-renderer";
import { APP_ORIGIN, SITE_URL, UMAMI_SCRIPT_URL, UMAMI_BASE_URL } from "./config";
import { apiRoutes } from "./routes/api";
import { pageRoutes } from "./routes/pages";
import { Layout } from "./views/layout";
import { createRateLimiter } from "./middleware/rate-limit";

export const app = new Hono();

// Analytics endpoints: max 10 requests/min per IP (each triggers ~30 Steam requests)
const analyticsRateLimit = createRateLimiter(10, 60_000);
// Search endpoint: max 30 requests/min per IP
const searchRateLimit = createRateLimiter(30, 60_000);

app.use(logger());
if (APP_ORIGIN) {
  app.use(
    "/api/reviews/*",
    cors({
      origin: APP_ORIGIN,
      allowMethods: ["GET"],
    }),
  );
}
app.use("/api/reviews/*", analyticsRateLimit);
app.use("/analytics", analyticsRateLimit);
app.use("/search", searchRateLimit);
app.use(
  "*",
  jsxRenderer(({ children }) => <Layout>{children}</Layout>),
);

app.get("/robots.txt", (c) => {
  const robots = `User-agent: *\nAllow: /\nSitemap: ${SITE_URL}/sitemap.xml\n`;
  return c.text(robots, 200, {
    "Content-Type": "text/plain; charset=utf-8",
    "Cache-Control": "public, max-age=3600",
  });
});

app.get("/sitemap.xml", (c) => {
  const lastmod = new Date().toISOString();
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${SITE_URL}/</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
</urlset>`;
  return c.body(sitemap, 200, {
    "Content-Type": "application/xml; charset=utf-8",
    "Cache-Control": "public, max-age=3600",
  });
});

// Umami proxy routes — serve script and collect endpoint from own domain to bypass ad blockers
if (UMAMI_SCRIPT_URL) {
  app.get("/ux/tracker.js", async (c) => {
    const res = await fetch(UMAMI_SCRIPT_URL);
    const body = await res.text();
    return c.text(body, 200, {
      "Content-Type": "application/javascript; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    });
  });
}
if (UMAMI_BASE_URL) {
  app.post("/api/send", async (c) => {
    const body = await c.req.text();
    const res = await fetch(`${UMAMI_BASE_URL}/api/send`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": c.req.header("user-agent") || "",
        "X-Forwarded-For":
          c.req.header("x-forwarded-for") ||
          c.req.header("x-real-ip") ||
          "",
      },
      body,
    });
    const responseBody = await res.text();
    return c.body(responseBody, res.status as any, {
      "Content-Type": res.headers.get("content-type") || "application/json",
    });
  });
}

app.route("/", pageRoutes);
app.route("/api", apiRoutes);
