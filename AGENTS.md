<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# TeachingTime (teachingtime.app)

Instructions for every agent (Claude Code via `CLAUDE.md`, Hermes etc. directly). `next dev` only rewrites the block above.

1-on-1 video lessons, one English teacher and one student: Google Meet plus screen share with both cameras visible, a shared text pad and whiteboard that sync instantly, and a teacher switch for whether the student may edit them.

## Current milestone
S1–S3, P1, C1, C1b, L1, L2a, L2b, A1, D5d and the S5 page redesign done (all still need their real-device test, see the roadmap). Next: the rest of S5 (walkthrough with the user, real phone test), S6, friends test (date to agree). Update this line when a milestone is done.

## Read first
- `docs/ROADMAP.md` every session; one milestone per session.
- `docs/ARCHITECTURE.md` before touching `lib/sync/`, the room or API routes.
- `docs/DESIGN.md` before any UI work; new UI: `docs/design/HANDOFF.md` + `docs/design/screens/`.
- `node_modules/next/dist/docs/` before using Next APIs.

## Stack
- Next.js 16 App Router, React 19, TypeScript, Tailwind v4; Vercel Hobby, deploys from `main`.
- LiveKit Cloud (`livekit-client`, `@livekit/components-react`): audio, video, screen share, and all live sync over its data channel (Yjs, whiteboard, teacher messages).
- Supabase: teacher auth (`@supabase/ssr`, open sign-up with Turnstile, mail via the teacher's Gmail SMTP), `lessons` (with snapshots), `resources` + private Storage bucket. Not for live sync.
- Text pad Tiptap + Yjs; whiteboard Excalidraw via `dynamic(..., { ssr: false })`.
- Supabase and Vercel functions both in US East (`iad1`, `vercel.json`): keep them together. Testers in South America, later global.

## Commands
- `npm run dev` → http://localhost:3000 (container: `npm run dev -- -H 0.0.0.0`).
- `npm run build` must pass before every commit. Stop `npm run dev` first, or the dev server serves stale CSS until restarted with `.next/dev` deleted.
- `npm run lint`; `npm run test:e2e` (Playwright, below).
- GitHub Actions (`.github/workflows/check.yml`) runs lint, build and `npm audit` on every push to `main` and every PR; check it went green after pushing (the repo is public: `https://api.github.com/repos/M3dio2/lesson-call/actions/runs`).
- New outside service in the browser (a CDN, an API)? Add its origin to the CSP in `next.config.ts`, or it's blocked; `e2e/security-csp.spec.ts` catches it.

## Secrets
- Names in `.env.local.example`; values in `.env.local` (gitignored) and Vercel.
- `LIVEKIT_API_SECRET`, `SUPABASE_SECRET_KEY`: server code (route handlers) only, never `NEXT_PUBLIC_`.
- Never ask for, print or handle secret values (no `cat .env.local`); the user pastes them.

## Architecture (short)
- Role (`teacher`/`student`) is in the LiveKit token metadata from `/api/livekit-token`. Teachers log in; students join with `invite_slug` + name.
- One Yjs `Y.Doc` per join (text pad, `board`), synced peer-to-peer by `lib/sync/useYjsSync.ts`, saved by the teacher to `lessons.doc_snapshot`.
- "Student can edit" is a LiveKit attribute on the teacher (not in the doc), enforced twice: read-only editors on the student, the teacher's client drops student updates.
- `cacheComponents` is on: anything reading `cookies()`, `params` or Supabase must sit inside `<Suspense>` or the build fails (sync page, inner async component). `createClient()` (`lib/supabase/server.ts`) calls `await connection()` first.
- Auth redirects: `proxy.ts` (Next 16's middleware).

## Layout
- `app/`: `dashboard/`, `dashboard/[id]/` classroom, `lesson/[id]/` teacher room, `join/[slug]/` student join, `api/`
- `components/room/` video + controls · `components/board/` TextPad, Whiteboard · `components/ui/` shared UI
- `lib/sync/` transport + Yjs provider · `lib/supabase/` clients · `supabase/migrations/` SQL the user runs in the Supabase SQL editor · `e2e/` Playwright tests · `docs/design/` redesign

## UI rules
- Token classes (`bg-paper`, `text-ink-muted`, `bg-accent` …), never raw hex or `neutral-*`/`blue-*`.
- LiveKit's unlayered CSS beats Tailwind on `.lk-*`: size LiveKit components with inline `style`.
- CSS not updating in dev: stop the server, delete `.next/dev`, restart, hard-reload.

## Workflow
The agent develops on its own and tests itself; the user decides function and design.
- **Plan:** a short spec for the milestone in the roadmap (what changes, open questions). Ask the user only real choices (behaviour, wording, design direction); decide the rest and note it.
- **UX/UI:** ask the user first with an **HTML mock-up** (claude.ai artifact or `docs/mockups/`). The redesign's mock-ups already exist in `docs/design/` (L1, L2a, A1, S5): build from those. After building, send screenshots (desktop and phone) before merging.
- **Build** on a feature branch, never straight on `main`.
- **Test:** `npm run build`, `npm run lint`, `npm run test:e2e` all pass. Add or extend an `e2e/` test per milestone. List what still needs a real device (camera, phone, live site) for the user.
- **Merge:** when tests pass, the agent may commit, merge to `main` (Vercel deploys from `main`) and push without asking; UI changes wait for the user's OK on the screenshots. Then tick the roadmap and update "Current milestone".
- VPS: the user tests through `ssh -L 3000:localhost:3000 …` at http://localhost:3000. Camera/mic need `localhost` or `https`, never `http://<server-ip>`.
- Branch switches can make `npm run dev` serve 404s: restart it after committing.

## Browser tests (Playwright)
- Name lookups are substring matches: use `exact: true` for headings like "Your classrooms" (the loading screen says "Loading your classrooms").
- `npm run test:e2e` runs `e2e/*.spec.ts` against the running dev server: Chromium with a fake camera and mic, teacher and student as two browser contexts in one test.
- They log in as the **test teacher account** (`E2E_TEACHER_EMAIL` / `E2E_TEACHER_PASSWORD` in `.env.local`, pasted by the user) and use only its classroom and lesson titled **"Test"** (no need to ask). Never a real teacher's account or lesson: real lessons may have a teacher live in them.
- Until the friends test this runs against production Supabase and LiveKit (user's decision); after it, against the dev projects.
- Call tests: `startTestLesson` and `joinAsStudent` in `e2e/helpers.ts` give a teacher and a student in the "Test" lesson. Screen sharing works headless (Chromium flags in `playwright.config.ts`).
- Screenshots for the user: a throwaway spec plus a config that spreads `playwright.config.ts` with another `testDir`, kept outside the repo; don't commit them.
- First time on a machine: `npx playwright install chromium`. In the agent container set `PLAYWRIGHT_BROWSERS_PATH=/opt/data/.cache/ms-playwright` (the default folder isn't writable).

## Always
- Keep it simple: small app, no premature abstractions.
- Anything the next session needs (open tests, half-done work) goes in `docs/ROADMAP.md`, not an agent's memory: the user switches agents and machines.
