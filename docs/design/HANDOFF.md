# Design handoff: the November 2026 redesign

The spec for building the redesign. `docs/DESIGN.md` has the lasting rules; this file has the details per screen. If the two disagree, or a screen file disagrees with this text, ask the user.

- **Source:** the canvas "TeachingTime Redesign" on claude.ai (private to the user: https://claude.ai/artifact/4zZSinLJsVtk6jwHrrBuoj).
- **Copy in the repo:** `docs/design/screens/` (one `.dc.html` per screen plus `canvas.json`). Refresh it with the steps at the end of this file when the canvas changes.
- **Build order:** see "Build order" below and `docs/ROADMAP.md` (L1, L2a, A1, S5).

## Reading the screen files
- Each `*.dc.html` is one screen: HTML with inline styles, plus a `<script type="text/x-dc">` class. Its `renderVals()` returns the values the markup uses as `{{ name }}`.
- `<sc-if value="{{ x }}">` shows its content when `x` is true. `<sc-for list="{{ xs }}" as="x">` repeats it per item. `<dc-import name="Main" one-tab="{{ true }}">` renders `Main.dc.html` with props (`one-tab` → `oneTab`).
- **Behaviour is in the script.** In `Main.dc.html`, `openTab`, `closeTab`, `toggleShare`, the drop zones and the resize handlers are the reference for the tab rules below.
- **Canvas-only, ignore:** `support.js`, `data-props` (the canvas's Tweaks panel), `hint-*` attributes, `$preview`.
- **The files don't run outside the canvas.** Read them; don't serve or import them.
- **Mock data, don't copy:** the names (Anna, Laura, Mateo, Sofía …), lesson text, dates, `[PRICE]`, "Picture placeholder", the invite slug, "38 MB", the Caveat font (it only fakes Excalidraw's handwriting).
- **Thin wrappers:** `*-phone`, `Room-drop`, `Room-laptop`, `Room-tablet`, `Dashboard-new` and the `Auth-*`/`Join-*` files are wrappers that show another screen at another size or state.

## Screens → routes and code

| Screen files | Route | Code today |
|---|---|---|
| `Main`, `TabContent`, `Room-drop`, `Room-laptop`, `Room-tablet` | `/lesson/[id]` (teacher); `/join/[slug]` after joining (student = `Main` with `studentView`) | `components/room/LessonRoom.tsx`, `TeacherRoom.tsx`, `RoomControls.tsx`, `components/board/*` |
| `Phone-teacher`, `Phone-student` | same routes, below 768 px | `components/room/PhoneLayout.tsx` |
| `Dashboard`, `Dashboard-new`, `Dashboard-phone`, `Dashboard-new-phone` | `/dashboard` | `app/dashboard/page.tsx`, `components/dashboard/DashboardBits.tsx` |
| `Classroom`, `Classroom-phone` | `/dashboard/[id]` | `app/dashboard/[id]/page.tsx`, `components/classroom/FileUpload.tsx` |
| `Auth` (`screen` = login, signup, forgot, check-email, reset, expired), `Auth-*`, `Auth-*-phone` | `/`, `/signup`, `/forgot-password`, the "Check your email" state of sign-up and forgot, `/reset-password`, `/link-expired` | `components/auth/*` (`AuthCard` becomes the shared two-column layout) |
| `Join` (`screen` = join, loading, ended, left), `Join-*` | `/join/[slug]` | `components/room/StudentJoin.tsx`, `LoadingScreen.tsx`, `RoomMessage.tsx` |

## Colours, type, shapes
The mock-ups use raw colours. In code, always use the tokens from `app/globals.css`:

| In the files | Token |
|---|---|
| `#FAF6F0` | `paper` |
| `#FFFFFF` | `surface` (text on accent, danger, ok: `text-white`) |
| `#F3EBE0` | `surface-2` |
| `#E6D9C8` | `line` |
| `#3B2A1E` | `ink` |
| `#76604F` | `ink-muted` |
| `#8B5E3C` / `#6F4A2E` | `accent` / `accent-hover` |
| `#B4442F` / `#F8E6E1` | `danger` / `danger-soft` |
| `#52703F` | `ok` |
| `#2E2620` | `video` |
| `#F4D35E` | `marker` (strokes and the audio playhead dot only) |
| `#FBEDB5` / `#6B4E0E` | `marker-soft` / `marker-ink` (small "look here" labels) |
| `rgba(46,38,32,0.85)` | `bg-video/85` (name labels on camera tiles) |
| `rgba(46,38,32,0.45)` | `bg-video/45` (phone sheet backdrop) |
| `rgba(250,246,240,0.88)` | `bg-paper/90` (drop overlay) |
| custom `box-shadow`s | `shadow-soft` (menu, sheet, floating cameras, drag chip) |

- **Type:** Geist for everything; Bricolage Grotesque 800 (`font-display`) for the TeachingTime name and page headings. Body 16 px, text pad 18 px.
- **Radius:** `rounded-md` (6 px) for controls, `rounded-panel` (10 px) for panels and cards. The mocks also use 8 px for inner panes and segmented controls (use `rounded-md`), 12 px for the join card (use `rounded-panel`), and 16 px for the top of phone sheets (`rounded-t-2xl`).
- **Icons:** `lucide-react` at 16 px (18 px on phones). Used here: `mic`, `mic-off`, `video`, `monitor-up`, `monitor`, `log-out`, `pencil`, `pencil-line`, `users` (Just talk), `plus`, `x`, `columns-2` (side by side), `square` (one at a time), `file-text`, `image`, `music`, `eye`, `grip-vertical`, `folder-open`, `ellipsis`, `link`, `copy`, `trash-2`, `upload`, `arrow-left`, `mail`, `clock`, `circle-alert`, `check`, `circle`, `info`, `panel-right-close`, `panel-right-open`, `refresh-cw`, `user`, `type`, `mouse-pointer-2`, `eraser`, `paperclip`.
- **Touch targets:** at least 40 px on phones; the phone room uses 48 px.

## Lesson room

### Tabs
- **Kinds:** `screen`, `text`, `draw`, `pdf:<resourceId>`, `image:<resourceId>`. Audio is never a tab.
- **One or two open, never more.** The tab bar shows only the open tabs, like a browser.
- **The active tab** is the one the teacher clicked last. It has the hand-drawn yellow underline, and the student sees it too.
- **+ (teacher)** shows only while one tab is open. Its menu lists Screen (only while someone shares, if it isn't open), Text and Draw (if not open), each with the hint "Opens beside …". The menu ends with: "PDFs and pictures open from Anna's files: click one, or drag it onto the stage."
- **× (teacher)** is on each tab only while two are open. The last tab can't be closed.
- **With two tabs:** side by side (the default) or one at a time, chosen with the layout switch in the tab bar (teacher). Side by side needs at least 320 px per tab (2 × 320 + 28 px for the handle and padding). Below that, the stage shows one at a time by itself, disables "Side by side" with the tooltip "Side by side needs a wider window", and goes back to side by side when there's room. In side by side, the active tab's pane has a 2 px `accent` outline and the other a 2 px `line` outline.
- **Nothing replaces a tab by surprise**, with one exception, screen sharing:
  - When someone starts sharing and one tab is open, Screen opens to its left.
  - With two tabs open, Screen takes the active tab's place. That tab is remembered and comes back when sharing stops.
  - When sharing stops, the Screen tab closes. If the teacher closed Screen while still sharing, + offers it again.
- **Opening files from the drawer** (teacher):
  - Click a file that's already open: it becomes the active tab.
  - Click while one tab is open: it opens beside it.
  - Click while two are open: nothing changes, and the drawer's footer shows "Two tabs are open. Close one first, or drag the file onto a tab to replace it." for 4 s. Without the click, the footer says "Two tabs are open. Drag a file onto one to replace it."
  - Drag a file onto the stage: the stage shows two drop areas. With one tab: "Replace Text" (left) and "Open beside Text" (right). With two tabs: "Replace …" for each. The area under the pointer turns solid (`accent` dashed border, `surface` fill) and shows a chip with the file name and "Drop to open". HTML5 drag and drop; clicking is the keyboard path.
- **Clear** (teacher, trash icon, today's confirm) moves from the old board header into the Text and Draw tabs' own toolbars. It isn't drawn in the mock-ups.
- **Drawer statuses:** "On screen" (`marker-soft`) when visible, "In a tab" (`surface-2`, `ink-muted`) when open but hidden, "Playing" for audio.
- **Just talk** (teacher): hides the tabs for both people; the two cameras fill the room. "Show the tabs" brings back the same tabs.
- **Audio bar (A1):** above the tabs for both. Teacher: play/pause, title, progress with a yellow playhead dot, time, stop. Student: music icon, title, progress, time.
- **Who follows:** the student never clicks tabs on desktop. The pill in the tab bar says "Anna sees what you see" (teacher) or "Following Laura" (student).

### What is synced
- **Shared, from the teacher's LiveKit participant attributes:** `tabs` (JSON array of ids), `active` (0 or 1), `layout` (`split` or `single`), `justTalk`, plus the existing `studentCanEdit`. Built in L1 as one hook, `lib/sync/useTeacherSettings.ts` (format in `docs/ARCHITECTURE.md`). Only the teacher's token may set attributes, so a student can't change them. The student renders from these values and writes nothing.
- **Personal, in `localStorage`, never synced:** camera column width, files panel width, the split between the two tabs, files panel folded.
- **The (!) nudge is gone** (removed in L1): following the teacher's tabs replaces it.

### Sizes and resizing
The room follows the window width:

| Window width | Cameras | Anna's files | Notes |
|---|---|---|---|
| 1280 px and wider | column, 240 px | open, 272 px | |
| 1024–1279 px | column, 200 px | folded to a 48 px icon strip | |
| 768–1023 px | no column; two small tiles float over the stage (148 px wide, `surface` border, `shadow-soft`), draggable to any corner (user, L1) | folded | bottom bar icons only; Just talk = the other person big, you small and draggable |
| below 768 px | phone layout | none | see below |

- **Handles** between cameras and stage, between the two tabs, and between stage and files.
  - An 8 px hit area (12 px between tabs) with a 2–4 px line in `line`, `accent` on hover and focus.
  - Each is a `<button>` with an `aria-label` and pointer drag. Arrow Left/Right steps 16 px (5 % between tabs).
  - Limits: cameras 160–360 px, files 220–400 px, each tab at least 320 px (keyboard steps keep the split between 25 % and 75 %).
  - Sizes are remembered per browser. Quick calls have no files panel.

### Phones (below 768 px)
- **Teacher (`Phone-teacher`):**
  - **Top to bottom:** two camera tiles in a row (16:9), the audio bar, the tabs as a segmented control, the active tab.
  - **Tabs:** with one tab there's a 44 px + next to it (Text or Draw). With two, each tab has a ×.
  - **Bottom bar:** mic, camera, Files, ⋯ and Leave, all 48 px.
  - **Files** opens a bottom sheet with PDFs and pictures. Tap one to open it as the second tab. With two open, the sheet says "Two tabs are open. Close one with its × to show a file."
  - **⋯** opens a sheet with Mute Anna, "Anna can write and draw" (a switch, `ok` when on) and Just talk, plus the note "Screen sharing and side by side need a computer."
- **Student (`Phone-student`):** cameras, the audio bar, "Laura shows two tabs" with the "Following Laura" pill, a two-way switch between the teacher's tabs (it starts on the teacher's active tab and jumps when she switches), the "View only" chip, then mic, camera and Leave.

## Other pages (S5)

### Sign in (`Auth`)
- **One layout** for login, sign-up, forgot password, check your email, new password and link expired.
  - **768 px and wider:** two columns. The form on the left (max 380 px, vertically centred). On the right, a `surface-2` panel with "Every lesson in one calm room.", a short line, a small decorative room drawing (`aria-hidden`) and three ✓ points.
  - **Phones:** form only, starting near the top so the keyboard doesn't cover it. Headings 28 px instead of 34 px.
- **Every password field** has a show/hide button. "Forgot your password?" sits on the right of the Password label.
- **Password rules** sit in one row under the field (circle → green check as they're met).
- **Errors:** a `danger-soft` banner with an icon above the button, and the fields get a `danger` border.
- **Login** ends with a box: "Are you a student? Open the invite link from your teacher. You don't need an account."
- **Check your email and link expired** start with a round `surface-2` icon (mail, clock).
- **Copy:** take it from the screen, otherwise keep today's.

### Dashboard (`Dashboard`, `Dashboard-new`)
- **Header:** the TeachingTime name, a name chip (initial + teacher's name + pencil; opens a small form to change the name in lessons) and Log out. On phones the chip shrinks to the initial. This replaces the name form at the bottom of today's page.
- **Title row:** "Your classrooms" with a one-line explanation. On the right, "Start a quick call" (primary, video icon) with its hint underneath. Full width on phones.
- **Quick call in progress:** a banner with an `accent` border and "Your student is waiting." / "Nobody is in the call." (as today), with Copy student link, Rejoin (primary) and End call (danger text).
- **Cards** in a grid (`repeat(auto-fill, minmax(min(300px, 100%), 1fr))`). Each card has:
  - the initial in a `surface-2` circle, the name (the whole card links to the classroom) and "Last lesson: …"
  - a file count line ("3 pictures · 2 PDFs · 2 audio" or "No files yet"; needs counts per lesson, new)
  - the buttons Start lesson, Copy link and ⋯. The ⋯ menu holds Remove, with today's confirm.
- **Waiting student:**
  - The card gets an `ink` border and a 3 px yellow offset shadow (today's hover style, kept on).
  - The "Waiting" badge is circled by the marker, and Start lesson becomes the primary button.
  - Other cards get the yellow shadow on hover, as today.
- **Add a classroom:** the last card, with a dashed border, an inline name field and an Add button.
- **First visit:**
  - A welcome card with an `accent` border: "Welcome! What should your students call you?" with the name field and Save.
  - Then the empty grid: the "Add a classroom" card with an `accent` dashed border, and next to it the yellow arrow doodle with "Start with your first student".
  - The TeachingTime name has no underline here, because the arrow is the page's marker stroke.

### Classroom (`Classroom`)
- **Two columns** that wrap on phones:
  - **Left** (max 380 px): the student card, the storage card and Remove.
  - **Right:** the files.
- **Student card:**
  - The initial, the name (h1) and "Last lesson: …".
  - Start lesson (primary, full width).
  - The student link shown in a read-only field with a Copy button, and "Anna joins with this link. It stays the same every week."
- **Storage:** "38 MB of 200 MB", a bar in `accent` on `surface-2`, and "All your classrooms together. Up to 10 MB per file."
- **"Remove this classroom":** a danger text button with a confirm, and "The link stops working and the files are deleted." It moves here from the dashboard card.
- **Files:**
  - **Header:** "Files", the count, and Upload files (full width on phones).
  - **Drop area** (desktop only): dashed border with "Drop files here" and the limits. Files dropped here use the same upload code as the button.
  - **Filters** as a segmented control: All, Pictures, PDFs, Audio, with counts.
  - **Pictures:** a grid of thumbnails (name, size · date, delete icon).
  - **PDFs:** a list (name, pages · size · date, delete). The name opens the file.
  - **Audio:** a list with a round play button for listening first, then name, length · size · date, delete.
  - **Tip at the end:** "In a lesson, these files sit in the side panel. Click a PDF or picture to show it, or drag it onto the stage."

### Student join (`Join`)
- **Join card:**
  - the TeachingTime tile and name (no underline)
  - **new:** a camera preview with round mic and camera buttons. Start local tracks before connecting (`createLocalTracks` from `livekit-client`) and publish the same tracks after joining, so the choices carry over. If the browser blocks the camera, show today's friendly banner with what to do.
  - "Join your lesson" with the marker underlining "lesson", and the line "Check your camera, type your name, and you're in."
  - a 48 px name field and a 48 px "Join lesson" button
  - "When your browser asks, allow the camera and microphone."
- **Loading:** "Getting your lesson ready", the looping wave and "This takes a few seconds."
- **Ended:** the tick, "See you next time!" and "The lesson has ended. You can close this page."
- **Left:** "You left the lesson", "Left by mistake? Join again with the same name." and Rejoin.
- **Phones:** the same centred card.

## Marker strokes (one hand-drawn stroke per screen)
- **Lesson room:** the underline on the active tab (desktop and phone).
- **Dashboard:** the "Waiting" circle, and the TeachingTime underline. **First visit:** the arrow doodle.
- **Sign-in pages and classroom:** the TeachingTime underline.
- **Join:** the underline under "lesson". **Ended:** the tick. **Loading:** the wave (the only one that loops).

Yellow labels (`marker-soft`) aren't strokes, so they can sit next to one: "Anna sees what you see", "Following Laura", "On screen", "Playing", "Drop to open", "Waiting", Anna's cursor tag in the text pad, the active pen tool on the whiteboard.

## Build order
1. **L1:** the room on desktop and phone: tabs (Screen, Text, Draw), teacher settings in LiveKit attributes, resizing and breakpoints, Just talk, the files panel listing (opening comes in L2a).
2. **L2a:** PDF and picture tabs: click or drag from the files panel, drop zones, signed URLs for the student.
3. **A1:** the audio bar.
4. **S5:** sign-in pages, dashboard, classroom, join with the camera check.

Each milestone gets its own branch, as in `AGENTS.md`.

## Refreshing `docs/design/screens/`
The canvas is the source; the repo copy goes stale when the canvas changes.
- **In Claude Code** (signed in as the canvas owner), say: "Refresh docs/design/screens from the TeachingTime Redesign canvas." It reads every `project/…` file of the canvas with its Artifact tool and copies them here.
- **By hand:** you can only download from the canvas page while signed in. Copy each new or changed screen into `docs/design/screens/` under the same file name, and update this file if a rule changed.
- **Hermes and other agents** can't open the canvas link. They read only the copy in this folder.
