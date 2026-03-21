/** @jsxImportSource hono/jsx */
import { STEAM_LANGUAGE_DEFINITIONS } from "../config";
import type { ReviewAnalytics } from "../types/steam";

const formatNumber = new Intl.NumberFormat("en-US");
const formatDateTime = new Intl.DateTimeFormat("en-US", {
  dateStyle: "short",
  timeStyle: "short",
});

const safeJsonForScript = (value: unknown) =>
  JSON.stringify(value).replace(/</g, "\\u003c").replace(/<\/script/gi, "<\\/script");

type ReviewResultsProps = {
  analytics: ReviewAnalytics;
};

export const ReviewResults = ({ analytics }: ReviewResultsProps) => {
  const scopeId = `review-${analytics.appId}`;
  const chartHeight = Math.max(260, analytics.languages.length * 34);
  const payload = safeJsonForScript({
    totals: analytics.totals,
    languages: analytics.languages,
  });
  const languageMap = new Map(analytics.languages.map((language) => [language.language, language]));

  return (
    <div class="space-y-6" data-review-scope={scopeId} data-review-payload={payload}>
      <section class="overflow-hidden rounded-[2rem] border border-white/10 bg-white/5 shadow-panel backdrop-blur">
        <div class="grid gap-0 lg:grid-cols-[1.2fr,0.8fr]">
          <div class="space-y-5 p-5 sm:p-6">
            <div class="flex flex-wrap items-start gap-4">
              <img
                src={analytics.game.capsuleImage || analytics.game.headerImage}
                alt={analytics.game.name}
                class="h-24 w-full max-w-48 rounded-2xl object-cover ring-1 ring-white/10"
              />
              <div class="min-w-0 flex-1 space-y-3">
                <div class="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 font-mono text-xs uppercase tracking-[0.24em] text-mist/60">
                  app/{analytics.appId}
                </div>
                <h2 class="break-words text-2xl font-bold text-white sm:text-3xl">{analytics.game.name}</h2>
                <p class="max-w-2xl break-words text-sm leading-6 text-mist/75">
                  {analytics.game.shortDescription || "No short Steam description is available for this game."}
                </p>
              </div>
            </div>

            <div class="grid gap-4 md:grid-cols-3">
              <div class="rounded-2xl border border-white/10 bg-ink/50 p-4">
                <div class="font-mono text-xs uppercase tracking-[0.24em] text-mist/55">Total reviews</div>
                <div id={`${scopeId}-total-reviews`} class="mt-2 text-3xl font-semibold text-white">
                  {formatNumber.format(analytics.totals.totalReviews)}
                </div>
              </div>
              <div class="rounded-2xl border border-white/10 bg-ink/50 p-4">
                <div class="font-mono text-xs uppercase tracking-[0.24em] text-mist/55">Positive share</div>
                <div id={`${scopeId}-positive-share`} class="mt-2 text-3xl font-semibold text-white">
                  {analytics.totals.positiveRatio}%
                </div>
              </div>
              <div class="rounded-2xl border border-white/10 bg-ink/50 p-4">
                <div class="font-mono text-xs uppercase tracking-[0.24em] text-mist/55">Updated</div>
                <div class="mt-2 text-xl font-semibold text-white">
                  {formatDateTime.format(new Date(analytics.fetchedAt))}
                </div>
              </div>
            </div>
          </div>

          <aside class="border-t border-white/10 bg-ink/60 p-5 lg:border-l lg:border-t-0">
            <div class="font-mono text-xs uppercase tracking-[0.24em] text-mist/55">Selected languages</div>
            <div id={`${scopeId}-selected-languages`} class="mt-4 flex flex-wrap gap-2">
              {analytics.languages.map((language) => (
                <span class="rounded-full border border-sky/25 bg-sky/10 px-3 py-1 text-sm text-sky">
                  {language.label}
                </span>
              ))}
            </div>
            <div class="mt-6 text-sm leading-7 text-mist/70">
              Selected languages stay visible even if the game has no review data for one of them.
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

      <section class="grid gap-6 xl:grid-cols-[1.2fr,0.8fr]">
        <div class="grid gap-6">
          <div class="rounded-[2rem] border border-white/10 bg-white/5 p-5 sm:p-6">
            <div class="mb-4 flex items-center justify-between gap-4">
              <div>
                <h3 class="text-xl font-semibold text-white">Review volume by language</h3>
                <p class="text-sm text-mist/65">How total review count is distributed across supported languages.</p>
              </div>
            </div>
            <div style={`height:${chartHeight}px`}>
              <canvas id={`${scopeId}-reviews`}></canvas>
            </div>
          </div>

          <div class="rounded-[2rem] border border-white/10 bg-white/5 p-5 sm:p-6">
            <div class="mb-4">
              <h3 class="text-xl font-semibold text-white">Steam score by language</h3>
              <p class="text-sm text-mist/65">Steam review score compared across the full language set.</p>
            </div>
            <div style={`height:${chartHeight}px`}>
              <canvas id={`${scopeId}-score`}></canvas>
            </div>
          </div>
        </div>

        <div class="grid gap-6">
          <div class="rounded-[2rem] border border-white/10 bg-white/5 p-5 sm:p-6">
            <div class="mb-4">
              <h3 class="text-xl font-semibold text-white">Positive vs negative</h3>
              <p class="text-sm text-mist/65">Combined sentiment split across all supported languages.</p>
            </div>
            <div class="mx-auto max-w-[320px]" style="height:320px">
              <canvas id={`${scopeId}-sentiment`}></canvas>
            </div>
          </div>

          <div class="rounded-[2rem] border border-white/10 bg-white/5 p-5 sm:p-6">
            <div class="mb-4">
              <h3 class="text-xl font-semibold text-white">Language breakdown</h3>
              <p class="text-sm text-mist/65">Each supported language listed without horizontal overflow.</p>
            </div>
            <div id={`${scopeId}-breakdown`} class="grid gap-3">
              {STEAM_LANGUAGE_DEFINITIONS.map((definition) => {
                const language = languageMap.get(definition.id);
                const reviewScore = language?.reviewScore ?? 0;
                const reviewScoreLabel = language?.reviewScoreLabel ?? "No data for this language";
                const totalReviews = language?.totalReviews ?? 0;
                const positive = language?.positive ?? 0;
                const negative = language?.negative ?? 0;

                return (
                  <article class="grid gap-2 rounded-2xl border border-white/10 bg-ink/45 p-4 md:grid-cols-[1.3fr,0.9fr,0.9fr,0.9fr] md:items-center">
                    <div class="min-w-0">
                      <div class="truncate text-base font-semibold text-white">{definition.label}</div>
                      <div class="text-sm text-mist/55">{reviewScoreLabel}</div>
                    </div>
                    <div class="text-sm text-mist/75">
                      <span class="font-mono text-xs uppercase tracking-[0.2em] text-mist/50">Reviews</span>
                      <div class="mt-1 text-white">{formatNumber.format(totalReviews)}</div>
                    </div>
                    <div class="text-sm text-mist/75">
                      <span class="font-mono text-xs uppercase tracking-[0.2em] text-mist/50">Sentiment</span>
                      <div class="mt-1 text-emerald-400">{formatNumber.format(positive)} positive</div>
                      <div class="text-rose-400">{formatNumber.format(negative)} negative</div>
                    </div>
                    <div class="text-sm text-mist/75">
                      <span class="font-mono text-xs uppercase tracking-[0.2em] text-mist/50">Score</span>
                      <div class="mt-1 text-white">{reviewScore}/9</div>
                    </div>
                  </article>
                );
              })}
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
    <div class="font-mono text-xs uppercase tracking-[0.24em] text-rose-200/80">Error</div>
    <p class="mt-3 text-base leading-7">{message}</p>
  </div>
);
