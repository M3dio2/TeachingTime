import { de } from "./de";
import { en } from "./en";
import { es } from "./es";
import { fr } from "./fr";
import type { Locale } from "./locales";

// All texts of one language: `t.dashboard.title`, `t.room.filesCount(3)`. Texts that need
// numbers or names are functions. Type: English is the source of truth.
export type Messages = typeof en;

export const MESSAGES: Record<Locale, Messages> = { en, de, es, fr };
