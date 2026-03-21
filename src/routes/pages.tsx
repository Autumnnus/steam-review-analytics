/** @jsxImportSource hono/jsx */
import { Hono } from "hono";
import { DEFAULT_SELECTED_LANGUAGE_IDS } from "../config";
import { getReviewAnalytics, parseAppId, SteamServiceError } from "../services/steam";
import { HomePage } from "../views/home-page";
import { ErrorState, ReviewResults } from "../views/review-results";

export const pageRoutes = new Hono();

pageRoutes.get("/", (c) => {
  return c.render(<HomePage initialAppId="620" selectedLanguages={[...DEFAULT_SELECTED_LANGUAGE_IDS]} />);
});

pageRoutes.get("/analytics", async (c) => {
  try {
    const rawAppId = c.req.query("appId") ?? "";
    const appId = parseAppId(rawAppId);
    const analytics = await getReviewAnalytics(appId);
    return c.html(<ReviewResults analytics={analytics} />);
  } catch (error) {
    const message =
      error instanceof SteamServiceError ? error.message : "Something went wrong. Please try again.";
    const status = error instanceof SteamServiceError ? error.status : 500;
    return c.html(<ErrorState message={message} />, { status: status as 400 | 404 | 429 | 500 | 502 | 504 });
  }
});
