# TeachingTime in Asia: what stands in the way, what to do

Written 26 Nov 2026. Three groups matter: students in Asia (Japan, Korea, China, Vietnam,
Thailand, Indonesia), tutors in Asia (the Philippines especially: many online English tutors,
mostly teaching Japanese, Korean and Chinese students), and teachers elsewhere with Asian students.

## What already works
- English UI is fine for most tutors (Philippines, India, Singapore, Malaysia).
- Times are shown in each person's own time zone (next lesson, calendar file), so cross-border lessons line up.
- LiveKit Cloud connects each person to the nearest of its regions (it has Asian ones), so the call itself is routed well.
- Email login, no app to install, the student needs no account.

## Problems found
| # | Problem | Who it hits | Fix | Size |
|---|---------|-------------|-----|------|
| 1 | Student join page and room only in en/de/es/fr | Students in Japan, Korea, China, Vietnam… | Add 简体中文, 日本語, 한국어 first (student-facing texts first: join page, room, quiz), later 繁體中文, Tiếng Việt, ไทย, Bahasa Indonesia | M per language |
| 2 | Quiz "Put in order" (sentence) splits on spaces: Chinese, Japanese and Thai have none | Teachers of those languages | In those languages use "/" between the pieces (like the other question types) | S |
| 3 | Full-width characters (ＡＢＣ, ？, spaces typed with a Japanese/Chinese keyboard) make right answers count as wrong | Asian students in any quiz | Normalise with NFKC before comparing | S |
| 4 | Fonts: Geist/Bricolage have no Chinese/Japanese/Korean letters; the browser picks some fallback | Everyone reading CJK | Add a proper CJK font stack (PingFang, Hiragino Sans, Noto Sans CJK, Microsoft YaHei, Malgun Gothic), Korean `word-break: keep-all` | S |
| 5 | Links opened inside WeChat, LINE, KakaoTalk (in-app browsers) often can't use the camera | Students who get the link in a chat app (the normal case in Asia) | Detect in-app browsers on the join page: "Open this in Safari/Chrome" with a copy button | S |
| 6 | China: Google sign-in, Google Drive, Dropbox, YouTube are blocked; Vercel and LiveKit may be slow or blocked any day | Students and teachers in mainland China | Short term: say so in the FAQ, keep email login and uploads (they work). Real fix: hosting inside China (ICP licence + Chinese company/partner + Alibaba/Tencent Cloud) | S now / XL later |
| 7 | Server functions run in Washington (iad1), pages from the nearest edge | Everyone far from the US (Asia: +200–300 ms per action) | Put functions in the same region as the Supabase database; later a second region | S (check) |
| 8 | Reminders: "Copy a reminder" is plain text; in Asia people use LINE, KakaoTalk, WeChat | Teachers | A "Share" button (the phone's own share sheet: LINE, Kakao, WeChat, WhatsApp) | S |
| 9 | Payment later: cards only | Paying teachers in Asia | Stripe with Alipay, WeChat Pay, PayPay, GrabPay when pricing comes | later |
| 10 | Privacy law: Japan (APPI), Korea (PIPA), China (PIPL) want cross-border data transfer named | Legal | One paragraph in the privacy policy (data stored in the EU/US) | S |

## Suggested order
1. Quick fixes, one branch: 2, 3, 4, 5, 8 (and check 7).
2. Japanese and Korean for the student side (join page, room, quiz), then Chinese.
3. Promotion: Filipino tutor groups on Facebook (English UI is fine for them), Japanese/Korean tutoring communities once the languages exist.
4. China hosting only if real demand shows up (it's a company-level step).
