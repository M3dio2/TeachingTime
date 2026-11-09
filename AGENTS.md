<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# TeachingTime (repo: lesson-call)

These are the project instructions for every coding agent (Claude Code reads them through `CLAUDE.md`, Hermes and others read this file directly). `next dev` only rewrites the block above; everything below it is ours.

1-on-1 video lesson app for an English teacher and one student. Like Google Meet, plus: screen share with both cameras visible, a shared text pad and whiteboard that sync instantly, and a teacher toggle for whether the student may edit them.

## Current milestone
S1–S3, P1 and C1 done (speed, sign-up, security, passwords, classroom). **First: finish C1b** (storage limits, branch `c1b-storage-limits`, see the C1 section in `docs/ROADMAP.md`). Next: **L1 (tabbed call)**, then L2a PDFs, A1 audio, L2b PDF drawing, S5–S6, then the friends test (date to agree). See `docs/ROADMAP.md`. Update this line when a milestone is finished.

## Stack
- Next.js 16 (App Router) + React 19 + TypeScript + Tailwind v4. Next 16 differs from older versions, so check `node_modules/next/dist/docs/` before using Next APIs.
- **LiveKit Cloud** (`livekit-client`, `@livekit/components-react`) for audio, video, screen share, and all live sync over its data channel (Yjs, whiteboard, teacher messages).
- **Supabase** for teacher auth (`@supabase/ssr`; open sign-up, emails sent via the teacher's Gmail SMTP), the `lessons` table (with snapshots) and the `resources` table + private Storage bucket. Not used for live sync.
- Text pad: Tiptap + Yjs. Whiteboard: Excalidraw, loaded with `dynamic(..., { ssr: false })`.
- Hosted on Vercel (Hobby). Supabase project and Vercel functions both in **US East** (`iad1` in `vercel.json`): keep them in the same region. Testers are in South America, later users global.

## Commands
- `npm run dev`: dev server at http://localhost:3000. In a container, use `npm run dev -- -H 0.0.0.0` so the published port reaches it.
- `npm run build`: must pass before every commit. Stop `npm run dev` first: a build rewrites `.next`, and the dev server then serves stale CSS until restarted with `.next/dev` deleted.
- `npm run lint`: ESLint.

## Environment
- Variable names live in `.env.local.example`. Real values go in `.env.local` (gitignored) and Vercel's env settings.
- Secrets (`LIVEKIT_API_SECRET`, `SUPABASE_SECRET_KEY`) only in server code (route handlers). Never prefix them with `NEXT_PUBLIC_`.
- The agent never asks for, prints or handles secret values (don't `cat .env.local`). The user pastes them in themselves.

## Architecture (short)
**Read `docs/ARCHITECTURE.md` before touching `lib/sync/`, the room or the API routes.**
- Role (`teacher`/`student`) is in the LiveKit token metadata, set by `/api/livekit-token`. Teachers sign up and log in (Supabase); a student joins with `invite_slug` + name, no account.
- One Yjs `Y.Doc` per join (text pad, `board`), synced peer-to-peer by `lib/sync/useYjsSync.ts`. "Student can edit" is a LiveKit attribute on the teacher, not in the doc. Teacher saves it to `lessons.doc_snapshot`.
- Edit permission is enforced twice: read-only editors on the student, and the teacher's client drops student updates.
- **`cacheComponents` is on.** Any component that reads `cookies()`, `params` or Supabase data must sit inside `<Suspense>`, or the build fails. Pattern: sync page, inner async component does the read. `createClient()` in `lib/supabase/server.ts` calls `await connection()` first.
- Auth redirects live in `proxy.ts` (Next 16's name for middleware).

## Layout
- `app/`: routes (`dashboard/`, `dashboard/[id]/` classroom, `lesson/[id]/` teacher room, `join/[slug]/` student join, `api/`)
- `components/room/`: video layout and controls; `components/board/`: TextPad, Whiteboard; `components/ui/`: shared UI
- `lib/sync/`: data-channel transport and Yjs provider; `lib/supabase/`: Supabase clients
- `supabase/migrations/`: SQL, run manually by the user in the Supabase SQL editor

## Design
- **Read `docs/DESIGN.md` before any UI work.** Use token classes (`bg-paper`, `text-ink-muted`, `bg-accent`, …), never raw hex or `neutral-*`/`blue-*`.
- LiveKit's stylesheet is unlayered and beats Tailwind on `.lk-*` elements: use inline `style` for sizes on LiveKit components.
- CSS changes not showing in dev: stop the server, delete `.next/dev`, restart, hard-reload.

## Workflow
The agent develops on its own and tests itself; the user decides function and design.
- One milestone per session. Start by reading `docs/ROADMAP.md`.
- **Plan:** write a short spec for the milestone into the roadmap (what changes, open questions). Ask the user only real choices: behaviour, wording, design direction; decide the rest and note it.
- **UX/UI changes:** ask the user first, with an **HTML mock-up** (claude.ai artifact or a file in `docs/mockups/`) before building. After building, send screenshots (desktop and phone) before merging.
- **Build** on a feature branch. Never commit straight to `main`.
- **Test:** `npm run build`, `npm run lint`, `npm run test:e2e` (Playwright, below) all pass. Add or extend a test in `e2e/` for each milestone. List what still needs a real device (real camera, phone, live site) for the user.
- **Merge:** when the tests pass, the agent may commit, merge to `main` (Vercel deploys from `main`) and push without asking, except UI changes, which wait for the user's OK on the screenshots. Then tick the roadmap and update "Current milestone".

## Browser tests (Playwright)
- `npm run test:e2e` runs `e2e/*.spec.ts` against the running dev server, Chromium with a fake camera and mic. Teacher and student are two browser contexts in one test.
- They log in as the **test teacher account** (`E2E_TEACHER_EMAIL` / `E2E_TEACHER_PASSWORD` in `.env.local`, pasted by the user) and use only its classroom and lesson titled **"Test"**. Never a real teacher's account or lesson.
- Until the friends test this runs against production Supabase and LiveKit (user's decision); after it, against the dev projects.
- First time on a machine: `npx playwright install chromium`. In the agent container the default browser folder isn't writable: set `PLAYWRIGHT_BROWSERS_PATH=/opt/data/.cache/ms-playwright`.
- On the VPS the user tests through an SSH tunnel (`ssh -L 3000:localhost:3000 …`) and opens http://localhost:3000 on their own computer. Camera and mic only work on `localhost` or `https`, never on `http://<server-ip>`.
- Branch switches can make a running `npm run dev` serve 404s. Restart it after committing.
- **Playwright** may only join the lesson titled **"Test"** of the test teacher account (no need to ask). Real lessons may have a teacher live in them.
- Keep it simple: small app, no premature abstractions.
- Write anything the next session must know (open tests, half-done work) into `docs/ROADMAP.md`, not into an agent's private memory: the user switches between agents and machines.
