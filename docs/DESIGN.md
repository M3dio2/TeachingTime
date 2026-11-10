# Design principles

Read this before any UI work. When a change doesn't fit these rules, discuss it first instead of adding a one-off.

The November 2026 redesign is the target: mock-ups in `docs/design/screens/`, details per screen in `docs/design/HANDOFF.md`. Parts marked *(L1)*, *(L2a)*, *(A1)* or *(S5)* aren't built yet (see `docs/ROADMAP.md`).

## Principles
1. **Content first.**
   - The shared screen and the notes *are* the lesson, so they get the space.
   - The interface around them is quiet: little chrome, few borders, and controls next to what they affect.
2. **Calm and warm.**
   - Light paper tones and brown accents. No pure black, no saturated colours.
   - Colour carries **meaning**, not decoration:
     - accent: the primary action or the current selection
     - danger: destructive actions or errors
     - ok: allowed or success
3. **The teacher leads, the student follows easily.**
   - The student sees what the teacher shows: the same open tabs, the same active tab, side by side or not, and Just talk. The student never configures anything to follow the lesson.
   - Teacher-only controls sit in two places, each next to what it affects:
     - tab bar: + (open a tab), × on tabs, the layout switch, Just talk, and Clear in the Text and Draw toolbars
     - control bar, left of mic and camera: Mute student, "Student can edit" (pencil), share screen
   - On phones the extra controls move into a ⋯ sheet.
   - Each one has a tooltip and an `aria-label`.
   - Nothing changes the lesson by surprise: a new tab never silently replaces an open one (screen sharing is the one exception, see `HANDOFF.md`).
4. **Everyone owns their sizes.**
   - Panel sizes (camera column, files panel, the split between two tabs) are personal and remembered in the browser.
   - The teacher decides *what* is shown, never *how big* it is on the student's screen.
5. **Basic and consistent.**
   - One font, one radius scale, one spacing scale.
   - Reuse `components/ui/*` before adding new styles. If something is missing there, add it there.
6. **Readable and reachable.**
   - Text contrast is at least **4.5:1** (WCAG AA). All token pairs below are checked.
   - Every interactive element has a visible focus ring (`focus-visible:ring-accent`).
   - Touch targets are at least **40 px** on phones.
   - Use words for actions. Icons alone only for universally known ones (mic, camera, leave), or with a tooltip and `aria-label`, as the trash can and the layout switch have.
   - Icons come from `lucide-react`, at 16 px.
7. **Friendly, plain copy.**
   - Short sentences that say what happened and what to do next ("Your browser blocked the camera. Click…").
   - Don't use jargon such as "token", "track" or "sync" in the UI.

## Tokens
These are defined in `app/globals.css` (`@theme`) and used as Tailwind classes, e.g. `bg-paper`, `text-ink-muted`, `border-line`.

| Token | Value | Use |
|---|---|---|
| `paper` | `#FAF6F0` | page background |
| `surface` | `#FFFFFF` | panels, editor, whiteboard, cards |
| `surface-2` | `#F3EBE0` | headers, tab bars, camera strip, inputs |
| `line` | `#E6D9C8` | borders, dividers, resize handles |
| `ink` | `#3B2A1E` | main text (12.7:1 on paper) |
| `ink-muted` | `#76604F` | secondary text (≥ 5:1 on paper, surface and surface-2) |
| `accent` | `#8B5E3C` | primary buttons, active tab, focus ring (white text 5.6:1) |
| `accent-hover` | `#6F4A2E` | hover or pressed accent |
| `danger` | `#B4442F` | leave, clear, errors (white text 5.5:1) |
| `ok` | `#52703F` | "student can edit" on, success (≥ 4.7:1) |
| `video` | `#2E2620` | behind camera and screen video, so video looks natural |
| `warn` / `warn-soft` | `#8A5A12` / `#FBF0DC` | "Reconnecting…" banner (text 5.2:1 on soft) |
| `danger-soft` | `#F8E6E1` | error banner background (danger text 4.6:1) |
| `marker` | `#F4D35E` | the marker: drawn strokes, the "T" letter on its ink tile. Never a background or text colour |
| `marker-soft` / `marker-ink` | `#FBEDB5` / `#6B4E0E` | small highlighted labels such as the "Waiting" badge (text 6.4:1) |

- **Radius:**
  - `rounded-md` (6 px) for controls
  - `rounded-panel` (10 px) for panels and cards
- **Spacing:** Tailwind's 4 px scale. Use `gap-2` inside controls, `gap-3` or `p-3` inside panels, and `gap-2` between panels in the lesson.
- **Shadow:** `shadow-soft`, only for floating things such as the phone camera overlay and popovers. Panels use a `line` border instead.
- **Font:** Geist Sans for everything people read and use. Body text is 16 px. The editor is 18 px (`text-lg`).
  - **Display:** Bricolage Grotesque (`font-display`, extra bold) for the TeachingTime name and page headings only. Every `h1` gets it automatically; the text pad's own headings don't.
- **Theme:** light only for now.
- **LiveKit** controls and tiles get the palette through CSS variables and `.lesson-room`-prefixed rules at the end of `app/globals.css`. Camera tiles stay dark (`video`).

## The marker ("Highlighter", D5)
A yellow marker used the way a teacher marks a text: one stroke at the right moment, drawn by hand.
- **One marker gesture per screen:** an underline, a circle or a tick. Never two at once, and never a yellow background.
- **Draw once, then rest.** A stroke draws itself when something new appears, then stays still. Only the loading line loops.
- **Yellow means "look here":** the name, a waiting student, the active tab, the arrow on an empty dashboard, small labels such as "On screen", "Playing" and "Following Laura" (`marker-soft`). Buttons and errors keep their own colours.
- **Short motion:** under 1 s, easing out. With "reduce motion" switched on, strokes appear already drawn.
- **During a call** only the active tab's underline moves. Nothing animates while people talk.
- Which stroke each screen uses: `docs/design/HANDOFF.md`, "Marker strokes".
- Use `components/ui/Marker.tsx` (shapes: `underline`, `circle`, `tick`, `wave`) rather than drawing new strokes.

## Components (`components/ui/`)
- **Button.** Variants:
  - `primary`: accent background, white text. Use **one per area**.
  - `secondary`: surface with a line border.
  - `ghost`: text only, for toolbars.
  - `danger`: red text, or a red background for confirmations.
  
  Sizes `sm` and `md`. On phones the hit area is at least 40 px.
- **Field:** a labelled input on `surface`, with a line border and accent focus ring.
- **Panel:** `surface` with a `line` border, `rounded-panel` corners and an optional header bar on `surface-2`.
- **Wordmark:** the dark "T" tile (same as `app/icon.svg`) and "Teaching" underlined by the marker. `underline="draw"` animates the underline, `"still"` shows it drawn, `"none"` leaves it out where the screen has its own marker gesture.
- **Marker:** a hand-drawn yellow stroke that draws itself (see "The marker" above).
- **Waiting and arriving** (`components/room/`):
  - `LoadingScreen`: "Getting your lesson ready" / "Leaving the lesson" with the looping wavy line. It covers the room until the first connection is made.
  - `JoinToast`: "Anna joined" at the top when someone arrives; camera tiles fade in.
  - `RoomMessage` with `tick`: "See you next time!" when the call has ended.
- **Banner** (`components/room/StatusBanner.tsx`): info on `surface-2`, warning in amber tones, error in danger tones. Can be dismissed when the user can act on it.
- **New in the redesign** (in `components/ui/` since L1, unless noted):
  - **Tabs** (`components/room/Stage.tsx`): browser-style tabs in a `surface-2` bar. The open tab is `surface` and merges into the content; the active one gets the marker underline.
  - **Segmented control** (`Segmented`): options in a `surface-2` track, the chosen one on `surface`. Used for phone tabs and the classroom's file filters.
  - **Handle** (`Handle`): a resize `<button>` with an 8 px hit area and a thin `line` mark, `accent` on hover and focus, and arrow-key steps.
  - **Sheet** (`Sheet`): a phone bottom sheet with a `bg-video/45` backdrop, a `surface` panel with `rounded-t-2xl`, a grab bar and a close button.
  - **Switch** (`Switch`): a `role="switch"` toggle, `ok` when on. Used for "Student can write and draw" on phones.
  - **Label chip** (`Chip`): a small `rounded` label in `marker-soft`/`marker-ink` ("On screen", "Waiting") or `surface-2`/`ink-muted` ("In a tab", "View only").

## Lesson layout
Desktop, 1280 px and wider (teacher):
```
┌────────┬┬──────────────────────────────────────┬┬──────────┐
│ Anna   ││ ▶ Dialogue 2 ─────●──────── 0:42 ✕   ││ Anna's   │ ← audio bar (A1)
│ camera ││ [Spa menu.pdf ✕][Text ✕]  pill ⧉ Talk││ files    │ ← tab bar: open tabs,
├────────┤│ ┌───────────────┐┃┌───────────────┐   ││ PDFs     │   + (one tab only),
│ You    ││ │ tab 1         │┃│ tab 2 (active)│   ││ Pictures │   layout switch
└────────┘│ └───────────────┘┃└───────────────┘   ││ Audio    │
          ││                                      ││          │
          └┴──────────────────────────────────────┴┴──────────┘
  ↑ handles: cameras · split between tabs · files
  [T] Lesson with Anna      [Mute Anna] [✎ Anna can edit] │ mic · camera · share · leave
```
- **Tabs:** one or two open (Screen, Text, Draw, PDFs, pictures), side by side or one at a time. The student follows. All rules are in `docs/design/HANDOFF.md`.
- **Sizes by window width:**
  - 1280 px and wider: camera column 240 px, files panel 272 px.
  - 1024–1279 px: camera column 200 px, files folded to icons.
  - 768–1023 px: no camera column; small camera tiles float over the stage. They can be dragged and snap to the nearest corner (remembered per browser). The bottom bar shows icons only (each with a tooltip and label).
  - Each tab needs 320 px. When there isn't room for two, the stage switches to one at a time by itself.
- **Handles:** all dividers can be dragged (cameras 160–360 px, files 220–400 px). Sizes are saved per browser.
- **Just talk:** the two cameras fill the room side by side. Below 1024 px: the other person fills the room and your own camera floats small, draggable to any corner.
- **The student** has no files panel and no teacher controls.
- **Phone (below 768 px):**
  - camera tiles in a row, the audio bar, the tabs as a segmented control, then the active tab
  - **teacher:** a bottom bar with mic, camera, Files (sheet), ⋯ (sheet with Mute, "Student can write and draw", Just talk) and Leave
  - **student:** mic, camera and Leave
  - no screen sharing and no side by side

In L1 the files panel only lists the files; opening them (click or drag) comes in L2a, and the audio bar in A1.

## Other pages *(S5)*
- **Sign-in pages:** one layout. The form on the left, a short explanation of TeachingTime on a `surface-2` panel on the right; on phones, the form only.
- **Dashboard:** classroom cards in a grid; a waiting student's card stands out (`ink` border, yellow offset shadow, circled "Waiting"); "Start a quick call" is the main button; the name in lessons sits in the top bar.
- **Classroom:** the student and their link on the left, files on the right (drop area, filters, storage bar). Remove sits away from Start lesson.
- **Join:** a camera and microphone check, one name field, one big button.
- Details: `docs/design/HANDOFF.md`.

## Do / don't
- **Do** use the tokens. **Don't** write hex colours or `neutral-*`, `blue-*` and similar in components.
- **Do** keep teacher controls in their two places (tab bar, control bar). **Don't** scatter toggles across the screen.
- **Do** let the teacher choose what a new tab replaces (drop on "Replace …", or close a tab first). **Don't** replace an open tab silently.
- **Do** copy layout and copy from `docs/design/screens/`. **Don't** copy their raw colours, mock names or placeholder content.
- **Do** say what to do next in messages. **Don't** show raw error text.
- **Don't** add Tailwind size or colour classes on LiveKit `.lk-*` elements. Their CSS is unlayered and wins. Use LiveKit's CSS variables or inline `style` instead.
