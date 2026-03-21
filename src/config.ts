export const PORT = Number(Bun.env.PORT ?? 3000);
export const CACHE_TTL_MS = Number(Bun.env.CACHE_TTL_MS ?? 15 * 60 * 1000);
export const STORE_LANGUAGE = Bun.env.STORE_LANGUAGE ?? "english";

export const STEAM_LANGUAGE_DEFINITIONS = [
  { id: "arabic", label: "Arabic", aliases: ["arabic"] },
  { id: "bulgarian", label: "Bulgarian", aliases: ["bulgarian"] },
  { id: "schinese", label: "Simplified Chinese", aliases: ["simplified chinese", "schinese"] },
  { id: "tchinese", label: "Traditional Chinese", aliases: ["traditional chinese", "tchinese"] },
  { id: "czech", label: "Czech", aliases: ["czech"] },
  { id: "danish", label: "Danish", aliases: ["danish"] },
  { id: "dutch", label: "Dutch", aliases: ["dutch"] },
  { id: "english", label: "English", aliases: ["english"] },
  { id: "finnish", label: "Finnish", aliases: ["finnish"] },
  { id: "french", label: "French", aliases: ["french"] },
  { id: "german", label: "German", aliases: ["german"] },
  { id: "greek", label: "Greek", aliases: ["greek"] },
  { id: "hungarian", label: "Hungarian", aliases: ["hungarian"] },
  { id: "indonesian", label: "Indonesian", aliases: ["indonesian"] },
  { id: "italian", label: "Italian", aliases: ["italian"] },
  { id: "japanese", label: "Japanese", aliases: ["japanese"] },
  { id: "koreana", label: "Korean", aliases: ["korean", "koreana"] },
  { id: "latam", label: "Spanish - Latin America", aliases: ["spanish - latin america", "latam"] },
  { id: "norwegian", label: "Norwegian", aliases: ["norwegian"] },
  { id: "polish", label: "Polish", aliases: ["polish"] },
  { id: "portuguese", label: "Portuguese - Portugal", aliases: ["portuguese - portugal", "portuguese"] },
  { id: "brazilian", label: "Portuguese - Brazil", aliases: ["portuguese - brazil", "brazilian"] },
  { id: "romanian", label: "Romanian", aliases: ["romanian"] },
  { id: "russian", label: "Russian", aliases: ["russian"] },
  { id: "spanish", label: "Spanish - Spain", aliases: ["spanish - spain", "spanish"] },
  { id: "swedish", label: "Swedish", aliases: ["swedish"] },
  { id: "thai", label: "Thai", aliases: ["thai"] },
  { id: "turkish", label: "Turkish", aliases: ["turkish"] },
  { id: "ukrainian", label: "Ukrainian", aliases: ["ukrainian"] },
  { id: "vietnamese", label: "Vietnamese", aliases: ["vietnamese"] },
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
  "koreana",
  "russian",
  "portuguese",
  "spanish",
  "german",
  "french",
  "turkish",
  "latam",
  "polish",
  "tchinese",
  "japanese",
  "italian",
  "thai",
  "ukrainian",
  "czech",
  "brazilian",
  "hungarian",
  "dutch",
  "swedish",
  "norwegian",
  "danish",
  "finnish",
  "romanian",
  "vietnamese",
  "greek",
  "indonesian",
  "bulgarian",
  "arabic",
] as const;
