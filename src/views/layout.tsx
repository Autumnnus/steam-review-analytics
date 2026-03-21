/** @jsxImportSource hono/jsx */
import type { FC, PropsWithChildren } from "hono/jsx";
import { STEAM_LANGUAGE_DEFINITIONS, UMAMI_SCRIPT_URL, UMAMI_BASE_URL, UMAMI_WEBSITE_ID, SITE_URL } from "../config";

type LayoutProps = PropsWithChildren<{
  title?: string;
}>;

export const Layout: FC<LayoutProps> = ({
  children,
  title = "Steam Review Analytics",
}) => {
  const hasUmami = Boolean(UMAMI_SCRIPT_URL && UMAMI_WEBSITE_ID);
  const umamiProxied = hasUmami && Boolean(UMAMI_BASE_URL);
  const languageLabels = JSON.stringify(
    Object.fromEntries(STEAM_LANGUAGE_DEFINITIONS.map((language) => [language.id, language.label])),
  ).replace(/</g, "\\u003c");
  const languageFlags = JSON.stringify(
    Object.fromEntries(STEAM_LANGUAGE_DEFINITIONS.map((language) => [language.id, language.flag])),
  ).replace(/</g, "\\u003c");
  const bootstrap = `
    window.reviewCharts = window.reviewCharts || new Map();
    window.reviewPayloads = window.reviewPayloads || new Map();
    window.reviewSortStates = window.reviewSortStates || new Map();
    window.lastReviewSortState = window.lastReviewSortState || { col: 'reviews', dir: 'desc' };
    window.trackEvent = (name, data = {}) => {
      if (!(window.umami && typeof window.umami.track === 'function')) return;
      try {
        window.umami.track(name, data);
      } catch (_) {}
    };
    window.reviewLanguageLabels = ${languageLabels};
    window.reviewLanguageFlags = ${languageFlags};
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
      const safeAppId = typeof appId === 'string' ? appId : String(appId || '');
      if (appIdInput) appIdInput.value = safeAppId;
      if (searchInput) {
        searchInput.value = appName;
        searchInput.setCustomValidity('');
      }
      if (suggestionsRoot) suggestionsRoot.innerHTML = '';
      window.updateSelectedAppLabel(safeAppId, appName);
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
        if (!window.reviewSortStates.has(scope)) {
          window.reviewSortStates.set(scope, { ...window.lastReviewSortState });
        }
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
        const flag =
          (window.reviewLanguageFlags && window.reviewLanguageFlags[languageId]) || '';
        const existing = payloadByLanguage.get(languageId);
        if (existing) {
          return {
            ...existing,
            label: window.reviewLanguageLabels[languageId] || existing.label || languageId,
            flag,
          };
        }
        return {
          language: languageId,
          label: window.reviewLanguageLabels[languageId] || languageId,
          reviewScore: 0,
          reviewScoreLabel: 'No data for this language',
          positive: 0,
          negative: 0,
          totalReviews: 0,
          positiveRatio: 0,
          flag,
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
      const sortState = window.reviewSortStates.get(scope) || { col: 'reviews', dir: 'desc' };
      const sortControlNodes = document.querySelectorAll(\`[data-scope="\${scope}"][data-sort-col]\`);
      if (sortControlNodes.length) {
        sortControlNodes.forEach((btn) => {
          const col = btn.getAttribute('data-sort-col');
          const isActive = col === sortState.col;
          const indicator = btn.querySelector('[data-sort-indicator]');
          if (indicator) indicator.textContent = isActive ? (sortState.dir === 'desc' ? ' ↓' : ' ↑') : '';
          const isDesktopHeader = btn.closest('[id$="-breakdown-header"]');
          if (isDesktopHeader) {
            const isRight = col === 'reviews';
            btn.className = \`\${isRight ? 'flex items-center justify-end gap-1' : 'flex items-center gap-1'} font-mono text-[10px] uppercase tracking-widest cursor-pointer select-none transition-colors \${isActive ? 'text-sky' : 'text-mist/40 hover:text-mist/70'}\`;
            return;
          }
          btn.className = \`inline-flex items-center rounded-full border px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.2em] transition-colors \${isActive ? 'border-sky/40 bg-sky/10 text-sky' : 'border-white/10 bg-white/5 text-mist/55'}\`;
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
        const valA = sortState.col === 'ratio' ? a.positiveRatio : a.totalReviews;
        const valB = sortState.col === 'ratio' ? b.positiveRatio : b.totalReviews;
        if (valA !== valB) {
          return sortState.dir === 'desc' ? valB - valA : valA - valB;
        }
        const ratioTieA = a.positiveRatio;
        const ratioTieB = b.positiveRatio;
        if (sortState.col === 'reviews' && ratioTieA !== ratioTieB) {
          return sortState.dir === 'desc' ? ratioTieB - ratioTieA : ratioTieA - ratioTieB;
        }
        return sortState.dir === 'desc' ? b.totalReviews - a.totalReviews : a.totalReviews - b.totalReviews;
      });
      if (breakdownNode) {
        breakdownNode.innerHTML = sortedLanguages
          .map((item) => {
            const hasData = item.totalReviews > 0;
            const ratio = hasData ? Math.round((item.positive / item.totalReviews) * 100) : 0;
            const reviewWidth = hasData && maxReviewsVal > 0 ? Math.round((item.totalReviews / maxReviewsVal) * 100) : 0;
            const isRatioSort = sortState.col === 'ratio';
            const ratioBarColor = ratio >= 80 ? '#10b981' : ratio >= 60 ? '#a3e635' : ratio >= 40 ? '#fbbf24' : '#f43f5e';
            const reviewBarColor = reviewWidth >= 80 ? '#38bdf8' : reviewWidth >= 50 ? '#0ea5e9' : '#0284c7';
            const reviewTextColor = reviewWidth >= 80 ? '#7dd3fc' : reviewWidth >= 50 ? '#38bdf8' : '#0ea5e9';
            const barColor = isRatioSort ? ratioBarColor : reviewBarColor;
            const barWidth = isRatioSort ? ratio : reviewWidth;
            const ratioTextColor = ratio >= 80 ? '#6ee7b7' : ratio >= 60 ? '#bef264' : ratio >= 40 ? '#fcd34d' : '#fda4af';
            const isCrownRatio = hasData && Math.abs(item.positive / item.totalReviews - maxRatioVal) < 1e-9;
            const isCrownReviews = hasData && item.totalReviews === maxReviewsVal;
            const primaryMetricHtml = hasData
              ? (isRatioSort
                ? \`\${ratio}%\${isCrownRatio ? crown : ''}\`
                : \`<span style="color:\${reviewTextColor}">\${item.totalReviews.toLocaleString('en-US')}</span>\${isCrownReviews ? crown : ''}\`)
              : '—';
            const secondaryMetricHtml = hasData
              ? (isRatioSort
                ? \`<span class="inline-flex items-center gap-0.5 text-sm font-mono tabular-nums text-white">\${item.totalReviews.toLocaleString('en-US')} reviews</span>\`
                : \`<span class="inline-flex items-center text-sm font-mono tabular-nums" style="color:\${ratioTextColor}">\${ratio}% positive</span>\`)
              : \`<span class="text-sm text-mist/30">No reviews</span>\`;
            const flagText = item.flag ? item.flag + ' ' : '';
            return \`<div class="rounded-xl border border-white/[0.07] bg-ink/40 px-3 py-3">
              <div class="flex items-start justify-between gap-3">
                <div class="min-w-0 text-sm font-medium text-white">\${flagText}\${item.label}</div>
                <div class="shrink-0 font-mono text-xs text-mist/55">\${primaryMetricHtml}</div>
              </div>
              <div class="mt-2 flex items-center gap-2 min-w-0">
                <div class="flex-1 h-1.5 rounded-full bg-white/10 overflow-hidden">\${hasData ? \`<div class="h-full rounded-full" style="width:\${barWidth}%;background-color:\${barColor}"></div>\` : ''}</div>
              </div>
              <div class="mt-2 text-left">\${secondaryMetricHtml}</div>
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
        window.trackEvent('search_select_game', { source: 'suggestion', appId });
        if (appId && appName) {
          window.saveCachedGame({
            appId: Number(appId),
            name: appName,
            imageUrl,
            steamUrl: \`https://store.steampowered.com/app/\${appId}\`
          });
        }
        window.runAnalyticsForSelectedGame();
        return;
      }
      const cachedGame = event.target.closest('[data-cached-game="true"]');
      if (cachedGame) {
        const appId = cachedGame.getAttribute('data-app-id') || '';
        const appName = cachedGame.getAttribute('data-app-name') || '';
        window.selectGame(appId, appName);
        window.trackEvent('search_select_game', { source: 'recent_games', appId });
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
      const current = window.reviewSortStates.get(scope) || { col: 'reviews', dir: 'desc' };
      const newDir = current.col === col ? (current.dir === 'desc' ? 'asc' : 'desc') : 'desc';
      const newSortState = { col, dir: newDir };
      window.reviewSortStates.set(scope, newSortState);
      window.lastReviewSortState = newSortState;
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
      const results = document.getElementById('results');
      if (results && results.querySelector('[data-review-scope]')) {
        results.style.opacity = '0.3';
        results.style.pointerEvents = 'none';
        results.style.transition = 'opacity 0.2s';
      }
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
        return;
      }
      window.trackEvent('analyze_submit', {
        appId: appIdInput ? appIdInput.value : '',
        selectedLanguageCount: window.getSelectedLanguages().length,
      });
    });
    document.addEventListener('DOMContentLoaded', () => {
      window.syncLanguageCount();
      const appIdInput = document.querySelector('[data-app-id-input="true"]');
      window.updateSelectedAppLabel(appIdInput ? appIdInput.value : '', '');
      window.hydrateReviewResults(document);
    });
    document.addEventListener('htmx:beforeRequest', (event) => {
      if (!event.detail || !event.detail.target || event.detail.target.id !== 'results') return;
      window.reviewCharts.forEach((charts) => charts.forEach((c) => c.destroy()));
      window.reviewCharts.clear();
      window.reviewPayloads.clear();
      event.detail.target.innerHTML = '<div class="rounded-[2rem] border border-white/10 bg-white/5 p-8 text-center text-mist/40 animate-pulse">Fetching game data...</div>';
    });
    document.addEventListener('htmx:afterSwap', (event) => {
      const results = document.getElementById('results');
      if (results) {
        results.style.opacity = '';
        results.style.pointerEvents = '';
        results.style.transition = '';
      }
      window.hydrateReviewResults(event.target);
      if (
        event.detail &&
        event.detail.target &&
        event.detail.target.id === 'results' &&
        event.detail.target.querySelector('[data-review-scope]')
      ) {
        const appIdInput = document.querySelector('[data-app-id-input="true"]');
        window.trackEvent('analyze_success', { appId: appIdInput ? appIdInput.value : '' });
      }
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
        {hasUmami ? (
          umamiProxied ? (
            // Dynamically inject tracker to avoid ad blocker element-selector rules (e.g. script[data-website-id])
            <script dangerouslySetInnerHTML={{ __html:
              `(function(){var s=document.createElement('script');s.src='/ux/tracker.js';s.async=true;s.setAttribute('data-website-id','${UMAMI_WEBSITE_ID}');s.setAttribute('data-host-url','${SITE_URL}');document.head.appendChild(s);})();`
            }} />
          ) : (
            <script
              defer
              data-website-id={UMAMI_WEBSITE_ID}
              src={UMAMI_SCRIPT_URL}
            />
          )
        ) : null}
        <style>{`
          *, *::before, *::after {
            box-sizing: border-box;
          }
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
