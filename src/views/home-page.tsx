/** @jsxImportSource hono/jsx */
import { STEAM_LANGUAGE_DEFINITIONS } from "../config";

type HomePageProps = {
  initialAppId: string;
  selectedLanguages: string[];
};

const isChecked = (selectedLanguages: string[], languageId: string) => selectedLanguages.includes(languageId);

export const HomePage = ({ initialAppId, selectedLanguages }: HomePageProps) => (
  <main class="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-4 py-6 sm:px-6 lg:px-8">
    <section class="relative overflow-hidden rounded-[2rem] border border-white/10 bg-white/5 px-5 py-6 shadow-panel backdrop-blur sm:px-7 sm:py-8">
      <div class="absolute inset-y-0 right-0 hidden w-1/3 bg-gradient-to-l from-ember/20 to-transparent lg:block" />
      <div class="relative grid gap-6 lg:grid-cols-[1.2fr,0.8fr] lg:items-start">
        <div class="space-y-5">
          <div class="space-y-3">
            <h1 class="max-w-3xl font-display text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-5xl">
              Steam review analytics for every supported language.
            </h1>
            <p class="max-w-2xl text-sm leading-7 text-mist/80 sm:text-base">
              Enter a Steam app ID and get a clean breakdown of review volume, sentiment, and score across all
              supported languages for that game.
            </p>
          </div>

          <form
            id="analytics-form"
            class="space-y-4 rounded-[1.6rem] border border-white/10 bg-ink/60 p-4 sm:p-5"
            hx-get="/analytics"
            hx-params="not language"
            hx-target="#results"
            hx-swap="innerHTML"
            hx-indicator="#loading-indicator"
          >
            <label class="block space-y-2">
              <span class="font-mono text-xs uppercase tracking-[0.24em] text-mist/60">Steam app ID</span>
              <input
                class="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-base text-white outline-none transition placeholder:text-mist/35 focus:border-ember focus:ring-2 focus:ring-ember/20"
                type="number"
                min="1"
                name="appId"
                value={initialAppId}
                placeholder="Example: 620"
                required
              />
            </label>

            <fieldset class="space-y-3">
              <div class="flex items-center justify-between gap-3">
                <legend class="font-mono text-xs uppercase tracking-[0.24em] text-mist/60">Languages</legend>
                <span id="language-count" class="text-xs text-mist/55">
                  {selectedLanguages.length} selected
                </span>
              </div>
              <div class="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                {STEAM_LANGUAGE_DEFINITIONS.map((language) => (
                  <label class="flex min-w-0 items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-3 py-3 text-sm text-mist transition hover:border-sky/40 hover:bg-white/10">
                    <input
                      class="h-4 w-4 shrink-0 rounded border-white/20 bg-transparent text-ember focus:ring-ember"
                      type="checkbox"
                      name="language"
                      value={language.id}
                      data-language-checkbox="true"
                      checked={isChecked(selectedLanguages, language.id)}
                    />
                    <span class="truncate">{language.label}</span>
                  </label>
                ))}
              </div>
            </fieldset>

            <div class="flex flex-col gap-3 sm:flex-row sm:items-center">
              <button class="inline-flex items-center justify-center rounded-2xl bg-ember px-5 py-3 font-semibold text-white transition hover:brightness-110">
                Analyze game
              </button>
              <div id="loading-indicator" class="htmx-indicator text-sm text-mist/70">
                Loading Steam data...
              </div>
            </div>
          </form>
        </div>

        <aside class="grid gap-4 rounded-[1.6rem] border border-white/10 bg-white/5 p-5">
          <div>
            <div class="font-mono text-xs uppercase tracking-[0.24em] text-mist/60">Included in the report</div>
            <div class="mt-3 grid gap-3 text-sm leading-6 text-mist/80">
              <p>Total review volume by language.</p>
              <p>Positive versus negative sentiment split.</p>
              <p>Steam score comparison across all supported languages.</p>
            </div>
          </div>
          <div class="rounded-2xl border border-sky/20 bg-sky/10 p-4 text-sm leading-6 text-sky">
            All major Steam review languages are preselected. You can remove or add any language before running the report.
          </div>
        </aside>
      </div>
    </section>

    <section id="results" class="mt-6">
      <div class="rounded-[2rem] border border-dashed border-white/10 bg-white/5 p-8 text-center text-mist/60">
        Enter an app ID to load the report. Example: <span class="font-mono text-white">620</span>
      </div>
    </section>
  </main>
);
