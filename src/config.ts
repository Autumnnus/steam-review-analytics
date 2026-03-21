export const PORT = Number(Bun.env.PORT ?? 3000);
export const CACHE_TTL_MS = Number(Bun.env.CACHE_TTL_MS ?? 60 * 60 * 1000);
export const STORE_LANGUAGE = Bun.env.STORE_LANGUAGE ?? "english";
export const APP_ORIGIN = Bun.env.APP_ORIGIN?.trim() || "";

export const STEAM_LANGUAGE_DEFINITIONS = [
  { id: "arabic", label: "Arabic", flag: "🇸🇦", aliases: ["arabic"] },
  { id: "bulgarian", label: "Bulgarian", flag: "🇧🇬", aliases: ["bulgarian"] },
  { id: "schinese", label: "Simplified Chinese", flag: "🇨🇳", aliases: ["simplified chinese", "schinese"] },
  { id: "tchinese", label: "Traditional Chinese", flag: "🇹🇼", aliases: ["traditional chinese", "tchinese"] },
  { id: "czech", label: "Czech", flag: "🇨🇿", aliases: ["czech"] },
  { id: "danish", label: "Danish", flag: "🇩🇰", aliases: ["danish"] },
  { id: "dutch", label: "Dutch", flag: "🇳🇱", aliases: ["dutch"] },
  { id: "english", label: "English", flag: "🇬🇧", aliases: ["english"] },
  { id: "finnish", label: "Finnish", flag: "🇫🇮", aliases: ["finnish"] },
  { id: "french", label: "French", flag: "🇫🇷", aliases: ["french"] },
  { id: "german", label: "German", flag: "🇩🇪", aliases: ["german"] },
  { id: "greek", label: "Greek", flag: "🇬🇷", aliases: ["greek"] },
  { id: "hungarian", label: "Hungarian", flag: "🇭🇺", aliases: ["hungarian"] },
  { id: "indonesian", label: "Indonesian", flag: "🇮🇩", aliases: ["indonesian"] },
  { id: "italian", label: "Italian", flag: "🇮🇹", aliases: ["italian"] },
  { id: "japanese", label: "Japanese", flag: "🇯🇵", aliases: ["japanese"] },
  { id: "koreana", label: "Korean", flag: "🇰🇷", aliases: ["korean", "koreana"] },
  { id: "latam", label: "Spanish - Latin America", flag: "🌎", aliases: ["spanish - latin america", "latam"] },
  { id: "norwegian", label: "Norwegian", flag: "🇳🇴", aliases: ["norwegian"] },
  { id: "polish", label: "Polish", flag: "🇵🇱", aliases: ["polish"] },
  { id: "portuguese", label: "Portuguese - Portugal", flag: "🇵🇹", aliases: ["portuguese - portugal", "portuguese"] },
  { id: "brazilian", label: "Portuguese - Brazil", flag: "🇧🇷", aliases: ["portuguese - brazil", "brazilian"] },
  { id: "romanian", label: "Romanian", flag: "🇷🇴", aliases: ["romanian"] },
  { id: "russian", label: "Russian", flag: "🇷🇺", aliases: ["russian"] },
  { id: "spanish", label: "Spanish - Spain", flag: "🇪🇸", aliases: ["spanish - spain", "spanish"] },
  { id: "swedish", label: "Swedish", flag: "🇸🇪", aliases: ["swedish"] },
  { id: "thai", label: "Thai", flag: "🇹🇭", aliases: ["thai"] },
  { id: "turkish", label: "Turkish", flag: "🇹🇷", aliases: ["turkish"] },
  { id: "ukrainian", label: "Ukrainian", flag: "🇺🇦", aliases: ["ukrainian"] },
  { id: "vietnamese", label: "Vietnamese", flag: "🇻🇳", aliases: ["vietnamese"] },
] as const;

export const LANGUAGE_LABELS = new Map<string, string>(
  STEAM_LANGUAGE_DEFINITIONS.map((option) => [option.id, option.label]),
);

export const LANGUAGE_ALIAS_TO_ID = new Map<string, string>(
  STEAM_LANGUAGE_DEFINITIONS.flatMap((option) => option.aliases.map((alias) => [alias, option.id] as const)),
);

export const DEFAULT_SELECTED_LANGUAGE_IDS = [
  "english",
  "schinese",
  "tchinese",
  "russian",
  "german",
  "french",
  "koreana",
  "spanish",
  "brazilian",
  "japanese",
  "polish",
  "turkish",
] as const;

export const BROWSER_LOCALE_TO_STEAM_LANGUAGE: Record<string, string> = {
  ar: "arabic",
  bg: "bulgarian",
  "zh-cn": "schinese",
  "zh-sg": "schinese",
  zh: "schinese",
  "zh-tw": "tchinese",
  "zh-hk": "tchinese",
  "zh-mo": "tchinese",
  cs: "czech",
  da: "danish",
  nl: "dutch",
  en: "english",
  fi: "finnish",
  fr: "french",
  de: "german",
  el: "greek",
  hu: "hungarian",
  id: "indonesian",
  it: "italian",
  ja: "japanese",
  ko: "koreana",
  "es-419": "latam",
  no: "norwegian",
  pl: "polish",
  pt: "portuguese",
  "pt-br": "brazilian",
  ro: "romanian",
  ru: "russian",
  es: "spanish",
  sv: "swedish",
  th: "thai",
  tr: "turkish",
  uk: "ukrainian",
  vi: "vietnamese",
};
