/** @jsxImportSource hono/jsx */
import type { SteamSearchSuggestion } from "../types/steam";

type SearchSuggestionsProps = {
  query: string;
  suggestions: SteamSearchSuggestion[];
};

export const SearchSuggestions = ({
  query,
  suggestions,
}: SearchSuggestionsProps) => {
  const trimmedQuery = query.trim();

  if (trimmedQuery.length < 2) {
    return (
      <div class="rounded-2xl border border-dashed border-white/10 bg-ink/80 px-4 py-3 text-sm text-mist/45">
        Type at least 2 characters to search Steam.
      </div>
    );
  }

  if (suggestions.length === 0) {
    return (
      <div class="rounded-2xl border border-dashed border-white/10 bg-ink/80 px-4 py-3 text-sm text-mist/45">
        No Steam results found for "{trimmedQuery}".
      </div>
    );
  }

  return (
    <div class="w-full min-w-0 max-w-full overflow-hidden rounded-2xl border border-white/10 bg-ink/95 shadow-2xl">
      {suggestions.map((suggestion) => (
        <button
          type="button"
          class="flex w-full min-w-0 max-w-full items-center gap-3 overflow-hidden border-b border-white/5 px-4 py-3 text-left transition hover:bg-white/5 last:border-b-0"
          data-app-suggestion="true"
          data-app-id={String(suggestion.appId)}
          data-app-name={suggestion.name}
          data-app-image-url={suggestion.imageUrl}
        >
          {suggestion.imageUrl ? (
            <img
              src={suggestion.imageUrl}
              alt=""
              class="h-10 w-[76px] shrink-0 rounded-lg object-cover"
            />
          ) : (
            <div class="h-10 w-[76px] shrink-0 rounded-lg bg-white/5" />
          )}
          <div class="min-w-0 max-w-full flex-1 overflow-hidden">
            <div class="truncate text-sm font-semibold text-white">
              {suggestion.name}
            </div>
            <div class="truncate font-mono text-[11px] uppercase tracking-[0.24em] text-mist/45">
              {suggestion.type} #{suggestion.appId}
            </div>
          </div>
        </button>
      ))}
    </div>
  );
};
