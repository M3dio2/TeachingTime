"use client";

import { createContext, useContext, useEffect } from "react";
import { DEFAULT_LOCALE, type Locale } from "./locales";
import { MESSAGES, type Messages } from "./messages";

const LocaleContext = createContext<Locale>(DEFAULT_LOCALE);

// Set once per page by app/(app)/layout.tsx with the locale the server picked, so the server
// render and the browser agree. Pages outside it (start page, legal pages) stay in English.
export function I18nProvider({ locale, children }: { locale: Locale; children: React.ReactNode }) {
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);
  return <LocaleContext.Provider value={locale}>{children}</LocaleContext.Provider>;
}

export function useLocale(): Locale {
  return useContext(LocaleContext);
}

// The current language's texts, e.g. `const t = useT(); t.common.save`.
export function useT(): Messages {
  return MESSAGES[useContext(LocaleContext)];
}
