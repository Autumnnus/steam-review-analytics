/** @jsxImportSource hono/jsx */
import type { FC, PropsWithChildren } from "hono/jsx";
import { STEAM_LANGUAGE_DEFINITIONS } from "../config";

type LayoutProps = PropsWithChildren<{
  title?: string;
}>;

export const Layout: FC<LayoutProps> = ({
  children,
  title = "Steam Review Analytics",
}) => {
  const languageLabels = JSON.stringify(
    Object.fromEntries(STEAM_LANGUAGE_DEFINITIONS.map((language) => [language.id, language.label])),
  ).replace(/</g, "\\u003c");
  const bootstrap = `
    window.reviewCharts = window.reviewCharts || new Map();
    window.reviewPayloads = window.reviewPayloads || new Map();
    window.reviewLanguageLabels = ${languageLabels};
    window.hydrateReviewResults = (root = document) => {
      root.querySelectorAll('[data-review-payload][data-review-scope]').forEach((node) => {
        const scope = node.getAttribute('data-review-scope');
        const payloadText = node.getAttribute('data-review-payload');
        if (!scope || !payloadText) return;
        try {
          window.reviewPayloads.set(scope, JSON.parse(payloadText));
        } catch (_) {}
      });
      window.applyReviewFilter();
    };
    window.getSelectedLanguages = () =>
      Array.from(document.querySelectorAll('[data-language-checkbox="true"]:checked')).map((input) => input.value);
    window.computeTotals = (languages) => {
      const totals = languages.reduce(
        (accumulator, item) => {
          accumulator.positive += item.positive;
          accumulator.negative += item.negative;
          accumulator.totalReviews += item.totalReviews;
          return accumulator;
        },
        { positive: 0, negative: 0, totalReviews: 0 }
      );
      return {
        ...totals,
        positiveRatio: totals.totalReviews === 0 ? 0 : Number(((totals.positive / totals.totalReviews) * 100).toFixed(1))
      };
    };
    window.buildFilteredPayload = (payload, selectedLanguages) => {
      const payloadByLanguage = new Map(payload.languages.map((item) => [item.language, item]));
      const selectedList = selectedLanguages;
      const filteredLanguages = selectedList.map((languageId) => {
        const existing = payloadByLanguage.get(languageId);
        if (existing) return existing;
        return {
          language: languageId,
          label: window.reviewLanguageLabels[languageId] || languageId,
          reviewScore: 0,
          reviewScoreLabel: 'No data for this language',
          positive: 0,
          negative: 0,
          totalReviews: 0,
          positiveRatio: 0
        };
      });
      return {
        languages: filteredLanguages,
        totals: window.computeTotals(filteredLanguages)
      };
    };
    window.syncLanguageCount = () => {
      const checkboxes = Array.from(document.querySelectorAll('[data-language-checkbox="true"]'));
      const countNode = document.getElementById('language-count');
      if (!countNode) return;
      const selected = checkboxes.filter((input) => input.checked).length;
      countNode.textContent = selected + ' selected';
    };
    window.updateReviewSummary = (scope, filteredPayload) => {
      const reviewTotalNode = document.getElementById(\`\${scope}-total-reviews\`);
      const positiveShareNode = document.getElementById(\`\${scope}-positive-share\`);
      const selectedLanguagesNode = document.getElementById(\`\${scope}-selected-languages\`);
      const breakdownNode = document.getElementById(\`\${scope}-breakdown\`);
      if (reviewTotalNode) reviewTotalNode.textContent = filteredPayload.totals.totalReviews.toLocaleString('en-US');
      if (positiveShareNode) positiveShareNode.textContent = filteredPayload.totals.positiveRatio + '%';
      if (selectedLanguagesNode) {
        selectedLanguagesNode.innerHTML = filteredPayload.languages
          .map((item) => \`<span class="rounded-full border border-sky/25 bg-sky/10 px-3 py-1 text-sm text-sky">\${item.label}</span>\`)
          .join('');
      }
      if (breakdownNode) {
        breakdownNode.innerHTML = filteredPayload.languages
          .map((item) => \`
            <article class="grid gap-2 rounded-2xl border border-white/10 bg-ink/45 p-4 md:grid-cols-[1.3fr,0.9fr,0.9fr,0.9fr] md:items-center">
              <div class="min-w-0">
                <div class="truncate text-base font-semibold text-white">\${item.label}</div>
                <div class="text-sm text-mist/55">\${item.reviewScoreLabel}</div>
              </div>
              <div class="text-sm text-mist/75">
                <span class="font-mono text-xs uppercase tracking-[0.2em] text-mist/50">Reviews</span>
                <div class="mt-1 text-white">\${item.totalReviews.toLocaleString('en-US')}</div>
              </div>
              <div class="text-sm text-mist/75">
                <span class="font-mono text-xs uppercase tracking-[0.2em] text-mist/50">Sentiment</span>
                <div class="mt-1 text-emerald-400">\${item.positive.toLocaleString('en-US')} positive</div>
                <div class="text-rose-400">\${item.negative.toLocaleString('en-US')} negative</div>
              </div>
              <div class="text-sm text-mist/75">
                <span class="font-mono text-xs uppercase tracking-[0.2em] text-mist/50">Score</span>
                <div class="mt-1 text-white">\${item.reviewScore}/9</div>
              </div>
            </article>
          \`)
          .join('');
      }
    };
    window.applyReviewFilter = () => {
      const selectedLanguages = window.getSelectedLanguages();
      window.reviewPayloads.forEach((payload, scope) => {
        const filteredPayload = window.buildFilteredPayload(payload, selectedLanguages);
        window.updateReviewSummary(scope, filteredPayload);
        window.renderReviewCharts(scope, filteredPayload);
      });
    };
    window.destroyReviewCharts = (scope) => {
      const charts = window.reviewCharts.get(scope) || [];
      charts.forEach((chart) => chart.destroy());
      window.reviewCharts.delete(scope);
    };
    window.renderReviewCharts = (scope, payload) => {
      if (!window.Chart) return;
      window.destroyReviewCharts(scope);
      const charts = [];
      const reviewsChartCanvas = document.getElementById(\`\${scope}-reviews\`);
      const sentimentChartCanvas = document.getElementById(\`\${scope}-sentiment\`);
      const scoreChartCanvas = document.getElementById(\`\${scope}-score\`);

      if (reviewsChartCanvas) {
        charts.push(new Chart(reviewsChartCanvas, {
          type: 'bar',
          data: {
            labels: payload.languages.map((item) => item.label),
            datasets: [{
              label: 'Review Count',
              data: payload.languages.map((item) => item.totalReviews),
              borderRadius: 10,
              backgroundColor: '#f97316'
            }]
          },
          options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
              x: { ticks: { color: '#d9d9d4' }, grid: { color: 'rgba(255,255,255,0.06)' } },
              y: { ticks: { color: '#d9d9d4' }, grid: { display: false } }
            }
          }
        }));
      }

      if (sentimentChartCanvas) {
        charts.push(new Chart(sentimentChartCanvas, {
          type: 'doughnut',
          data: {
            labels: ['Positive', 'Negative'],
            datasets: [{
              data: [payload.totals.positive, payload.totals.negative],
              backgroundColor: ['#22c55e', '#f43f5e'],
              borderWidth: 0
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: {
                position: 'bottom',
                labels: { color: '#d9d9d4' }
              }
            }
          }
        }));
      }

      if (scoreChartCanvas) {
        charts.push(new Chart(scoreChartCanvas, {
          type: 'bar',
          data: {
            labels: payload.languages.map((item) => item.label),
            datasets: [{
              label: 'Steam Score (/9)',
              data: payload.languages.map((item) => item.reviewScore),
              borderRadius: 10,
              backgroundColor: '#38bdf8'
            }]
          },
          options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
              x: {
                min: 0,
                max: 9,
                ticks: { color: '#d9d9d4' },
                grid: { color: 'rgba(255,255,255,0.06)' }
              },
              y: { ticks: { color: '#d9d9d4' }, grid: { display: false } }
            }
          }
        }));
      }

      window.reviewCharts.set(scope, charts);
    };
    document.addEventListener('change', (event) => {
      if (event.target && event.target.matches('[data-language-checkbox="true"]')) {
        window.syncLanguageCount();
        window.applyReviewFilter();
      }
    });
    document.addEventListener('DOMContentLoaded', () => {
      window.syncLanguageCount();
      window.hydrateReviewResults(document);
    });
    document.addEventListener('htmx:afterSwap', (event) => {
      window.hydrateReviewResults(event.target);
    });
  `;

  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>{title}</title>
        <meta
          name="description"
          content="View Steam review analytics across every supported language for a game."
        />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;700&family=IBM+Plex+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
        <script src="https://cdn.tailwindcss.com"></script>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              tailwind.config = {
                theme: {
                  extend: {
                    fontFamily: {
                      display: ['Space Grotesk', 'sans-serif'],
                      mono: ['IBM Plex Mono', 'monospace']
                    },
                    colors: {
                      ink: '#11120d',
                      mist: '#d9d9d4',
                      ember: '#f97316',
                      sky: '#38bdf8'
                    },
                    boxShadow: {
                      panel: '0 24px 80px rgba(0, 0, 0, 0.28)'
                    }
                  }
                }
              };
            `,
          }}
        />
        <script src="https://unpkg.com/htmx.org@1.9.12"></script>
        <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.3/dist/chart.umd.min.js"></script>
        <style>{`
          :root {
            color-scheme: dark;
          }
          body {
            font-family: "Space Grotesk", sans-serif;
            background:
              radial-gradient(circle at top left, rgba(56, 189, 248, 0.18), transparent 24rem),
              radial-gradient(circle at top right, rgba(249, 115, 22, 0.24), transparent 28rem),
              linear-gradient(135deg, #11120d 0%, #18191a 52%, #10151b 100%);
            min-height: 100vh;
            overflow-x: hidden;
          }
          html {
            overflow-x: hidden;
          }
          .grid-noise::before {
            content: "";
            position: fixed;
            inset: 0;
            pointer-events: none;
            opacity: 0.12;
            background-image:
              linear-gradient(rgba(255,255,255,0.08) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255,255,255,0.08) 1px, transparent 1px);
            background-size: 38px 38px;
            mask-image: radial-gradient(circle at center, black, transparent 85%);
          }
        `}</style>
        <script dangerouslySetInnerHTML={{ __html: bootstrap }} />
      </head>
      <body class="grid-noise overflow-x-hidden text-mist antialiased">
        {children}
      </body>
    </html>
  );
};
