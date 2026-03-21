import {
  CACHE_TTL_MS,
  LANGUAGE_ALIAS_TO_ID,
  LANGUAGE_LABELS,
  STEAM_LANGUAGE_DEFINITIONS,
  STORE_LANGUAGE,
} from "../config";
import type {
  CachedGame,
  GameDetails,
  LanguageReviewStats,
  ReviewAnalytics,
  SteamAppDetailsResponse,
  SteamReviewSummaryResponse,
  SteamSearchSuggestion,
  SteamStoreSearchResponse,
} from "../types/steam";
import { getCachedJson, setCachedJson } from "./redis-cache";
import { TTLCache } from "./ttl-cache";

const withConcurrencyLimit = async <T>(
  tasks: (() => Promise<T>)[],
  limit: number,
): Promise<T[]> => {
  const results: T[] = new Array(tasks.length);
  let index = 0;

  const worker = async () => {
    while (index < tasks.length) {
      const taskIndex = index++;
      results[taskIndex] = await tasks[taskIndex]!();
    }
  };

  await Promise.all(Array.from({ length: Math.min(limit, tasks.length) }, worker));
  return results;
};

const reviewCache = new TTLCache<string, LanguageReviewStats>(CACHE_TTL_MS);
const gameCache = new TTLCache<string, GameDetails>(CACHE_TTL_MS);
const searchCache = new TTLCache<string, SteamSearchSuggestion[]>(CACHE_TTL_MS);
const analyticsCache = new TTLCache<string, ReviewAnalytics>(CACHE_TTL_MS);
const inFlightRequests = new Map<string, Promise<unknown>>();
const MAX_RECENT_GAMES = 10;
const RECENT_GAMES_CACHE_KEY = "recent-games";

const fetchJson = async <T>(url: string): Promise<T> => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8_000);

  try {
    const response = await fetch(url, {
      headers: {
        Accept: "application/json",
        "User-Agent": "steam-review-analytics/1.0",
      },
      signal: controller.signal,
    });

    if (response.status === 429) {
      throw new SteamServiceError(
        429,
        "Steam rate-limited the request. Please try again shortly.",
      );
    }

    if (!response.ok) {
      throw new SteamServiceError(
        502,
        `Steam returned an unexpected status code: ${response.status}`,
      );
    }

    return (await response.json()) as T;
  } catch (error) {
    if (error instanceof SteamServiceError) {
      throw error;
    }

    if (error instanceof DOMException && error.name === "AbortError") {
      throw new SteamServiceError(
        504,
        "Steam timed out while loading the data.",
      );
    }

    throw new SteamServiceError(502, "Steam data could not be loaded.");
  } finally {
    clearTimeout(timeout);
  }
};

const dedupe = async <T>(key: string, loader: () => Promise<T>): Promise<T> => {
  const existing = inFlightRequests.get(key);
  if (existing) {
    return existing as Promise<T>;
  }

  const pending = loader().finally(() => {
    inFlightRequests.delete(key);
  });

  inFlightRequests.set(key, pending);
  return pending;
};

const titleCase = (value: string) =>
  value
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((part) => part[0]?.toUpperCase() + part.slice(1))
    .join(" ");

const normalizeLanguage = (value: string) => value.trim().toLowerCase();
const normalizeLanguageAlias = (value: string) =>
  normalizeLanguage(value).replace(/\*/g, "").replace(/\s+/g, " ").trim();
const sanitizeStoreText = (value: string) =>
  value
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();

const unique = <T>(values: T[]) => [...new Set(values)];

const toCachedGame = (
  value: Pick<GameDetails, "appId" | "name" | "steamUrl" | "capsuleImage">,
): CachedGame => ({
  appId: value.appId,
  name: value.name,
  steamUrl: value.steamUrl,
  imageUrl: value.capsuleImage,
  lastViewedAt: new Date().toISOString(),
});

const compareByLastViewed = (left: CachedGame, right: CachedGame) =>
  new Date(right.lastViewedAt).getTime() - new Date(left.lastViewedAt).getTime();

const sanitizeCachedGame = (value: CachedGame): CachedGame | null => {
  if (!value || !Number.isInteger(value.appId) || value.appId <= 0 || !value.name) {
    return null;
  }

  return {
    ...value,
    lastViewedAt:
      typeof value.lastViewedAt === "string" && value.lastViewedAt
        ? value.lastViewedAt
        : new Date(0).toISOString(),
  };
};

const readRecentGames = async (): Promise<CachedGame[]> => {
  const games = (await getCachedJson<CachedGame[]>(RECENT_GAMES_CACHE_KEY)) ?? [];
  const normalized = games
    .map(sanitizeCachedGame)
    .filter((game): game is CachedGame => Boolean(game));

  return normalized
    .slice(-MAX_RECENT_GAMES)
    .sort(compareByLastViewed);
};

const rememberCachedGame = async (game: CachedGame): Promise<CachedGame> => {
  const current = await readRecentGames();
  const next: CachedGame[] = [
    { ...game, lastViewedAt: new Date().toISOString() },
    ...current.filter((item) => item.appId !== game.appId),
  ]
    .sort(compareByLastViewed)
    .slice(0, MAX_RECENT_GAMES);

  await setCachedJson(RECENT_GAMES_CACHE_KEY, next);
  return next[0]!;
};

const rememberAnalytics = async (analytics: ReviewAnalytics): Promise<ReviewAnalytics> => {
  await setCachedJson(`analytics:${analytics.appId}`, analytics);
  analyticsCache.set(`analytics:${analytics.appId}`, analytics);
  return analytics;
};

const parseSupportedLanguageIds = (value: string): string[] => {
  const normalized = sanitizeStoreText(value)
    .split(",")
    .map(normalizeLanguageAlias)
    .map((token) => LANGUAGE_ALIAS_TO_ID.get(token))
    .filter((languageId): languageId is string => Boolean(languageId));

  return unique(normalized);
};


const toLanguageLabel = (language: string) =>
  LANGUAGE_LABELS.get(language) ?? titleCase(language);

export class SteamServiceError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "SteamServiceError";
  }
}

export const parseAppId = (value: string): number => {
  const appId = Number(value);

  if (!Number.isInteger(appId) || appId <= 0) {
    throw new SteamServiceError(400, "Please enter a valid Steam app ID.");
  }

  return appId;
};

export const searchSteamApps = async (
  term: string,
): Promise<SteamSearchSuggestion[]> => {
  const normalizedTerm = term.trim();
  if (normalizedTerm.length < 2) {
    return [];
  }

  const cacheKey = `search:${normalizedTerm.toLowerCase()}`;
  const cached = searchCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const redisCached = await getCachedJson<SteamSearchSuggestion[]>(cacheKey);
  if (redisCached) {
    return searchCache.set(cacheKey, redisCached);
  }

  return dedupe(cacheKey, async () => {
    const response = await fetchJson<SteamStoreSearchResponse>(
      `https://store.steampowered.com/api/storesearch/?term=${encodeURIComponent(normalizedTerm)}&l=${STORE_LANGUAGE}&cc=US`,
    );

    const suggestions = (response.items ?? [])
      .filter(
        (
          item,
        ): item is {
          id: number;
          name: string;
          tiny_image?: string;
          type?: string;
        } => Boolean(item.id && item.name),
      )
      .slice(0, 8)
      .map((item) => ({
        appId: item.id,
        name: item.name,
        imageUrl: item.tiny_image ?? "",
        type: item.type ?? "app",
      }));

    await setCachedJson(cacheKey, suggestions);
    return searchCache.set(cacheKey, suggestions);
  });
};

const getGameDetails = async (appId: number): Promise<GameDetails> => {
  const cacheKey = `game:${appId}`;
  const cached = gameCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const redisCached = await getCachedJson<GameDetails>(cacheKey);
  if (redisCached) {
    return gameCache.set(cacheKey, redisCached);
  }

  return dedupe(cacheKey, async () => {
    const response = await fetchJson<SteamAppDetailsResponse>(
      `https://store.steampowered.com/api/appdetails?appids=${appId}&l=${STORE_LANGUAGE}`,
    );

    const appInfo = response[String(appId)];
    if (!appInfo?.success || !appInfo.data?.name) {
      throw new SteamServiceError(
        404,
        "No Steam Store entry was found for this app ID.",
      );
    }

    const supportedLanguagesRaw = appInfo.data.supported_languages ?? "";
    const supportedLanguageIds = parseSupportedLanguageIds(
      supportedLanguagesRaw,
    );

    const gameDetails = {
      appId,
      name: appInfo.data.name,
      shortDescription: sanitizeStoreText(appInfo.data.short_description ?? ""),
      supportedLanguages: sanitizeStoreText(supportedLanguagesRaw),
      supportedLanguageIds:
        supportedLanguageIds.length > 0
          ? supportedLanguageIds
          : STEAM_LANGUAGE_DEFINITIONS.map((definition) => definition.id),
      headerImage: appInfo.data.header_image ?? "",
      capsuleImage:
        appInfo.data.capsule_image ?? appInfo.data.header_image ?? "",
      steamUrl: `https://store.steampowered.com/app/${appId}`,
    };

    await setCachedJson(cacheKey, gameDetails);
    return gameCache.set(cacheKey, gameDetails);
  });
};

export const rememberSelectedGame = async (
  game: Omit<CachedGame, "lastViewedAt">,
): Promise<CachedGame> =>
  rememberCachedGame({
    ...game,
    lastViewedAt: new Date().toISOString(),
  });

export const getCachedGames = async (): Promise<CachedGame[]> => {
  const recentGames = await readRecentGames();
  for (const game of gameCache.values()) {
    const existing = recentGames.find((item) => item.appId === game.appId);
    recentGames.push({
      ...toCachedGame(game),
      lastViewedAt: existing?.lastViewedAt ?? new Date().toISOString(),
    });
  }

  if (gameCache.values().length > 0) {
    const deduped = [...new Map(recentGames.map((g) => [g.appId, g])).values()]
      .sort(compareByLastViewed)
      .slice(0, MAX_RECENT_GAMES);
    await setCachedJson(RECENT_GAMES_CACHE_KEY, deduped);
    return deduped;
  }

  return recentGames.sort(compareByLastViewed).slice(0, MAX_RECENT_GAMES);
};

const getLanguageReviewStats = async (
  appId: number,
  language: string,
): Promise<LanguageReviewStats> => {
  const cacheKey = `review:${appId}:${language}`;
  const cached = reviewCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const redisCached = await getCachedJson<LanguageReviewStats>(cacheKey);
  if (redisCached) {
    return reviewCache.set(cacheKey, redisCached);
  }

  return dedupe(cacheKey, async () => {
    const response = await fetchJson<SteamReviewSummaryResponse>(
      `https://store.steampowered.com/appreviews/${appId}?json=1&language=${encodeURIComponent(language)}&purchase_type=all&review_type=all&num_per_page=20&filter=all&day_range=365`,
    );

    if (response.success !== 1 || !response.query_summary) {
      throw new SteamServiceError(
        502,
        "Steam review data could not be parsed.",
      );
    }

    const totalReviews = response.query_summary.total_reviews ?? 0;
    const positive = response.query_summary.total_positive ?? 0;
    const negative = response.query_summary.total_negative ?? 0;

    const stats = {
      language,
      label: toLanguageLabel(language),
      reviewScore: response.query_summary.review_score ?? 0,
      reviewScoreLabel:
        response.query_summary.review_score_desc ?? "No user reviews",
      positive,
      negative,
      totalReviews,
      positiveRatio:
        totalReviews === 0
          ? 0
          : Number(((positive / totalReviews) * 100).toFixed(1)),
    };

    await setCachedJson(cacheKey, stats);
    return reviewCache.set(cacheKey, stats);
  });
};

export const getReviewAnalytics = async (
  appId: number,
): Promise<ReviewAnalytics> => {
  const analyticsCacheKey = `analytics:${appId}`;
  const cachedAnalytics = analyticsCache.get(analyticsCacheKey);
  if (cachedAnalytics) {
    return cachedAnalytics;
  }

  const redisCached = await getCachedJson<ReviewAnalytics>(analyticsCacheKey);
  if (redisCached) {
    return analyticsCache.set(analyticsCacheKey, redisCached);
  }

  const game = await getGameDetails(appId);
  await rememberCachedGame(toCachedGame(game));
  const languages = STEAM_LANGUAGE_DEFINITIONS.map((definition) => definition.id);
  const languageStats = await withConcurrencyLimit(
    languages.map((language) => () => getLanguageReviewStats(appId, language)),
    5,
  );

  const sortedStats = [...languageStats].sort(
    (left, right) => right.totalReviews - left.totalReviews,
  );
  const totals = sortedStats.reduce(
    (accumulator, stats) => {
      accumulator.positive += stats.positive;
      accumulator.negative += stats.negative;
      accumulator.totalReviews += stats.totalReviews;
      return accumulator;
    },
    { positive: 0, negative: 0, totalReviews: 0 },
  );

  return rememberAnalytics({
    appId,
    fetchedAt: new Date().toISOString(),
    selectedLanguages: languages,
    game,
    totals: {
      ...totals,
      positiveRatio:
        totals.totalReviews === 0
          ? 0
          : Number(((totals.positive / totals.totalReviews) * 100).toFixed(1)),
    },
    languages: sortedStats,
  });
};
