/** @jsxImportSource hono/jsx */
import { Hono } from "hono";
import type { Context } from "hono";
import { cors } from "hono/cors";
import { jsxRenderer } from "hono/jsx-renderer";
import { logger } from "hono/logger";
import {
  APP_ORIGIN,
  SITE_URL,
  UMAMI_BASE_URL,
  UMAMI_DEBUG_HEADERS,
  UMAMI_SCRIPT_URL,
} from "./config";
import { createRateLimiter } from "./middleware/rate-limit";
import { apiRoutes } from "./routes/api";
import { pageRoutes } from "./routes/pages";
import { Layout } from "./views/layout";

export const app = new Hono();

const resolveClientIp = (c: Context) => {
  const cfConnectingIp = (c.req.header("cf-connecting-ip") || "").trim();
  if (cfConnectingIp) return cfConnectingIp;

  const trueClientIp = (c.req.header("true-client-ip") || "").trim();
  if (trueClientIp) return trueClientIp;

  const xRealIp = (c.req.header("x-real-ip") || "").trim();
  if (xRealIp) return xRealIp;

  const xForwardedFor = (c.req.header("x-forwarded-for") || "")
    .split(",")
    .map((value: string) => value.trim())
    .filter(Boolean);
  return xForwardedFor[0] || "";
};

const copyHeaderIfPresent = (
  c: Context,
  sourceHeader: string,
  targetHeaders: Record<string, string>,
  targetHeader = sourceHeader,
) => {
  const value = (c.req.header(sourceHeader) || "").trim();
  if (value) {
    targetHeaders[targetHeader] = value;
  }
};

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
    try {
      const res = await fetch(UMAMI_SCRIPT_URL);
      const body = await res.text();
      return c.body(body, res.status as any, {
        "Content-Type":
          res.headers.get("content-type") ||
          "application/javascript; charset=utf-8",
        "Cache-Control": res.ok ? "public, max-age=3600" : "no-store",
      });
    } catch (_) {
      return c.text("Unable to load Umami tracker script.", 502);
    }
  });
}
if (UMAMI_BASE_URL) {
  app.post("/api/x", async (c) => {
    const body = await c.req.text();
    const clientIp = resolveClientIp(c);
    const incomingXForwardedFor = c.req.header("x-forwarded-for") || "";
    const forwardedForHeader = incomingXForwardedFor || clientIp;
    const proxyHeaders: Record<string, string> = {
      "Content-Type": "application/json",
      "User-Agent": c.req.header("user-agent") || "",
    };

    if (forwardedForHeader) {
      proxyHeaders["X-Forwarded-For"] = forwardedForHeader;
    }
    if (clientIp) {
      proxyHeaders["X-Real-IP"] = clientIp;
      proxyHeaders["CF-Connecting-IP"] = clientIp;
    }

    copyHeaderIfPresent(c, "cf-ipcountry", proxyHeaders, "CF-IPCountry");
    copyHeaderIfPresent(c, "cf-region-code", proxyHeaders, "CF-RegionCode");
    copyHeaderIfPresent(c, "cf-ipcity", proxyHeaders, "CF-IPCity");
    copyHeaderIfPresent(c, "x-forwarded-host", proxyHeaders, "X-Forwarded-Host");
    copyHeaderIfPresent(
      c,
      "x-forwarded-proto",
      proxyHeaders,
      "X-Forwarded-Proto",
    );

    if (UMAMI_DEBUG_HEADERS) {
      console.log(
        "[umami-proxy]",
        JSON.stringify({
          resolvedClientIp: clientIp || null,
          incoming: {
            cfConnectingIp: c.req.header("cf-connecting-ip") || null,
            trueClientIp: c.req.header("true-client-ip") || null,
            xRealIp: c.req.header("x-real-ip") || null,
            xForwardedFor: c.req.header("x-forwarded-for") || null,
            cfIpCountry: c.req.header("cf-ipcountry") || null,
            cfRegionCode: c.req.header("cf-region-code") || null,
            cfIpCity: c.req.header("cf-ipcity") || null,
          },
          forwarded: {
            xForwardedFor: proxyHeaders["X-Forwarded-For"] || null,
            xRealIp: proxyHeaders["X-Real-IP"] || null,
            cfConnectingIp: proxyHeaders["CF-Connecting-IP"] || null,
            cfIpCountry: proxyHeaders["CF-IPCountry"] || null,
            cfRegionCode: proxyHeaders["CF-RegionCode"] || null,
            cfIpCity: proxyHeaders["CF-IPCity"] || null,
          },
        }),
      );
    }

    const res = await fetch(`${UMAMI_BASE_URL}/api/x`, {
      method: "POST",
      headers: proxyHeaders,
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
