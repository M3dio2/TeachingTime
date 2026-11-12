# Roadmap

Tick items off as they're done. One milestone per working session. Details of finished work are in git history.

## Done
- M1 Scaffold (Next.js, GitHub, Vercel; first at lesson-call-five.vercel.app, now teachingtime.app)
- M2 Video call (LiveKit, token route) · M3 Screen share with both cameras in the sidebar
- M4 Auth + lessons (Supabase, RLS, dashboard, student join by slug)
- M5 Shared text pad (Tiptap + Yjs over LiveKit data streams) · M6 Whiteboard (Excalidraw)
- M7 Edit permission + snapshots + Clear · M8 Error states, mobile check, production call test
- D1 Design system (`docs/DESIGN.md`, `components/ui/`) · D1b Dashboard with student cards, quick call
- D2 Resizable desktop layout · D3 Board panel, (!) nudge, room restyle · D4 Phone layout
- F1 One quick call · F2 Big cameras without share · F3 One join per person · F4 Whiteboard fixes · F5 Teacher's name · F6 Icon controls + muting
- D5a–c "Highlighter" refresh (mock-up: claude.ai/artifact/96VPE4fW6muQeC482KAAjt): TeachingTime name, marker tokens and strokes, loading/join/goodbye moments

# Friends test (date to agree once C1 and L1 show the pace)
Goal: friends can sign up as teachers and give lessons with their own material. The first plan (by 1 Nov) only had sign-up and audio; after looking at similar products, classrooms, a tabbed call and PDFs come first.

## S1: Speed (was M10)
Vercel functions ran in North America while Supabase was in US West, so each page waited on several long round trips. Fix: both in the same region. Testing happens in South America, later users are global, so US East is the middle ground (round trips from Chile: São Paulo ~125 ms, US East ~215 ms, Frankfurt ~300 ms). Video is unaffected (LiveKit picks the nearest edge).
- [x] Measure before: one Supabase lookup via the token route 0.4–0.65 s from the dev server (log: "application-code")
- [x] New Supabase project in US East (`us-east-1`): run `supabase/migrations/` in order, recreate the teacher account (old lessons are not copied)
- [x] Swap the Supabase keys in `.env.local` and Vercel (the user pastes them); Vercel region `iad1` in `vercel.json`
- [x] Measure after: the database lookup now adds only ~0.05–0.1 s on the live site (token route with vs without a lookup); the rest is the network from Chile to US East

## S2: Teacher sign-up (replaces M9)
- [x] `/signup` page (name, email, password) with `supabase.auth.signUp`; the name goes into `display_name` metadata
- [x] Email confirmation link → `/auth/confirm` route; "Check your email" screen; `/link-expired` for bad links
- [x] "Forgot password" on the login page, with a reset page; friendly error messages (`lib/authErrors.ts`)
- [x] `proxy.ts`: sign-up and forgot-password for logged-out visitors, reset page needs the link's login
- [x] User, in Supabase: Gmail as custom SMTP, sign-ups on with "Confirm email", minimum password 8, email templates, redirect URLs
- [x] Test: sign up with a second email, confirm, reset password (live and local)
- [x] An empty dashboard welcomes a new teacher (designed: `Dashboard-new`; built in S5)
- [x] Update "Teacher account" in `docs/ARCHITECTURE.md`

## S3: Security check (before inviting friends)
- [x] RLS (code): `lessons` is the only table; one policy, `teacher_id = auth.uid()` for read and write, so a teacher can't read, change or hand over another teacher's rows. No files yet (S4).
- [x] Supabase Security Advisor: only "leaked password protection is disabled" (HaveIBeenPwned check, Pro plan only). Nothing about tables or RLS.
- [x] Token route: student tokens only for an existing slug; slugs are 10 random characters from 32 (50 bits, not guessable); 4 h tokens; nobody gets room admin. **Fixed:** quick-call links stop working after 12 h, not only once the dashboard deletes them.
- [x] Teacher-only messages. Mute: sent by the server, the student ignores copies from participants (already). **Fixed:** "student can edit" was in the Y.Doc, and the teacher always accepts full diffs from the student, so a tampered student client could switch it on. Now it's in the teacher's LiveKit attributes, which only the teacher's token may set (`lib/sync/useStudentCanEdit.ts`); it starts off on every join. **Fixed:** the (!) nudge is only accepted from the teacher.
- [x] `/api/mute` checks ownership (RLS lookup); Remove/End/Leave are server actions that delete through RLS and only close the room of a row they deleted
- [x] No secret in `NEXT_PUBLIC_*` or the client bundle (checked the built chunks for secret names and key prefixes)
- [x] Supabase rate limit: about 10 emails per hour (Gmail allows ~500/day; a sign-up bot would burn the account). Stronger passwords in P1; CAPTCHA (Turnstile) later, see below.
- [x] Security headers in `next.config.ts`: no framing (CSP `frame-ancestors` + `X-Frame-Options`), `nosniff`, referrer policy, camera/mic/screen only for the app itself
- [x] **Fixed:** open redirect in `/auth/confirm`: `next=/\evil.com` passed the "starts with /" check, and browsers read it as another site. Now checked on the parsed URL.
- [x] Findings written here, plus the "Before going commercial" list below

A strict script CSP is left out (needs a nonce per request, which makes every page dynamic).

### Security review, phase 1 (Nov 2026, branch `security-1`)
- [x] Next 16.4.6 and React 19.3.1 (the Oct/Nov Cache-Components and RSC fixes); dev-only audit fixes
- [x] Student tokens: `canPublishSources` camera + microphone only; `roomConfig` with 2 participants and a 5-minute empty timeout; the room only treats the teacher's screen track as "sharing"
- [x] A full-state diff is applied only from a peer we asked, and each peer gets at most one full diff every 3 s (`useYjsSync`)
- [x] **Fixed:** a student whose browser blocks localStorage got the identity `student-undefined` (the regex accepted a missing id), so two such students kicked each other out
- [x] `poweredByHeader` off; `server-only` on the Supabase admin and LiveKit helpers; `noindex` on join, lesson, dashboard and classroom pages; SQL length checks on titles, names, slugs and sizes (`0007_text_limits.sql`, run it in Supabase); dead template files and the unused mono font removed
- [x] Tests: `e2e/security-token.spec.ts`
- Left in `npm audit`: 9 high, all inside Excalidraw's Mermaid import (lodash-es, nanoid, langium); that UI isn't exposed. Watch for an Excalidraw release.

### Security review, critical and high (Nov 2026, branch `security-2`)
- [x] C2: 30 classrooms per teacher at most (trigger + dashboard note, `0008_classroom_cap.sql`). An invite-code hook was built here, then replaced by open sign-up with a CAPTCHA (G1)
- [x] H3: Content-Security-Policy allow-list (scripts self only, connections to Supabase / LiveKit / esm.sh only, no frames or plugins) and `Cross-Origin-Opener-Policy`; `e2e/security-csp.spec.ts`, also run against `next start`, plus Excalidraw's image export checked by hand under the production policy
- [x] H4: rate limits on the three API routes, per instance and shared in Postgres (`0009_rate_limits.sql`); `e2e/security-rate-limit.spec.ts`
- [x] H5: GitHub Actions gate (lint, build, audit) and Dependabot
- **User:** run `0008_classroom_cap.sql` and `0009_rate_limits.sql`. Who ran the first 0008 (invite codes): run `0011_remove_invite_codes.sql`, and make sure the "Before User Created" hook is off.
- Not done on purpose: a nonce CSP (every page would become dynamic) and HttpOnly session cookies (Supabase's browser client needs to read them). Both stay under "Before going commercial".

Phase 2 (before the friends test): dev Supabase + LiveKit projects for the tests; error pages; "Make a new link" per classroom; shorter email-link lifetime and sign out other sessions on password change. Phase 3 (performance): lazy-load the room on the join page; whiteboard garbage collection; targeted `listRooms` and no dashboard polling while hidden.

## P1: Stronger passwords
- [x] Sign-up and reset page: "Confirm password" field; mismatches are refused before Supabase is asked
- [x] Rule: at least 10 characters, letters and digits (`lib/passwordRules.ts`); both forms use `components/auth/NewPasswordFields.tsx`, with a live hint under the field
- [x] User, in Supabase (Auth → Providers → Email): minimum length 10, "letters and digits"
- [x] Update `weak_password` in `lib/authErrors.ts`

## C1: Classroom
Each student in the list becomes a classroom: the teacher keeps that student's files there and starts lessons from it. Only the teacher uploads; students never log in.
- [x] The student card opens `/dashboard/[id]`: name, invite link, **Start lesson**, the files
- [x] Private Storage bucket `resources`, files at `<teacher_id>/<lesson_id>/<file>`; table `resources` (lesson, teacher, kind `image`/`pdf`/`audio`, name, path, size). RLS on both: the teacher's own only. Pictures, PDF and audio only, 10 MB per file and 200 MB per teacher (free tier: 1 GB total, shared). Migrations `0004_resources.sql`, `0005_resource_images.sql`, `0006_resource_limits.sql`
- [x] Upload, list and delete files with one upload button, listed under Pictures (small previews), PDFs and Audio; removing a student deletes their files

### C1b: Storage limits
- [x] 10 MB per file, 200 MB per teacher across all classrooms; "MB of your 200 MB used" line in the classroom
- [x] User ran `0006_resource_limits.sql` in Supabase (2026-10-31; the file is re-runnable)
- [x] Playwright set up (`e2e/`, `npm run test:e2e`, process in `AGENTS.md`); the browser test below is `e2e/c1b-storage-limits.spec.ts`. Needs the test teacher account in `.env.local` (user)
- [x] Browser test (`e2e/c1b-storage-limits.spec.ts`, passes): a 15 MB file is refused, a 2.5 MB upload works, the "used" line rises and falls with upload and delete. Not tested: the 200 MB total (client check and the Storage policy)
- [x] `npm run build` + `npm run lint`, merged to `main`

## L1: Tabbed call layout
**Built and merged; not fully tested yet:** only automated browser tests so far. The real-device checks are listed under "L1 plan" below.
Design and rules: `docs/design/HANDOFF.md` ("Lesson room"), screens `Main`, `Room-*`, `Phone-teacher`, `Phone-student` in `docs/design/screens/`.
- [x] Desktop: cameras column on the left | stage with tabs | "Anna's files" on the right (teacher only, student lessons only, folds to an icon strip; lists the files, opening them comes in L2a). Quick calls have no files panel
- [x] Tabs like a browser, **one or two open**: **Screen** (only while someone shares), **Text**, **Draw** (PDFs and pictures in L2a). + only while one tab is open, × on each tab while two are open; side by side or one at a time; yellow underline on the active tab. A new tab never replaces one silently
- [x] Screen sharing opens the Screen tab beside the open one; with two open it takes the active tab's place and gives it back when sharing stops
- [x] The student follows: the teacher's `tabs`, `active`, `layout` and `justTalk` go into her LiveKit attributes next to "student can edit" (one hook for all teacher settings). The (!) nudge goes away; Clear moves into the Text and Draw toolbars
- [x] "Just talk": the teacher folds the tabs away for both; the cameras fill the room. Works in quick calls too
- [x] Resizing: handles for the cameras, the split between tabs and the files (sizes per browser); breakpoints 1280 / 1024 / 768 px with floating cameras below 1024; one at a time by itself when a tab would get under 320 px
- [x] Phone: teacher (segmented tabs, Files and ⋯ sheets, five big buttons) and student (two-way switch, follows the teacher)
- [x] Rewrite `docs/DESIGN.md` principles 3–4 and the layout part (done with the redesign, Nov 2026)
- [x] Update `docs/ARCHITECTURE.md` (teacher settings hook, nudge removed)

### L1 plan (branch `l1-tabbed-call`, merged 10 Nov)
Still to check on real devices: a real screen share on Mac/Windows (also stopping from the browser's own bar); iOS Safari and Android Chrome for both roles (sheets, keyboard over the text pad, finger drawing, dragging the floating cameras on an iPad); a phone teacher with a laptop student; follow speed from Chile; handles with a real trackpad; the files panel with real pictures and PDFs; a teacher refresh mid-lesson.

**Synced state.** `lib/sync/useStudentCanEdit.ts` becomes `lib/sync/useTeacherSettings.ts` (keeps `isTeacher`): one hook, one `setAttributes` call with every key whenever one changes. The teacher writes, the student only reads (from the participant whose token says `teacher`). Attributes are strings:
- `studentCanEdit`: `"true"` / `"false"` (existing key, unchanged)
- `tabs`: JSON array of 1–2 tab ids, e.g. `["screen","text"]`. Ids: `screen`, `text`, `draw` (L2a adds `pdf:<resourceId>`, `image:<resourceId>`)
- `active`: `"0"` / `"1"`
- `layout`: `"split"` / `"single"` (the teacher's choice; a phone teacher publishes `single`, since that's what she sees)
- `justTalk`: `"true"` / `"false"`

The student validates what it reads (known ids only, no duplicates, at most two, `active` in range; otherwise `["text"]`). Every join starts with `["text"]`, split, not Just talk, editing off. When the teacher drops out, the student keeps the last tabs (no jump on a reconnect) but editing goes off, as today.

**Tab rules** in a pure module, `lib/room/tabs.ts` (open, close, pick, layout, screen started / stopped), ported from `Main.dc.html`. Only the teacher's client runs them. It watches the room's screen-share track: when one appears, Screen opens to the left of a single tab, or takes the active tab's place and remembers that tab; when sharing stops, Screen closes and the remembered tab comes back. Starting to share ends Just talk. Closing Screen while still sharing puts Screen back in the + menu. Only the teacher shares (Share isn't in the student's bar in the mock-ups or in `DESIGN.md`): **change**, the student loses the Share button.

**Files (new or rewritten):**
- `lib/room/tabs.ts`, `lib/sync/useTeacherSettings.ts`, `lib/useStoredSize.ts` (localStorage sizes)
- `components/room/`: `LessonRoom.tsx` (doc, sync, picks desktop or phone), `DesktopRoom.tsx` (camera column | stage | files, breakpoints, handles), `Stage.tsx` (tab bar, + menu, ×, layout switch, pill, Just talk, panes), `TabPane.tsx` (Screen / Text / Draw), `FilesPanel.tsx` (list + folded strip), `JustTalk.tsx`, `CameraTiles.tsx` (column, floating, phone row, Just talk), `PhoneLayout.tsx` (teacher and student), `RoomControls.tsx` (title on the left; Mute Anna, "Anna can edit", mic, camera, share, Leave)
- `components/ui/`: `Handle.tsx`, `Sheet.tsx`, `Switch.tsx`, `Chip.tsx`, `Segmented.tsx` (all from `DESIGN.md`)
- `components/board/TextPad.tsx`, `Whiteboard.tsx`: Clear in their own toolbars (Excalidraw's `renderTopRightUI`), the "Only you can write" / "Anna can write here" / "View only" chip
- `lib/sync/clearLesson.ts`: split into `clearText` and `clearBoard`
- `app/lesson/[id]/page.tsx`: also loads the lesson title and its files (id, kind, name, size; student lessons only)
- Removed: `lib/sync/useNudge.ts`, `components/ui/TabBar.tsx`, the `react-resizable-panels` dependency (the new handles are plain buttons with pixel limits)

**Panes.** Each pane is keyed by its tab id, so a tab moving sides doesn't reload. The text pad stays mounted while its tab is open; the whiteboard mounts only while visible (Excalidraw can't measure a hidden canvas, as today). Side-by-side needs a measured stage width of 2 × 320 + 28 px (ResizeObserver, not window maths), on the teacher's and the student's screen separately.

**Sizes.** Breakpoints from `HANDOFF.md`: ≥1280 column 240 / files 272 open; 1024–1279 column 200 / files folded; 768–1023 floating cameras (148 px), files folded; <768 phone. (`Main.dc.html` hides the column below 960; `HANDOFF.md` says 1024, which wins.) Stored per browser: column width, files width, split ratio, and files folded once the user toggles it (until then the breakpoint decides).

**Files panel in L1** lists PDFs, pictures (small previews) and audio by name, and folds to the icon strip. Rows aren't clickable or draggable yet, and the footer hint is left out until L2a, so nothing promises an action that doesn't exist. Quick calls have no panel and no phone Files button.

**Phone.** Teacher: camera row (16:9), segmented tabs (+ opens Text or Draw, whichever is closed; × on both while two are open), the active tab, bar with mic, camera, Files, ⋯, Leave (48 px). Files sheet = the list; ⋯ sheet = Mute, "Anna can write and draw" switch, Just talk, "Screen sharing and side by side need a computer." Student: camera row, "Laura shows two tabs" + "Following Laura", a two-way switch she may tap (starts on the teacher's active tab, jumps when the teacher switches or changes the tabs), the active tab, mic, camera, Leave.

**Decided (user, 10 Nov):** Clear moves into the Text and Draw toolbars and clears only its own tab; a phone student may tap between the teacher's two tabs.

**Screenshot review (user, 10 Nov):** + without a background, level with the tab labels. On 768–1023 px windows the floating cameras can be dragged (snap to the nearest corner, remembered), the bottom bar shows icons only, and Just talk shows the other person big with your own camera small and draggable. Mock-up of the Just talk options: `docs/mockups/just-talk.html` (A chosen for tablets).

**Found while building:** LiveKit's minimal control bar had unlabelled icon buttons; the bar now uses LiveKit's toggles with labels ("Microphone", "Camera", "Share your screen", "Leave the lesson") and keeps the device menus. On the whiteboard, "View only" shows only while the board is read-only (Excalidraw's tools need the room otherwise).

**Tests.**
- `e2e/l1-tab-rules.spec.ts` (no browser): the rules in `lib/room/tabs.ts`: never more than two, + only with one, the last tab can't close, Screen in and out with and without a remembered tab, closing Screen while sharing.
- `e2e/l1-tabbed-call.spec.ts`: teacher (test account, lesson "Test") and student contexts. Teacher opens Draw → the student sees two tabs and Draw active; teacher picks Text → the student follows; one at a time → the student's layout follows; the + is gone with two tabs and a third can't be opened; closing a tab follows; Just talk folds and "Show the tabs" restores for both. Screen share with Chromium's fake capture (`--auto-select-desktop-capture-source`) if it works headless; otherwise the share rules stay covered by the rules spec and go on the real-device list. Resizing: a handle moved with the arrow keys keeps its width after a reload; at 1100 px the files are folded; at 900 px the cameras float; a narrow stage switches to one at a time by itself.
- Phone (390 × 844): teacher opens a second tab with +; the student switches tabs and jumps back when the teacher switches.
- Then `npm run build`, `npm run lint`, `npm run test:e2e`; screenshots of teacher and student on desktop (1440, 1100, 900) and phone.

## L2a: PDF and picture tabs
**Built and merged; not fully tested yet:** Not tested on real devices (big PDFs, iPad drag and drop: HTML5 drag doesn't work with touch, so tablets use click).
- [x] Teacher clicks a PDF or picture in the files panel, or drags it onto the stage (drop areas "Replace …" / "Open beside …") → it opens as a tab for both (`pdfjs-dist` for PDFs, pages load as you scroll). With two tabs open, clicking only shows a hint; dragging onto "Replace …" works
- [x] Student access without a login: `/api/resource-url` takes the invite slug and a file id, checks that the file belongs to that lesson, and returns a signed URL valid for a few minutes
- [x] Page and scroll position follow the teacher

### L2a plan (branch `l2a-file-tabs`, built solo while the user was away; review the screenshots)
- **Tab ids** `pdf:<resourceId>` / `image:<resourceId>` (uuid checked by `isTabId`), in the same `tabs` attribute. Labels: the file name (teacher: from the files list; student: from `/api/resource-url`).
- **`/api/resource-url`** (POST `{ slug, id }`): service-role lookup of the student lesson by `invite_slug`, then the resource by id *and* `lesson_id`; returns `{ name, kind, url }` with a signed URL valid 5 minutes. Both roles use it. The browser downloads the file once (≤ 10 MB) and keeps it for the session (`lib/room/fileCache.ts`), so the short URL never has to be fetched again (pdf.js gets the bytes, range requests off).
- **Opening** (`openTabAt` in `lib/room/tabs.ts`, from `Main.dc.html`): click = active if open, beside if one tab, else the 4 s footer hint; drag onto the stage = drop zones "Replace …" / "Open beside …" (one tab) or "Replace …" ×2 (two tabs), HTML5 drag and drop. Phone Files sheet: tap opens as the second tab, hint when full.
- **Drawer statuses:** "On screen" (`marker-soft`) / "In a tab" (`surface-2`). Footer hints as in `Main.dc.html`.
- **PDF tab** (`pdfjs-dist`, worker via `new URL(…, import.meta.url)`): pages as canvases at the pane width, rendered when near the viewport; "Page n of N" + "Anna sees page n" / "Laura chooses the page".
- **Picture tab:** fitted on `surface-2`, "Anna sees this picture" / "Laura is showing this picture".
- **Scroll follows the teacher:** position = page index + fraction into the page (so different widths line up), sent as lossy data messages (topic `view`, ≤ 10/s, teacher only, ignored from anyone else) and re-sent when someone joins. Not in attributes (too frequent). The student can scroll, but jumps back on the teacher's next move.
- **Tests:** rules spec for `openTabAt` and file ids; `e2e/l2a-file-tabs.spec.ts`: the teacher uploads a 3-page PDF and a picture to "Test" (e2e- prefix, deleted after), opens the PDF by click (the student follows to page 2) and the picture by dragging it onto "Replace Text"; a click with two tabs only shows the hint; the API refuses an unknown file id and bad input.
- **Found while testing:** moving over a drop area's own text fired `dragleave`, so the area lost its highlight; fixed. The text toolbar's lists are icons now (it wrapped in narrow panes).

## A1: Audio (replaces the old audio-library milestone)
**Built and merged; not fully tested yet:** Not tested on real devices: whether the teacher's microphone picks up the audio from her speakers (echo; headphones avoid it), MP3/M4A files from phones, iOS Safari playing it.
- How: the teacher's browser plays the file through Web Audio into its own LiveKit track (`lib/room/useLessonAudio.ts`, source "unknown", name `lesson-audio`), which LiveKit's audio renderer plays on the student's side, mic muted or not. The `audio` attribute holds `{ id, name, duration, startedAt, pausedAt }` (`lib/room/audio.ts`); the student's bar computes its own position from it. Seek: click or drag the bar, arrow keys ±5 s. Audio files go through `/api/resource-url` like PDFs.
- Tests: `e2e/a1-audio.spec.ts` (a 6 s WAV: the bar for both, a separate track reaches the student, the student's bar runs and stops on pause, Stop removes it; attribute checks).
- [x] Audio files from the drawer: play / pause / seek; no tab
- [x] Progress bar above the tabs for both (start time and length in the teacher's attributes, so the student's bar runs on its own). Design: the audio bar in `Main`, with the yellow playhead
- [x] Played as an extra LiveKit audio track (Web Audio), so the student hears it while the teacher's mic is muted

## L2b: Write and draw on PDFs
**Built and merged; not fully tested yet:** no design existed, so it follows `docs/mockups/pdf-drawing.html` (decided solo). Needs a real-device check: Apple Pencil and finger on an iPad, phone, and the saved PDF opened in Preview / Acrobat.
- [x] Per-page layer: pen, highlighter, text box, eraser. Strokes are vectors in the lesson Y.Doc, synced like the board; the student draws only when "student can edit" is on
- [x] Teacher: **Save as new PDF** (`pdf-lib` in the browser draws the strokes and text onto the original) → "Name (date).pdf" in the classroom. The original stays as it was

### L2b plan (branch `l2b-pdf-drawing`; no design in `docs/design/`, so the mock-up is `docs/mockups/pdf-drawing.html`)
- **Toolbar:** floating at the top of the PDF tab, like the Draw tab's: Scroll (the default, so the PDF scrolls as before), Pen, Highlighter, Text, Eraser; the teacher also gets Clear (this PDF's writing, for both) and **Save as new PDF**. The active tool is `marker-soft` like the whiteboard's. Without "student can edit" the student's tools are disabled.
- **Data:** one flat `Y.Map` `pdfInk` in the lesson Y.Doc, keyed by item id: `{ file, page, tool: "pen" | "highlighter" | "text", pts: [x, y, …] | text, at: [x, y] }`. Coordinates are fractions of the page width (both axes), so every screen size lines up. Flat keys can't clash when both draw at once; the eraser deletes keys. Saved with the board like the rest of the doc, so a classroom's writing is still there next week.
- **Drawing:** pointer events on an SVG layer over each page. With a tool picked the layer takes the touches (`touch-action: none`); with Scroll it lets them through. A stroke is sent when the pen lifts (not point by point). Pen: `ink`, thin. Highlighter: `marker`, wide, see-through. Text: click, type, Enter. Eraser: drag over an item.
- **Save as new PDF** (teacher, student lessons): `pdf-lib` loads the original bytes and draws each item (`drawSvgPath`, `drawText`), then uploads "Name (10 Nov 2026).pdf" to the classroom like an upload (same 10 MB / 200 MB limits) and adds it to the files panel. The original stays as it was.
- **Tests:** `e2e/l2b-pdf-drawing.spec.ts`: the teacher draws a pen stroke and a text on page 1, the student sees both; with "student can edit" off the student's tools are disabled; the eraser removes a stroke; Save as new PDF adds a file to the panel whose PDF has the drawings (checked with pdf-lib: content stream grew, same page count). Real devices: Apple Pencil / finger on iPad, phone.

## S5: UX/UI polish
- [x] Build the redesign of the other pages (`docs/design/HANDOFF.md`, "Other pages"), each on its own branch if it's big:
  - [x] Sign-in pages: one two-column layout (form + explanation, form only on phones), show/hide password, "Forgot" next to the label, student pointer on login
  - [x] Dashboard: card grid, name chip in the top bar, Remove in each card's ⋯ menu, file counts, quick call banner, first-visit welcome with the arrow doodle
  - [x] Classroom: two columns, link shown in a field, drop area for uploads, filters, storage bar, Remove moves here
  - [x] Join: camera and microphone check before joining (local tracks reused after joining). Needs a real-device check: iOS Safari / Android camera preview, and the blocked-camera message
- [x] D5d: one wait, one screen (below)
- [ ] Walk through every screen with the user (login, sign-up, dashboard, classroom, join, room on desktop and phone); list fixes, then do them
- [ ] Real phone test on the live site
- [ ] Decide the D5 "Still to decide" items

## S6: Nicer URL
- [ ] Optional (user, in Vercel): rename the project, e.g. `teachingtime.vercel.app`; then update Supabase's Site URL and redirect URLs and the docs
- [ ] Later: own domain (see "Before going commercial")

## T1: Tester feedback, laptop + phone (Nov 2026, branch `tester-feedback`)
- [x] One student per lesson: the student identity is now `student-<lesson id>`, so a second device or tab takes over and the first shows "You joined this lesson somewhere else" with "Continue here". (LiveKit Cloud ignored the room's `maxParticipants: 2`: tested, a second student got in.) Test: `e2e/one-student.spec.ts`
- [x] 768–1023 px: the cameras sit in a row above the stage (128 px tall, 16:9, centred), like on a phone, instead of floating over the tabs. Just talk at that width keeps the Spotlight (your own camera small in a corner)
- [x] Audio can be dragged onto the stage too: one drop area, "Play …", the tabs stay. The play button stays
- [x] Join card: if the camera+mic request fails, the two are asked for one after the other (never at once: Android Chrome can drop a second prompt), the message names the device and the browser's error, and tapping the mic or camera button asks again. Test in `e2e/s5-join.spec.ts`
- [ ] Real device: the Nothing Phone join again; if the mic is still missing, a screenshot of the red message (it now ends with the error's name)
- Kept: the "Side by side / One at a time" switch (only shown while two tabs are open). Reason in the chat of 11 Nov: it's the only way to make one of two tabs full width without closing the other (a PDF to read, then back to the board); the student follows it

## G1: Go public (open sign-up, friends first)
Plan agreed 11 Nov 2026: open sign-up, no invite codes. Friends first on the free LiveKit plan; pay LiveKit Ship ($50/month) for a month only once strangers come. No Supabase storage purchase for now (free plan: 1 GB in total).
Order:
- [x] 1. Separate test setup (done 11 Nov: dev Supabase with CAPTCHA on and Cloudflare's test keys, dev LiveKit in its own account; all 43 tests pass there): dev Supabase + dev LiveKit projects (run the migrations there first), Vercel Preview env vars point at dev, Production keys only in Vercel. The agent's `.env.local` gets dev keys only, so tests never touch real teachers' data
- [x] 2. Open sign-up with a CAPTCHA instead of the invite code: Cloudflare Turnstile on sign-up, login and forgot password (`components/auth/Captcha.tsx`), CSP allows `challenges.cloudflare.com`; invite code removed, `0008` is now only the classroom cap. Checked with Cloudflare's test key on a production build (widget passes, no CSP violations, login works)
  - [ ] **User:** Cloudflare → Turnstile → add the site → site key into Vercel as `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, redeploy, check the widget shows; then Supabase → Authentication → Attack Protection → CAPTCHA → Turnstile → paste the secret key. Only after step 1: once it's on, the e2e login needs the dev project (Cloudflare's test secret there)
- [x] 3. Limits per teacher (`0010_beta_limits.sql`, `lib/limits.ts`): storage 50 MB (was 200), 20 lesson-hours a month, 3 hours per lesson (LiveKit webhook → `lesson_sessions`; the token route refuses past the limits; the teacher's room warns at 2 h 50 and ends the call at 3 h). SQL checked on a local Postgres (PGlite) with Supabase stand-ins: month total, open-session cap, 31st classroom refused
  - [ ] **User:** run `0010_beta_limits.sql`; LiveKit → Settings → Webhooks → add `https://<site>/api/livekit-webhook`. Until then time isn't counted
- [x] 4. Email: own domain (user: yes, 11 Nov; teachingtime.com is taken until at least Apr 2027, free were teachingtime.app / .ch / .co / .net, getteachingtime.com) and Resend (free up to 3,000 emails a month) as Supabase's SMTP instead of the teacher's Gmail (Gmail: about 500 a day, spam folder, account risk). Update the Site URL, redirect URLs and email templates
- [x] 5. Seeing how people react: "Feedback" in the dashboard header (`feedback` table), Vercel Analytics, error pages that report to `error_reports`, a 404 page
  - [ ] **User:** Vercel → project → Analytics → Enable. Read feedback and errors in Supabase's table editor
  - [ ] Later: an alert for errors (Sentry free plan) instead of looking at the table
- [x] 6. `/privacy` and `/terms` drafted from what the code does (no recording, students not stored, processors, limits); linked from sign-up
  - [x] Operator details filled in (`lib/legal.ts`); Swiss FADP + GDPR, Swiss law in the terms
  - [ ] **User:** have a person check the texts; later swap the Gmail contact for an address on the own domain
- [ ] 7. The user's real phone test on the live site (list in the chat of 11 Nov), then invite friends
- [ ] 8. Friends test: collect feedback here. When strangers are invited: LiveKit Ship for a month (free plan: 5,000 participant minutes = about 40 lesson-hours a month for everyone, then lessons stop until the 1st)

## G2: Ideas from the user (11 Nov 2026), in the order agreed
- [x] **Word files:** upload `.docx` in the classroom; in the call it opens as a tab, rendered in the browser with its layout (tables, pictures), plus "Copy into the text pad" to work on it together. Old `.doc` files: the upload asks to save as `.docx` or PDF first. Google Docs: download as `.docx` or PDF meanwhile. About 1 day. Before the friends test (teachers' worksheets are often Word)
- [x] **Own domain + email** (G1 step 4, done 11 Nov: teachingtime.app, Resend as Supabase SMTP from noreply@, hello@ via Cloudflare Email Routing, old vercel.app address forwards): the user buys the domain; then Vercel domain, Supabase Site URL and redirects, Resend with DNS records, Turnstile hostname, LiveKit webhook URL, contact address on the legal pages. About half a day once bought
- [ ] **Sign in with Google:** Supabase's Google provider; the user makes a Google Cloud OAuth client (basic profile and email only, so no Google review). After the domain, because Google's consent screen shows it. About half a day. Before strangers; optional for friends
- [ ] **Quizzes** (replaces "Later: Quizzes"): made in the classroom (multiple choice, fill the gap, match pairs), stored in Supabase; in the call a Quiz tab where the student answers live and the teacher sees each answer. About 3–5 days. During the friends test, shaped by what they ask for
- [ ] **Google Drive:** pick a file from Drive (Google Picker, `drive.file` scope: only files the teacher picks; no Google review). Docs, Sheets and Slides come in as PDF. About 2–3 days. After Google sign-in
- [ ] **Live subtitles** (to investigate): two ways
  - Free: the browser's speech recognition, each side transcribes its own microphone and sends the text over the data channel. Chrome and Edge only (Safari and Firefox unreliable or missing), quality varies, Google processes the audio. About 1–2 days for a test toggle
  - Good: a LiveKit agent with a speech-to-text service joins the room and transcribes both people (all browsers, punctuation, could also translate). Costs per lesson minute (speech-to-text plus agent minutes; estimate below 1 USD per lesson-hour, to check), a paid LiveKit plan in practice, and a privacy policy update. About 1 week
  - Decide after the friends test whether students want it

## G3: SEO and promotion (user's to-do, added 12 Nov 2026)
Done in code (branch `seo-landing`): start page at `/` (features, steps, FAQ, structured data), login at `/login`, titles and descriptions per page, canonical links, `robots.txt`, `sitemap.xml`, manifest, home-screen icon, share image, join-link preview. Lighthouse: SEO 100, accessibility 100, best practices 96, speed 89.

SEO (user):
- [ ] Google Search Console: Add property → Domain → `teachingtime.app` (Cloudflare verifies it), then Sitemaps → `sitemap.xml`
- [ ] Bing Webmaster Tools: "Import from Google Search Console" (also covers DuckDuckGo and Yahoo)
- [ ] Check the preview with `teachingtime.app/?v=2` in WhatsApp (old chats keep the cached one)

SEO (agent, later):
- [ ] A real screenshot or 30–60 s video of a lesson on the start page (instead of the drawing)
- [ ] A demo room anyone can try without signing up (Show HN expects it; helps everywhere)
- [ ] A few helpful articles that match searches, e.g. "Zoom alternative for tutors", "how to teach one-to-one online", "online whiteboard for language lessons"
- [ ] German start page (`/de`) once German-speaking teachers are a target

Promotion (user; details, rules and links in `docs/PROMOTION.md`):
- [ ] Today: create a Product Hunt account (new accounts wait a week); list on AlternativeTo (alternative to Zoom, Google Meet, Lessonspace, Pencil Spaces) and SaaSHub
- [ ] Week 1: "I built this, feedback welcome" on r/ESL_Teachers; monthly promo threads on r/edtech and r/Tutoring; modmail r/OnlineESLTeaching first; Facebook tutor groups after asking the admin; r/SideProject + LinkedIn with a short video
- [ ] Week 2: Product Hunt launch (Tue–Thu, not Thanksgiving week); Indie Hackers story; free directories (Uneed, Peerlist, Microlaunch, TinyLaunch, Launching Next, Fazier); Show HN once the demo room exists
- [ ] Then: German-speaking groups and Swiss startup directories; pitch newsletters (Nik Peachey, Larry Ferlazzo, Free Technology for Teachers, Russell Stannard) and tutor podcasts
- Avoid: r/TEFL, r/Teachers, r/teaching, r/languagelearning, r/PreplyTutors (promotion banned)

# Open design work

## Redesign (Nov 2026)
- [x] Every page redesigned on the canvas "TeachingTime Redesign" (claude.ai, private to the user), desktop and phone, with resizing rules
- [x] Copied to `docs/design/screens/`; spec in `docs/design/HANDOFF.md`; `docs/DESIGN.md` updated
- [ ] Built: the room in L1 (done) / L2a / A1, the other pages in S5. When the canvas changes, refresh `docs/design/screens/` (see the end of `HANDOFF.md`)

## D5d: One wait, one screen
Rule: a wait that takes you into or out of a lesson shows the full loading screen, without breaks. Built: `SubmitButton` (pending label via `useFormStatus`), `LessonStartScreen` on the quick call form, `app/lesson/[id]/loading.tsx`, and `DashboardLoading` ("Leaving the lesson" while a sessionStorage flag set by `TeacherRoom` is there, otherwise "Loading your classrooms"). Tests: `e2e/d5d-one-wait.spec.ts`. Small actions that keep you on the page (save name, add student) get a pending state on their button.
- [x] Dashboard's Suspense fallback ("Loading…") becomes the loading screen, so "Leaving the lesson" flows straight into it until the students are shown (the 15 s auto-refresh doesn't trigger it)
- [x] "Start a quick call" switches to "Getting your lesson ready" on click (form pending state) and it stays until connected; no second screen in between
- [x] Check that "Start lesson" in a classroom shows the loading screen at once too
- [x] Buttons for small actions (Save name, Add, Remove/End) show a pending state

## D5: Still to decide
- [ ] Dark ink instead of brown for the main buttons
- [x] Arrow doodle pointing to "Add a classroom" on an empty dashboard: yes, in the redesign (`Dashboard-new`)

# Later

## Quizzes
- Moved to G2

## D6: Scheduling
- [ ] Plan the next lesson per student (date and time), shown on the student card

## Before going commercial
- [ ] Vercel Hobby is non-commercial only: move to Vercel Pro, or Netlify / Cloudflare Pages
- [ ] Own domain (e.g. teachingtime.app): moved to G1 (needed for the email sender)
- [ ] Privacy policy and terms (GDPR: EU users, video and stored boards): moved to G1
- [ ] CAPTCHA on sign-up, login and forgot password (Supabase + Cloudflare Turnstile): moved to G1
- [ ] Supabase Pro: switch on leaked password protection (Auth → Providers → Email)
- [ ] Own email sender (Resend, Postmark, …) instead of the teacher's Gmail: moved to G1
- [ ] Strict CSP for scripts (nonces) if the speed cost is acceptable; recheck LiveKit and Excalidraw
- [x] Rate limit the token route (done in the security review)
- [ ] Monitoring (Sentry or a Vercel log drain): today a broken deploy is noticed by the user; Vercel's free log retention is 1 h. Basic error alert moved to G1
- [ ] Re-check HSTS once the app has its own domain (Vercel sends it for `*.vercel.app`)
- [ ] Free tiers: LiveKit's monthly participant minutes are shared by all teachers (a 1-hour lesson uses about 120); Supabase free projects pause after about a week without activity
