/** @jsxImportSource hono/jsx */
import {
  DEFAULT_SELECTED_LANGUAGE_IDS,
  STEAM_LANGUAGE_DEFINITIONS,
} from "../config";
import type { ReviewAnalytics } from "../types/steam";

const formatNumber = new Intl.NumberFormat("en-US");
const formatDateTime = new Intl.DateTimeFormat("en-US", {
  dateStyle: "short",
  timeStyle: "short",
});

const safeJsonForScript = (value: unknown) =>
  JSON.stringify(value)
    .replace(/</g, "\\u003c")
    .replace(/<\/script/gi, "<\\/script");

const truncateDescription = (text: string | undefined, maxLength = 180) => {
  if (!text) return "No short Steam description is available for this game.";
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength).trimEnd()}...`;
};

type ReviewResultsProps = {
  analytics: ReviewAnalytics;
};

export const ReviewResults = ({ analytics }: ReviewResultsProps) => {
  const scopeId = `review-${analytics.appId}`;
  const chartHeight = Math.max(280, DEFAULT_SELECTED_LANGUAGE_IDS.length * 30);
  const themeImage = analytics.game.headerImage || analytics.game.capsuleImage;
  const payload = safeJsonForScript({
    totals: analytics.totals,
    languages: analytics.languages,
  });
  const languageMap = new Map(
    analytics.languages.map((language) => [language.language, language]),
  );
  const sortedDefinitions = [...STEAM_LANGUAGE_DEFINITIONS].sort((a, b) => {
    const la = languageMap.get(a.id);
    const lb = languageMap.get(b.id);
    const hasA = la && la.totalReviews > 0;
    const hasB = lb && lb.totalReviews > 0;
    if (!hasA && !hasB) return 0;
    if (!hasA) return 1;
    if (!hasB) return -1;
    if (lb!.totalReviews !== la!.totalReviews)
      return lb!.totalReviews - la!.totalReviews;
    return lb!.positiveRatio - la!.positiveRatio;
  });
  const langWithData = analytics.languages.filter((l) => l.totalReviews > 0);
  const maxRatioVal = langWithData.length
    ? Math.max(...langWithData.map((l) => l.positive / l.totalReviews))
    : -1;
  const maxReviewsVal = langWithData.length
    ? Math.max(...langWithData.map((l) => l.totalReviews))
    : -1;

  return (
    <div
      class="space-y-6"
      data-review-scope={scopeId}
      data-review-payload={payload}
    >
      <section class="relative overflow-hidden rounded-[2rem] border border-white/10 shadow-panel">
        {themeImage ? (
          <div
            class="absolute inset-0 scale-105 bg-cover bg-center opacity-35 blur-2xl"
            style={`background-image:url('${themeImage}')`}
          />
        ) : null}
        <div class="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.18),transparent_28rem),radial-gradient(circle_at_top_right,rgba(249,115,22,0.22),transparent_30rem),linear-gradient(135deg,rgba(9,10,12,0.82),rgba(15,18,24,0.9))]" />
        <div class="grid gap-0 lg:grid-cols-[1.2fr,0.8fr]">
          <div class="relative space-y-5 p-5 sm:p-6">
            <div class="flex flex-col items-start gap-4 sm:flex-row">
              <img
                src={analytics.game.capsuleImage || analytics.game.headerImage}
                alt={analytics.game.name}
                class="h-24 w-full rounded-2xl object-cover ring-1 ring-white/10 sm:max-w-48"
              />
              <div class="w-full min-w-0 flex-1 space-y-3">
                <div class="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 font-mono text-xs uppercase tracking-[0.24em] text-mist/60">
                  app/{analytics.appId}
                </div>
                <h2 class="text-balance break-words text-2xl font-bold leading-tight text-white sm:text-3xl">
                  {analytics.game.name}
                </h2>
                <p class="max-w-2xl overflow-hidden text-ellipsis break-words text-sm leading-6 text-mist/75 [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:3]">
                  {truncateDescription(analytics.game.shortDescription)}
                </p>
              </div>
            </div>

            <div class="grid gap-4 md:grid-cols-3">
              <div class="rounded-2xl border border-white/10 bg-ink/50 p-4">
                <div class="font-mono text-xs uppercase tracking-[0.24em] text-mist/55">
                  Total reviews
                </div>
                <div
                  id={`${scopeId}-total-reviews`}
                  class="mt-2 text-3xl font-semibold text-white"
                >
                  {formatNumber.format(analytics.totals.totalReviews)}
                </div>
              </div>
              <div class="rounded-2xl border border-white/10 bg-ink/50 p-4">
                <div class="font-mono text-xs uppercase tracking-[0.24em] text-mist/55">
                  Positive share
                </div>
                <div
                  id={`${scopeId}-positive-share`}
                  class="mt-2 text-3xl font-semibold text-white"
                >
                  {analytics.totals.positiveRatio}%
                </div>
              </div>
              <div class="rounded-2xl border border-white/10 bg-ink/50 p-4">
                <div class="font-mono text-xs uppercase tracking-[0.24em] text-mist/55">
                  Updated
                </div>
                <div class="mt-2 text-xl font-semibold text-white">
                  {formatDateTime.format(new Date(analytics.fetchedAt))}
                </div>
              </div>
            </div>
          </div>

          <aside class="relative border-t border-white/10 bg-black/25 p-5 backdrop-blur-sm lg:border-l lg:border-t-0">
            <div class="mb-4">
              <h3 class="text-xl font-semibold text-white">
                Positive vs negative
              </h3>
              <p class="text-sm text-mist/65">Combined sentiment split.</p>
            </div>
            <div style="height:280px">
              <canvas id={`${scopeId}-sentiment`}></canvas>
            </div>
            <a
              href={analytics.game.steamUrl}
              target="_blank"
              rel="noreferrer"
              class="mt-6 inline-flex rounded-2xl border border-white/10 px-4 py-3 text-sm font-semibold text-white transition hover:border-ember hover:text-ember"
            >
              Open Steam Store page
            </a>
          </aside>
        </div>
      </section>

      <section class="relative overflow-hidden rounded-[2rem] border border-white/10 bg-white/5 p-5 sm:p-6">
        {themeImage ? (
          <div
            class="absolute inset-0 bg-cover bg-center opacity-[0.08]"
            style={`background-image:url('${themeImage}')`}
          />
        ) : null}
        <div class="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(0,0,0,0.16))]" />
        <div class="relative">
          <div class="mb-4">
            <h3 class="text-xl font-semibold text-white">Language breakdown</h3>
            <p class="text-sm text-mist/65">
              Positive ratio and review count per language.
            </p>
          </div>
          <div class="mb-3 flex flex-wrap gap-2 sm:hidden">
            <button
              type="button"
              data-sort-col="ratio"
              data-scope={scopeId}
              class="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.2em] text-mist/55"
            >
              Ratio %<span data-sort-indicator></span>
            </button>
            <button
              type="button"
              data-sort-col="reviews"
              data-scope={scopeId}
              class="inline-flex items-center rounded-full border border-sky/40 bg-sky/10 px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.2em] text-sky"
            >
              Reviews<span data-sort-indicator> ↓</span>
            </button>
          </div>
          <div
            id={`${scopeId}-breakdown-header`}
            class="mb-2 hidden items-center gap-x-3 px-3 sm:grid"
            style="grid-template-columns: minmax(0,1fr) minmax(0,2fr) 4.5rem"
          >
            <div class="font-mono text-[10px] uppercase tracking-widest text-mist/40">
              Language
            </div>
            <button
              data-sort-col="ratio"
              data-scope={scopeId}
              class="inline-flex items-center justify-self-start rounded-full border border-white/10 bg-white/5 px-3 py-1.5 font-mono text-[10px] uppercase tracking-widest text-mist/55 cursor-pointer select-none transition-colors hover:border-sky/40 hover:bg-white/10 hover:text-white"
            >
              Positive ratio %<span data-sort-indicator></span>
            </button>
            <button
              data-sort-col="reviews"
              data-scope={scopeId}
              class="inline-flex items-center justify-self-end rounded-full border border-sky/40 bg-sky/10 px-3 py-1.5 font-mono text-[10px] uppercase tracking-widest text-sky cursor-pointer select-none transition-colors hover:border-sky/60 hover:bg-sky/15"
            >
              Reviews<span data-sort-indicator> ↓</span>
            </button>
          </div>
          <div id={`${scopeId}-breakdown`} class="space-y-1">
            {sortedDefinitions.map((definition) => {
              const language = languageMap.get(definition.id);
              const totalReviews = language?.totalReviews ?? 0;
              const positive = language?.positive ?? 0;
              const hasData = totalReviews > 0;
              const positiveRatio = hasData
                ? Math.round((positive / totalReviews) * 100)
                : 0;
              const barColor =
                positiveRatio >= 80
                  ? "bg-emerald-500"
                  : positiveRatio >= 60
                    ? "bg-lime-400"
                    : positiveRatio >= 40
                      ? "bg-amber-400"
                      : "bg-rose-500";
              const isCrownRatio =
                hasData &&
                Math.abs(positive / totalReviews - maxRatioVal) < 1e-9;
              const isCrownReviews = hasData && totalReviews === maxReviewsVal;

              return (
                <div class="rounded-xl border border-white/[0.07] bg-ink/40 px-3 py-3">
                  <div class="flex items-start justify-between gap-3">
                    <div class="min-w-0 text-sm font-medium text-white">
                      {definition.flag} {definition.label}
                    </div>
                    <div class="shrink-0 font-mono text-xs text-mist/55">
                      {hasData ? `${positiveRatio}%` : "—"}
                      {isCrownRatio ? (
                        <span class="ml-0.5 text-amber-400 text-[11px] leading-none">
                          👑
                        </span>
                      ) : null}
                    </div>
                  </div>
                  <div class="mt-2 flex items-center gap-2 min-w-0">
                    <div class="flex-1 h-1.5 rounded-full bg-white/10 overflow-hidden">
                      {hasData ? (
                        <div
                          class={`h-full rounded-full ${barColor}`}
                          style={`width:${positiveRatio}%`}
                        ></div>
                      ) : null}
                    </div>
                  </div>
                  <div class="mt-2 inline-flex items-center gap-0.5 text-left font-mono text-sm tabular-nums text-white">
                    {hasData ? (
                      `${formatNumber.format(totalReviews)} reviews`
                    ) : (
                      <span class="text-mist/30">No reviews</span>
                    )}
                    {isCrownReviews ? (
                      <span class="text-amber-400 text-[11px] leading-none">
                        👑
                      </span>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section class="grid gap-6 md:grid-cols-2">
        <div class="relative overflow-hidden rounded-[2rem] border border-white/10 bg-white/5 p-5 sm:p-6">
          {themeImage ? (
            <div
              class="absolute inset-0 bg-cover bg-center opacity-[0.07]"
              style={`background-image:url('${themeImage}')`}
            />
          ) : null}
          <div class="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(0,0,0,0.14))]" />
          <div class="relative">
            <div class="mb-4">
              <h3 class="text-xl font-semibold text-white">Review volume</h3>
              <p class="text-sm text-mist/65">
                Total review count by language.
              </p>
            </div>
            <div
              id={`${scopeId}-reviews-wrapper`}
              style={`height:${chartHeight}px`}
            >
              <canvas id={`${scopeId}-reviews`}></canvas>
            </div>
          </div>
        </div>

        <div class="relative overflow-hidden rounded-[2rem] border border-white/10 bg-white/5 p-5 sm:p-6">
          {themeImage ? (
            <div
              class="absolute inset-0 bg-cover bg-center opacity-[0.07]"
              style={`background-image:url('${themeImage}')`}
            />
          ) : null}
          <div class="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(0,0,0,0.14))]" />
          <div class="relative">
            <div class="mb-4">
              <h3 class="text-xl font-semibold text-white">Positive ratio %</h3>
              <p class="text-sm text-mist/65">
                Positive review percentage by language.
              </p>
            </div>
            <div
              id={`${scopeId}-score-wrapper`}
              style={`height:${chartHeight}px`}
            >
              <canvas id={`${scopeId}-score`}></canvas>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

type ErrorStateProps = {
  message: string;
};

export const ErrorState = ({ message }: ErrorStateProps) => (
  <div class="rounded-[2rem] border border-rose-500/20 bg-rose-500/10 p-6 text-rose-100">
    <div class="font-mono text-xs uppercase tracking-[0.24em] text-rose-200/80">
      Error
    </div>
    <p class="mt-3 text-base leading-7">{message}</p>
  </div>
);
