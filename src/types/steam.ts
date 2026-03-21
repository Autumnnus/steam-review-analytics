export type SteamReviewSummaryResponse = {
  success: number;
  query_summary?: {
    review_score?: number;
    review_score_desc?: string;
    total_positive?: number;
    total_negative?: number;
    total_reviews?: number;
  };
};

export type SteamAppDetailsResponse = Record<
  string,
  {
    success: boolean;
    data?: {
      name?: string;
      steam_appid?: number;
      short_description?: string;
      supported_languages?: string;
      header_image?: string;
      capsule_image?: string;
    };
  }
>;

export type SteamStoreSearchResponse = {
  items?: Array<{
    id?: number;
    name?: string;
    tiny_image?: string;
    type?: string;
  }>;
};

export type SteamSearchSuggestion = {
  appId: number;
  name: string;
  imageUrl: string;
  type: string;
};

export type CachedGame = {
  appId: number;
  name: string;
  steamUrl: string;
  imageUrl: string;
  lastViewedAt: string;
};

export type GameDetails = {
  appId: number;
  name: string;
  shortDescription: string;
  supportedLanguages: string;
  supportedLanguageIds: string[];
  headerImage: string;
  capsuleImage: string;
  steamUrl: string;
};

export type LanguageReviewStats = {
  language: string;
  label: string;
  reviewScore: number;
  reviewScoreLabel: string;
  positive: number;
  negative: number;
  totalReviews: number;
  positiveRatio: number;
};

export type ReviewAnalytics = {
  appId: number;
  fetchedAt: string;
  selectedLanguages: string[];
  game: GameDetails;
  totals: {
    positive: number;
    negative: number;
    totalReviews: number;
    positiveRatio: number;
  };
  languages: LanguageReviewStats[];
};
