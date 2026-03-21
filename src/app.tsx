/** @jsxImportSource hono/jsx */
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { jsxRenderer } from "hono/jsx-renderer";
import { APP_ORIGIN } from "./config";
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

app.route("/", pageRoutes);
app.route("/api", apiRoutes);
