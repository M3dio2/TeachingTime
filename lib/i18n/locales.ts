// The app's languages (I1). English is the source; the others are typed against it, so a
// missing or extra text is a type error. Chosen in the dashboard (teachers) or taken from the
// browser (students, logged-out pages); kept in the `tt-locale` cookie.
export const LOCALES = ["en", "de", "es", "fr"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "en";
export const LOCALE_COOKIE = "tt-locale";

// Each language in its own name, for the language menu.
export const LOCALE_NAMES: Record<Locale, string> = {
  en: "English",
  de: "Deutsch",
  es: "Español",
  fr: "Français",
};

// Excalidraw's language codes for the whiteboard's own menus.
export const EXCALIDRAW_LANG: Record<Locale, string> = { en: "en", de: "de-DE", es: "es-ES", fr: "fr-FR" };

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (LOCALES as readonly string[]).includes(value);
}

// The cookie wins; otherwise the browser's first supported language (Accept-Language);
// otherwise English.
export function pickLocale(cookie: string | undefined, acceptLanguage: string | null): Locale {
  if (isLocale(cookie)) return cookie;
  for (const part of (acceptLanguage ?? "").split(",")) {
    const tag = part.split(";")[0].trim().toLowerCase().slice(0, 2);
    if (isLocale(tag)) return tag;
  }
  return DEFAULT_LOCALE;
}
