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
    window.reviewSortStates = window.reviewSortStates || new Map();
    window.reviewLanguageLabels = ${languageLabels};
    window.renderCachedGameCard = (game) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'w-full rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-2 text-left transition hover:border-sky/40 hover:bg-white/10 hover:text-white';
      button.setAttribute('data-cached-game', 'true');
      button.setAttribute('data-app-id', String(game.appId));
      button.setAttribute('data-app-name', String(game.name || ''));
      button.setAttribute('data-cached-game-id', String(game.appId));

      const title = document.createElement('div');
      title.className = 'font-medium text-white';
      title.textContent = String(game.name || '');

      const meta = document.createElement('div');
      meta.className = 'font-mono text-xs text-mist/50';
      meta.textContent = 'App ID: ' + String(game.appId);

      button.appendChild(title);
      button.appendChild(meta);
      return button;
    };
    window.upsertCachedGame = (game) => {
      const emptyNode = document.querySelector('[data-cached-games-empty="true"]');
      let listNode = document.querySelector('[data-cached-games-list="true"]');
      if (emptyNode) emptyNode.remove();
      if (!listNode) {
        const asideSection = document.querySelector('[data-cached-games-section="true"]');
        if (!asideSection) return;
        listNode = document.createElement('div');
        listNode.className = 'grid gap-2 text-sm leading-6 text-mist/80';
        listNode.setAttribute('data-cached-games-list', 'true');
        asideSection.appendChild(listNode);
      }
      const existing = listNode.querySelector(\`[data-cached-game-id="\${game.appId}"]\`);
      if (existing) existing.remove();
      listNode.prepend(window.renderCachedGameCard(game));
    };
    window.saveCachedGame = async (game) => {
      try {
        const response = await fetch('/api/cached-games', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(game)
        });
        if (!response.ok) return;
        const savedGame = await response.json();
        window.upsertCachedGame(savedGame);
      } catch (_) {}
    };
    window.selectGame = (appId, appName) => {
      const appIdInput = document.querySelector('[data-app-id-input="true"]');
      const searchInput = document.querySelector('[data-app-search-input="true"]');
      const suggestionsRoot = document.querySelector('[data-search-suggestions="true"]');
      if (appIdInput) appIdInput.value = appId;
      if (searchInput) {
        searchInput.value = appName;
        searchInput.setCustomValidity('');
      }
      if (suggestionsRoot) suggestionsRoot.innerHTML = '';
      window.updateSelectedAppLabel(appId, appName);
    };
    window.runAnalyticsForSelectedGame = () => {
      const form = document.getElementById('analytics-form');
      if (!form) return;
      if (window.htmx && typeof window.htmx.trigger === 'function') {
        window.htmx.trigger(form, 'submit');
        return;
      }
      if (typeof form.requestSubmit === 'function') {
        form.requestSubmit();
      }
    };
    window.updateSelectedAppLabel = (appId, appName) => {
      const labelNode = document.querySelector('[data-selected-app-label="true"]');
      if (!labelNode) return;
      labelNode.textContent = appId
        ? \`Selected: \${appName ? appName + ' ' : ''}#\${appId}\`
        : 'Select a Steam result to set the app ID.';
    };
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
      const breakdownNode = document.getElementById(\`\${scope}-breakdown\`);
      if (reviewTotalNode) reviewTotalNode.textContent = filteredPayload.totals.totalReviews.toLocaleString('en-US');
      if (positiveShareNode) positiveShareNode.textContent = filteredPayload.totals.positiveRatio + '%';
      const sortState = window.reviewSortStates.get(scope) || { col: 'ratio', dir: 'desc' };
      const headerNode = document.getElementById(\`\${scope}-breakdown-header\`);
      if (headerNode) {
        headerNode.querySelectorAll('[data-sort-col]').forEach((btn) => {
          const col = btn.getAttribute('data-sort-col');
          const isActive = col === sortState.col;
          const indicator = btn.querySelector('[data-sort-indicator]');
          if (indicator) indicator.textContent = isActive ? (sortState.dir === 'desc' ? ' ↓' : ' ↑') : '';
          const isRight = col === 'reviews';
          btn.className = \`\${isRight ? 'flex items-center justify-end gap-1' : 'flex items-center gap-1'} font-mono text-[10px] uppercase tracking-widest cursor-pointer select-none transition-colors \${isActive ? 'text-sky' : 'text-mist/40 hover:text-mist/70'}\`;
        });
      }
      const withData = filteredPayload.languages.filter((l) => l.totalReviews > 0);
      const maxRatioVal = withData.length ? Math.max(...withData.map((l) => l.positive / l.totalReviews)) : -1;
      const maxReviewsVal = withData.length ? Math.max(...withData.map((l) => l.totalReviews)) : -1;
      const crown = \`<span class="text-amber-400 text-[11px] leading-none ml-0.5">👑</span>\`;
      const sortedLanguages = [...filteredPayload.languages].sort((a, b) => {
        const hasA = a.totalReviews > 0;
        const hasB = b.totalReviews > 0;
        if (!hasA && !hasB) return 0;
        if (!hasA) return 1;
        if (!hasB) return -1;
        const valA = sortState.col === 'ratio' ? a.positive / a.totalReviews : a.totalReviews;
        const valB = sortState.col === 'ratio' ? b.positive / b.totalReviews : b.totalReviews;
        return sortState.dir === 'desc' ? valB - valA : valA - valB;
      });
      if (breakdownNode) {
        breakdownNode.innerHTML = sortedLanguages
          .map((item) => {
            const hasData = item.totalReviews > 0;
            const ratio = hasData ? Math.round((item.positive / item.totalReviews) * 100) : 0;
            const barColor = ratio >= 80 ? 'bg-emerald-500' : ratio >= 60 ? 'bg-lime-400' : ratio >= 40 ? 'bg-amber-400' : 'bg-rose-500';
            const isCrownRatio = hasData && Math.abs(item.positive / item.totalReviews - maxRatioVal) < 1e-9;
            const isCrownReviews = hasData && item.totalReviews === maxReviewsVal;
            const barHtml = hasData
              ? \`<div class="flex-1 h-1.5 rounded-full bg-white/10 overflow-hidden"><div class="h-full rounded-full \${barColor}" style="width:\${ratio}%"></div></div><span class="flex items-center justify-end gap-0.5 w-10 shrink-0 font-mono text-xs tabular-nums text-mist/55">\${ratio}%\${isCrownRatio ? crown : ''}</span>\`
              : \`<div class="flex-1 h-1.5 rounded-full bg-white/10"></div><span class="w-10 shrink-0 text-right font-mono text-xs text-mist/30">—</span>\`;
            const reviewsHtml = hasData
              ? \`<span class="inline-flex items-center justify-end gap-0.5 text-sm font-mono tabular-nums text-white">\${item.totalReviews.toLocaleString('en-US')}\${isCrownReviews ? crown : ''}</span>\`
              : \`<span class="text-sm text-mist/30">—</span>\`;
            return \`<div class="grid items-center gap-x-3 rounded-xl border border-white/[0.07] bg-ink/40 px-3 py-2.5" style="grid-template-columns: minmax(0,1fr) minmax(0,2fr) 4.5rem">
              <div class="truncate text-sm font-medium text-white">\${item.label}</div>
              <div class="flex items-center gap-2 min-w-0">\${barHtml}</div>
              <div class="text-right">\${reviewsHtml}</div>
            </div>\`;
          })
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
    window.updateBreakdownForScope = (scope) => {
      const payload = window.reviewPayloads.get(scope);
      if (!payload) return;
      const selectedLanguages = window.getSelectedLanguages();
      const filteredPayload = window.buildFilteredPayload(payload, selectedLanguages);
      window.updateReviewSummary(scope, filteredPayload);
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
      const count = payload.languages.length;
      const barHeight = Math.max(280, count * 30);
      const reviewsWrapper = document.getElementById(\`\${scope}-reviews-wrapper\`);
      const scoreWrapper = document.getElementById(\`\${scope}-score-wrapper\`);
      if (reviewsWrapper) reviewsWrapper.style.height = barHeight + 'px';
      if (scoreWrapper) scoreWrapper.style.height = barHeight + 'px';
      const reviewsChartCanvas = document.getElementById(\`\${scope}-reviews\`);
      const sentimentChartCanvas = document.getElementById(\`\${scope}-sentiment\`);
      const scoreChartCanvas = document.getElementById(\`\${scope}-score\`);

      const barAxisOptions = {
        x: {
          ticks: { color: '#d9d9d4', font: { size: 11 } },
          grid: { color: 'rgba(255,255,255,0.06)' }
        },
        y: {
          ticks: { color: '#d9d9d4', font: { size: 11 }, autoSkip: false },
          grid: { display: false }
        }
      };

      if (reviewsChartCanvas) {
        charts.push(new Chart(reviewsChartCanvas, {
          type: 'bar',
          data: {
            labels: payload.languages.map((item) => item.label),
            datasets: [{
              label: 'Review Count',
              data: payload.languages.map((item) => item.totalReviews),
              borderRadius: 6,
              maxBarThickness: 18,
              backgroundColor: '#f97316'
            }]
          },
          options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: barAxisOptions
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
                labels: { color: '#d9d9d4', font: { size: 12 } }
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
              label: 'Positive Ratio (%)',
              data: payload.languages.map((item) => item.positiveRatio),
              borderRadius: 6,
              maxBarThickness: 18,
              backgroundColor: '#38bdf8'
            }]
          },
          options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
              ...barAxisOptions,
              x: { ...barAxisOptions.x, min: 0, max: 100, ticks: { ...barAxisOptions.x.ticks, callback: (v) => v + '%' } }
            }
          }
        }));
      }

      window.reviewCharts.set(scope, charts);
    };
    document.addEventListener('click', (event) => {
      const suggestion = event.target.closest('[data-app-suggestion="true"]');
      if (suggestion) {
        const appId = suggestion.getAttribute('data-app-id') || '';
        const appName = suggestion.getAttribute('data-app-name') || '';
        const imageUrl = suggestion.getAttribute('data-app-image-url') || '';
        window.selectGame(appId, appName);
        if (appId && appName) {
          window.saveCachedGame({
            appId: Number(appId),
            name: appName,
            imageUrl,
            steamUrl: \`https://store.steampowered.com/app/\${appId}\`
          });
        }
        return;
      }
      const cachedGame = event.target.closest('[data-cached-game="true"]');
      if (cachedGame) {
        const appId = cachedGame.getAttribute('data-app-id') || '';
        const appName = cachedGame.getAttribute('data-app-name') || '';
        window.selectGame(appId, appName);
        if (appId && appName) {
          window.saveCachedGame({
            appId: Number(appId),
            name: appName,
            imageUrl: '',
            steamUrl: \`https://store.steampowered.com/app/\${appId}\`
          });
        }
        window.runAnalyticsForSelectedGame();
        return;
      }
      const btn = event.target.closest('[data-sort-col]');
      if (!btn) return;
      const col = btn.getAttribute('data-sort-col');
      const scope = btn.getAttribute('data-scope');
      if (!col || !scope) return;
      const current = window.reviewSortStates.get(scope) || { col: 'ratio', dir: 'desc' };
      const newDir = current.col === col ? (current.dir === 'desc' ? 'asc' : 'desc') : 'desc';
      window.reviewSortStates.set(scope, { col, dir: newDir });
      window.updateBreakdownForScope(scope);
    });
    document.addEventListener('change', (event) => {
      if (event.target && event.target.matches('[data-language-checkbox="true"]')) {
        window.syncLanguageCount();
        window.applyReviewFilter();
      }
    });
    document.addEventListener('input', (event) => {
      if (!(event.target && event.target.matches('[data-app-search-input="true"]'))) return;
      const appIdInput = document.querySelector('[data-app-id-input="true"]');
      if (appIdInput) appIdInput.value = '';
      event.target.setCustomValidity('');
      window.updateSelectedAppLabel('', '');
    });
    document.addEventListener('submit', (event) => {
      const form = event.target;
      if (!(form && form.id === 'analytics-form')) return;
      const appIdInput = form.querySelector('[data-app-id-input="true"]');
      const searchInput = form.querySelector('[data-app-search-input="true"]');
      if (appIdInput && searchInput && !appIdInput.value) {
        event.preventDefault();
        searchInput.setCustomValidity('Select a game from the autocomplete list.');
        searchInput.reportValidity();
      }
    });
    document.addEventListener('DOMContentLoaded', () => {
      window.syncLanguageCount();
      const appIdInput = document.querySelector('[data-app-id-input="true"]');
      window.updateSelectedAppLabel(appIdInput ? appIdInput.value : '', '');
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
        <link rel="icon" type="image/png" href="/favicon.png" />
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
