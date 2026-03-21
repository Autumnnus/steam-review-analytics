import { Hono } from "hono";
import {
  getCachedGames,
  getReviewAnalytics,
  parseAppId,
  rememberSelectedGame,
  SteamServiceError,
} from "../services/steam";

export const apiRoutes = new Hono();

const sanitizeGameName = (value: string) =>
  value
    .replace(/[<>`"'\\]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120);

apiRoutes.get("/reviews/:appId", async (c) => {
  try {
    const appId = parseAppId(c.req.param("appId"));
    const analytics = await getReviewAnalytics(appId);
    return c.json(analytics);
  } catch (error) {
    if (error instanceof SteamServiceError) {
      return c.json({ error: error.message }, { status: error.status as 400 | 404 | 429 | 502 | 504 });
    }

    return c.json({ error: "Something went wrong." }, { status: 500 });
  }
});

apiRoutes.get("/cached-games", async (c) => {
  try {
    return c.json(await getCachedGames());
  } catch {
    return c.json({ error: "Cached games could not be loaded." }, { status: 500 });
  }
});

apiRoutes.post("/cached-games", async (c) => {
  try {
    const payload = await c.req.json();
    const appId = parseAppId(String(payload.appId ?? ""));
    const name = sanitizeGameName(String(payload.name ?? ""));
    const imageUrl = String(payload.imageUrl ?? "").trim();

    if (!name) {
      return c.json({ error: "Game name is required." }, { status: 400 });
    }

    const game = await rememberSelectedGame({
      appId,
      name,
      imageUrl,
      steamUrl: `https://store.steampowered.com/app/${appId}`,
    });

    return c.json(game, { status: 201 });
  } catch (error) {
    if (error instanceof SteamServiceError) {
      return c.json({ error: error.message }, { status: error.status as 400 | 404 | 429 | 502 | 504 });
    }

    return c.json({ error: "Cached game could not be saved." }, { status: 500 });
  }
});
