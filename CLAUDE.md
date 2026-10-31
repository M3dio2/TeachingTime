@AGENTS.md

# TeachingTime (repo: lesson-call)

1-on-1 video lesson app for an English teacher and one student. Like Google Meet, plus: screen share with both cameras visible, a shared text pad and whiteboard that sync instantly, and a teacher toggle for whether the student may edit them.

## Current milestone
S1–S3, P1 and C1 done (speed, sign-up, security, passwords, classroom). Next: **L1 (tabbed call)**, then L2a PDFs, A1 audio, L2b PDF drawing, S5–S6, then the friends test (date to agree). See `docs/ROADMAP.md`. Update this line when a milestone is finished.

## Stack
- Next.js 16 (App Router) + React 19 + TypeScript + Tailwind v4. Next 16 differs from older versions, so check `node_modules/next/dist/docs/` before using Next APIs.
- **LiveKit Cloud** (`livekit-client`, `@livekit/components-react`) for audio, video, screen share, and all live sync over its data channel (Yjs, whiteboard, teacher messages).
- **Supabase** for teacher auth (`@supabase/ssr`; open sign-up, emails sent via the teacher's Gmail SMTP) and the `lessons` table (with snapshots). Not used for live sync.
- Text pad: Tiptap + Yjs. Whiteboard: Excalidraw, loaded with `dynamic(..., { ssr: false })`.
- Hosted on Vercel (Hobby). Supabase project and Vercel functions both in **US East** (`iad1` in `vercel.json`): keep them in the same region. Testers are in South America, later users global.

## Commands
- `npm run dev`: dev server at http://localhost:3000
- `npm run build`: must pass before every commit. Stop `npm run dev` first: a build rewrites `.next`, and the dev server then serves stale CSS until restarted with `.next/dev` deleted.
- `npm run lint`: ESLint.

## Environment
- Variable names live in `.env.local.example`. Real values go in `.env.local` (gitignored) and Vercel's env settings.
- Secrets (`LIVEKIT_API_SECRET`, `SUPABASE_SECRET_KEY`) only in server code (route handlers). Never prefix them with `NEXT_PUBLIC_`.
- Claude never asks for or handles secret values. The user pastes them in themselves.

## Architecture (short)
**Read `docs/ARCHITECTURE.md` before touching `lib/sync/`, the room or the API routes.**
- Role (`teacher`/`student`) is in the LiveKit token metadata, set by `/api/livekit-token`. Teachers sign up and log in (Supabase); a student joins with `invite_slug` + name, no account.
- One Yjs `Y.Doc` per join (text pad, `board`), synced peer-to-peer by `lib/sync/useYjsSync.ts`. "Student can edit" is a LiveKit attribute on the teacher, not in the doc. Teacher saves it to `lessons.doc_snapshot`.
- Edit permission is enforced twice: read-only editors on the student, and the teacher's client drops student updates.
- **`cacheComponents` is on.** Any component that reads `cookies()`, `params` or Supabase data must sit inside `<Suspense>`, or the build fails. Pattern: sync page, inner async component does the read. `createClient()` in `lib/supabase/server.ts` calls `await connection()` first.
- Auth redirects live in `proxy.ts` (Next 16's name for middleware).

## Layout
- `app/`: routes (`dashboard/`, `lesson/[id]/` teacher room, `join/[slug]/` student join, `api/`)
- `components/room/`: video layout and controls; `components/board/`: TextPad, Whiteboard; `components/ui/`: shared UI
- `lib/sync/`: data-channel transport and Yjs provider; `lib/supabase/`: Supabase clients
- `supabase/migrations/`: SQL, run manually in the Supabase SQL editor

## Design
- **Read `docs/DESIGN.md` before any UI work.** Use token classes (`bg-paper`, `text-ink-muted`, `bg-accent`, …), never raw hex or `neutral-*`/`blue-*`.
- LiveKit's stylesheet is unlayered and beats Tailwind on `.lk-*` elements: use inline `style` for sizes on LiveKit components.
- CSS changes not showing in dev: stop the server, delete `.next/dev`, restart, hard-reload.

## Workflow
- One milestone per session. Start by reading `docs/ROADMAP.md`.
- After building: `npm run build` and `npm run lint` pass → the user tests with two browser windows (normal + incognito as student) → commit on a feature branch, merge to `main` (Vercel deploys from `main`) → tick the roadmap and update "Current milestone".
- Branch switches can make a running `npm run dev` serve 404s. Restart it after committing.
- **Playwright** may only join the lesson titled **"Test"**, and only after asking the user. Real lessons may have a teacher live in them.
- Keep it simple: small app, no premature abstractions.
