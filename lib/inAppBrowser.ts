// Asia: students usually get their link in a chat app (WeChat, LINE, KakaoTalk, Zalo, Facebook
// Messenger…), and tapping it opens the app's own little browser. Camera and microphone often
// don't work there. Detected from the user agent, so the join page can say "open this in your
// browser" before anything fails.

export type InAppBrowser = {
  app: string; // shown to the student: "WeChat", "LINE", …
  os: "ios" | "android" | "other";
  // A link that leaves the app for the real browser, where the app allows one.
  openUrl: string | null;
};

const APPS: [RegExp, string][] = [
  [/MicroMessenger/i, "WeChat"],
  [/\bLine\//, "LINE"],
  [/KAKAOTALK/i, "KakaoTalk"],
  [/Zalo/i, "Zalo"],
  [/Weibo/i, "Weibo"],
  [/DingTalk/i, "DingTalk"],
  [/\bQQ\//, "QQ"],
  [/FBAN|FBAV|FB_IAB/, "Facebook"],
  [/Messenger/i, "Messenger"],
  [/Instagram/i, "Instagram"],
  [/musical_ly|BytedanceWebview|TikTok/i, "TikTok"],
];

export function detectInAppBrowser(ua: string, href: string): InAppBrowser | null {
  const found = APPS.find(([re]) => re.test(ua));
  if (!found) return null;
  const app = found[1];
  const os = /iPhone|iPad|iPod/i.test(ua) ? "ios" : /Android/i.test(ua) ? "android" : "other";
  let openUrl: string | null = null;
  if (app === "LINE") {
    // LINE opens links with this parameter in the phone's own browser.
    const url = new URL(href);
    url.searchParams.set("openExternalBrowser", "1");
    openUrl = url.toString();
  } else if (os === "android" && app !== "WeChat" && app !== "QQ") {
    // Android: an intent link hands the page to the default browser (WeChat and QQ block these).
    const url = new URL(href);
    openUrl = `intent://${url.host}${url.pathname}${url.search}#Intent;scheme=https;action=android.intent.action.VIEW;end`;
  }
  return { app, os, openUrl };
}

// The join page's connection test (components/room/ConnectionTest.tsx): one plain verdict from
// LiveKit's measurements. Video needs roughly 0.3–1 Mbit/s up; past ~450 ms delay or ~6 % lost
// packets a conversation gets hard.
export type Verdict = "good" | "ok" | "weak" | "blocked";

export function verdictOf(s: { rttMs: number; lossPct: number; upMbps: number } | null): Verdict {
  if (!s) return "blocked";
  if (s.rttMs < 250 && s.lossPct < 2 && s.upMbps > 0.6) return "good";
  if (s.rttMs < 450 && s.lossPct < 6 && s.upMbps > 0.25) return "ok";
  return "weak";
}
