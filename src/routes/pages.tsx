/** @jsxImportSource hono/jsx */
import { Hono } from "hono";
import { BROWSER_LOCALE_TO_STEAM_LANGUAGE, DEFAULT_SELECTED_LANGUAGE_IDS } from "../config";
import {
  getCachedGames,
  getReviewAnalytics,
  parseAppId,
  searchSteamApps,
  SteamServiceError,
} from "../services/steam";
import { HomePage } from "../views/home-page";
import { ErrorState, ReviewResults } from "../views/review-results";
import { SearchSuggestions } from "../views/search-suggestions";

export const pageRoutes = new Hono();

function getBrowserLanguageId(acceptLanguage: string | undefined): string | null {
  if (!acceptLanguage) return null;
  const locales = acceptLanguage
    .split(",")
    .map((part) => part.split(";")[0]?.trim().toLowerCase() ?? "")
    .filter(Boolean);
  for (const locale of locales) {
    const directMatch = BROWSER_LOCALE_TO_STEAM_LANGUAGE[locale];
    if (directMatch) {
      return directMatch;
    }
    const base = locale.split("-")[0] ?? "";
    const baseMatch = BROWSER_LOCALE_TO_STEAM_LANGUAGE[base];
    if (baseMatch) {
      return baseMatch;
    }
  }
  return null;
}

pageRoutes.get("/", async (c) => {
  const selectedLanguages: string[] = [...DEFAULT_SELECTED_LANGUAGE_IDS];
  const browserLangId = getBrowserLanguageId(c.req.header("Accept-Language"));
  if (browserLangId && !selectedLanguages.includes(browserLangId)) {
    selectedLanguages.push(browserLangId);
  }
  return c.render(
    <HomePage
      initialAppId="620"
      selectedLanguages={selectedLanguages}
      cachedGames={await getCachedGames()}
    />,
  );
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

pageRoutes.get("/search", async (c) => {
  try {
    const query = c.req.query("term") ?? "";
    const suggestions = await searchSteamApps(query);
    return c.html(<SearchSuggestions query={query} suggestions={suggestions} />);
  } catch (error) {
    const message =
      error instanceof SteamServiceError
        ? error.message
        : "Search suggestions could not be loaded.";
    return c.html(
      <div class="rounded-2xl border border-dashed border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
        {message}
      </div>,
      { status: 502 },
    );
  }
});
