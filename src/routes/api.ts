import { Hono } from "hono";
import { getReviewAnalytics, parseAppId, SteamServiceError } from "../services/steam";

export const apiRoutes = new Hono();

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
