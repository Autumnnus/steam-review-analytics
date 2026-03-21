import {
  CACHE_TTL_MS,
  LANGUAGE_ALIAS_TO_ID,
  LANGUAGE_LABELS,
  STEAM_LANGUAGE_DEFINITIONS,
  STORE_LANGUAGE,
} from "../config";
import type {
  GameDetails,
  LanguageReviewStats,
  ReviewAnalytics,
  SteamAppDetailsResponse,
  SteamReviewSummaryResponse,
} from "../types/steam";
import { TTLCache } from "./ttl-cache";

const reviewCache = new TTLCache<string, LanguageReviewStats>(CACHE_TTL_MS);
const gameCache = new TTLCache<string, GameDetails>(CACHE_TTL_MS);
const inFlightRequests = new Map<string, Promise<unknown>>();

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

const getGameDetails = async (appId: number): Promise<GameDetails> => {
  const cacheKey = `game:${appId}`;
  const cached = gameCache.get(cacheKey);
  if (cached) {
    return cached;
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

    return gameCache.set(cacheKey, {
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
    });
  });
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

    return reviewCache.set(cacheKey, {
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
    });
  });
};

export const getReviewAnalytics = async (
  appId: number,
): Promise<ReviewAnalytics> => {
  const game = await getGameDetails(appId);
  const languages = STEAM_LANGUAGE_DEFINITIONS.map((definition) => definition.id);
  const languageStats = await Promise.all(
    languages.map((language) => getLanguageReviewStats(appId, language)),
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

  return {
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
  };
};
