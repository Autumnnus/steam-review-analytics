/** @jsxImportSource hono/jsx */
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { jsxRenderer } from "hono/jsx-renderer";
import { apiRoutes } from "./routes/api";
import { pageRoutes } from "./routes/pages";
import { Layout } from "./views/layout";

export const app = new Hono();

app.use(logger());
app.use("/api/*", cors());
app.use(
  "*",
  jsxRenderer(({ children }) => <Layout>{children}</Layout>),
);

app.route("/", pageRoutes);
app.route("/api", apiRoutes);
