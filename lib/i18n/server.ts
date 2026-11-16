import "server-only";
import { cookies, headers } from "next/headers";
import { LOCALE_COOKIE, pickLocale, type Locale } from "./locales";
import { MESSAGES, type Messages } from "./messages";

// The request's language (cookie, else the browser's). Reads cookies and headers, so under
// cacheComponents call it inside <Suspense> (or in a route handler / server action).
export async function getLocale(): Promise<Locale> {
  const [cookieStore, headerList] = await Promise.all([cookies(), headers()]);
  return pickLocale(cookieStore.get(LOCALE_COOKIE)?.value, headerList.get("accept-language"));
}

// The request's texts, for server components, server actions and route handlers.
export async function getT(): Promise<Messages> {
  return MESSAGES[await getLocale()];
}
