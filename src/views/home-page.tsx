/** @jsxImportSource hono/jsx */
import { STEAM_LANGUAGE_DEFINITIONS } from "../config";
import type { CachedGame } from "../types/steam";

type HomePageProps = {
  cachedGames: CachedGame[];
  initialAppId: string;
  selectedLanguages: string[];
};

const isChecked = (selectedLanguages: string[], languageId: string) =>
  selectedLanguages.includes(languageId);

export const HomePage = ({
  cachedGames,
  initialAppId,
  selectedLanguages,
}: HomePageProps) => (
  <main class="mx-auto flex min-h-screen w-full max-w-6xl min-w-0 flex-col px-4 py-6 sm:px-6 lg:px-8">
    <section class="relative overflow-hidden rounded-[2rem] border border-white/10 bg-white/5 px-5 py-6 shadow-panel backdrop-blur sm:px-7 sm:py-8">
      <div class="absolute inset-y-0 right-0 hidden w-1/3 bg-gradient-to-l from-ember/20 to-transparent lg:block" />
      <div class="relative grid min-w-0 gap-6 lg:grid-cols-[1.2fr,0.8fr] lg:items-start">
        <div class="min-w-0 space-y-5">
          <div class="space-y-3">
            <h1 class="max-w-3xl break-words text-balance font-display text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-5xl">
              Steam review analytics for every supported language
            </h1>
            <p class="max-w-3xl break-words text-sm leading-6 text-mist/75 sm:text-base">
              Search any Steam game and compare language-based review sentiment in one report.
              The dashboard aggregates positive and negative review stats from Steam and
              visualizes what players in each language are saying.
            </p>
          </div>

          <form
            id="analytics-form"
            class="min-w-0 space-y-4 rounded-[1.6rem] border border-white/10 bg-ink/60 p-4 sm:p-5"
            hx-get="/analytics"
            hx-params="appId"
            hx-target="#results"
            hx-swap="innerHTML"
            hx-indicator="#loading-indicator"
          >
            <label class="block min-w-0 space-y-2">
              <span class="font-mono text-xs uppercase tracking-[0.24em] text-mist/60">
                Steam game search
              </span>
              <div class="relative min-w-0 max-w-full">
                <input
                  id="app-search-input"
                  class="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-base text-white outline-none transition placeholder:text-mist/35 focus:border-ember focus:ring-2 focus:ring-ember/20"
                  type="search"
                  placeholder="Search by game name. Example: Counter-Strike"
                  autoComplete="off"
                  hx-get="/search"
                  hx-trigger="input changed delay:350ms, search"
                  hx-target="#search-suggestions"
                  hx-swap="innerHTML"
                  hx-indicator="#search-loading-indicator"
                  hx-include="#app-search-input"
                  hx-params="term"
                  name="term"
                  value=""
                  required
                  data-app-search-input="true"
                />
                <input
                  type="hidden"
                  name="appId"
                  value={initialAppId || ""}
                  data-app-id-input="true"
                />
                <div class="pointer-events-none absolute inset-y-0 right-4 flex items-center">
                  <span
                    id="search-loading-indicator"
                    class="htmx-indicator rounded-full border border-sky/20 bg-sky/10 px-2 py-1 font-mono text-[10px] uppercase tracking-[0.24em] text-sky"
                  >
                    Searching...
                  </span>
                </div>
              </div>
              <div class="flex flex-col gap-2 text-xs text-mist/45 sm:flex-row sm:items-center sm:justify-between">
                <span class="break-all" data-selected-app-label="true">
                  Selected app ID: {initialAppId}
                </span>
                <span>Pick a result, then run analytics.</span>
              </div>
              <div
                id="search-suggestions"
                class="w-full min-w-0 max-w-full space-y-2 overflow-hidden"
                data-search-suggestions="true"
              >
                <div class="rounded-2xl border border-dashed border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-mist/45">
                  Start typing to see Steam autocomplete suggestions.
                </div>
              </div>
            </label>

            <fieldset class="space-y-3">
              <details class="rounded-[1.4rem] border border-white/10 bg-white/5 p-3 sm:p-4">
                <summary class="flex cursor-pointer list-none items-center justify-between gap-3">
                  <span class="font-mono text-xs uppercase tracking-[0.24em] text-mist/60">
                    Languages
                  </span>
                  <span id="language-count" class="text-xs text-mist/55">
                    {selectedLanguages.length} selected
                  </span>
                </summary>
                <div class="mt-3 flex max-h-56 flex-wrap gap-2 overflow-y-auto pr-1">
                  {STEAM_LANGUAGE_DEFINITIONS.map((language) => (
                    <label class="language-pill group cursor-pointer">
                      <input
                        class="sr-only"
                        type="checkbox"
                        name="language"
                        value={language.id}
                        data-language-checkbox="true"
                        checked={isChecked(selectedLanguages, language.id)}
                      />
                      <span class="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-all select-none group-has-[input:checked]:border-ember/60 group-has-[input:checked]:bg-ember/15 group-has-[input:checked]:text-ember border-white/10 bg-white/5 text-mist/60 hover:border-white/20 hover:text-mist">
                        <span>{language.flag}</span>
                        {language.label}
                      </span>
                    </label>
                  ))}
                </div>
              </details>
            </fieldset>

            <div class="flex flex-col gap-3 sm:flex-row sm:items-center">
              <button class="inline-flex items-center justify-center rounded-2xl bg-ember px-5 py-3 font-semibold text-white transition hover:brightness-110">
                Analyze game
              </button>
              <div
                id="loading-indicator"
                class="htmx-indicator text-sm text-mist/70"
              >
                Loading Steam data...
              </div>
            </div>
          </form>
        </div>

        <aside class="hidden gap-4 rounded-[1.6rem] border border-white/10 bg-white/5 p-5 lg:grid">
          <div>
            <div class="font-mono text-xs uppercase tracking-[0.24em] text-mist/60">
              Last Viewed Games By Visitors
            </div>
            <div class="mt-3" data-cached-games-section="true">
              {cachedGames.length > 0 ? (
                <div
                  class="grid gap-2 text-sm leading-6 text-mist/80"
                  data-cached-games-list="true"
                >
                  {cachedGames.map((game) => (
                    <button
                      type="button"
                      class="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-2 text-left transition hover:border-sky/40 hover:bg-white/10 hover:text-white"
                      data-cached-game="true"
                      data-app-id={String(game.appId)}
                      data-app-name={game.name}
                    >
                      <div class="font-medium text-white">{game.name}</div>
                      <div class="font-mono text-xs text-mist/50">
                        App ID: {game.appId}
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div
                  class="rounded-2xl border border-dashed border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-mist/45"
                  data-cached-games-empty="true"
                >
                  Henuz goruntulenen oyun yok. Bir oyun sectiginde burada
                  gorunur.
                </div>
              )}
            </div>
          </div>
        </aside>
      </div>
    </section>

    <section id="results" class="mt-6">
      <div class="rounded-[2rem] border border-dashed border-white/10 bg-white/5 p-5 text-center text-mist/60 sm:p-8">
        Enter an app ID to load the report. Example:{" "}
        <span class="font-mono text-white">620</span>
      </div>
    </section>

    <section class="mt-6 rounded-[2rem] border border-white/10 bg-white/5 p-6 sm:p-8">
      <h2 class="font-display text-2xl font-bold tracking-tight text-white sm:text-3xl">
        How Steam review analytics works
      </h2>
      <p class="mt-3 max-w-4xl text-sm leading-7 text-mist/75 sm:text-base">
        This tool queries Steam review summary endpoints, groups review data by language,
        and shows total reviews, sentiment share, and positive ratio side by side. Use it to
        understand global versus local player reception before making release, marketing, or
        localization decisions.
      </p>
    </section>

    <section class="mt-6 rounded-[2rem] border border-white/10 bg-white/5 p-6 sm:p-8">
      <h2 class="font-display text-2xl font-bold tracking-tight text-white sm:text-3xl">
        Frequently asked questions
      </h2>
      <div class="mt-4 space-y-3">
        <details class="rounded-2xl border border-white/10 bg-ink/40 px-4 py-3">
          <summary class="cursor-pointer font-medium text-white">
            How does Steam Review Analytics work?
          </summary>
          <p class="mt-2 text-sm leading-6 text-mist/75">
            The app fetches review summary data from the Steam API and aggregates review counts
            and sentiment by language.
          </p>
        </details>
        <details class="rounded-2xl border border-white/10 bg-ink/40 px-4 py-3">
          <summary class="cursor-pointer font-medium text-white">
            Do I need a Steam account to use this tool?
          </summary>
          <p class="mt-2 text-sm leading-6 text-mist/75">
            No account is required. Search a game, pick a result, and view the analytics report.
          </p>
        </details>
        <details class="rounded-2xl border border-white/10 bg-ink/40 px-4 py-3">
          <summary class="cursor-pointer font-medium text-white">
            What metrics are included in the report?
          </summary>
          <p class="mt-2 text-sm leading-6 text-mist/75">
            You get positive reviews, negative reviews, total reviews, and positive ratio for each
            selected language.
          </p>
        </details>
        <details class="rounded-2xl border border-white/10 bg-ink/40 px-4 py-3">
          <summary class="cursor-pointer font-medium text-white">
            Is this an official Steam product?
          </summary>
          <p class="mt-2 text-sm leading-6 text-mist/75">
            No. It is an independent analytics app built on publicly available Steam data.
          </p>
        </details>
      </div>
    </section>

    <footer class="mt-6 mb-2 text-center text-sm text-mist/45">
      Found this useful? Give it a star on{" "}
      <a
        href="https://github.com/Autumnnus/steam-review-analytics"
        target="_blank"
        rel="noopener noreferrer"
        class="text-ember transition hover:text-ember/80 hover:underline"
      >
        GitHub
      </a>
    </footer>
  </main>
);
