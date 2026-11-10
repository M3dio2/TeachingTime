# Architecture details

Read this before touching `lib/sync/`, the room (`components/room/`) or the API routes. `CLAUDE.md` has the short version.

## Roles and accounts
- The `teacher` or `student` role is put in the LiveKit token metadata by `/api/livekit-token`.
  - Teacher: must be logged in to Supabase.
  - Student: sends the lesson's `invite_slug` plus a display name, and needs no account.
- **Teacher accounts:** teachers sign up at `/signup` (name, email, password). The name goes into Supabase user metadata (`display_name`); the dashboard asks for it if it's missing, and the token route reads it with `getUser()`.
  - Email links (confirm sign-up, reset password) go to `/auth/confirm`, which calls `verifyOtp` and redirects (`next`, same-site paths only); bad or used links land on `/link-expired`. The Supabase email templates must point there (see the comment in `app/auth/confirm/route.ts`).
  - Emails are sent through custom SMTP (the teacher's Gmail for now): Supabase's built-in mailer only reaches its own team.
  - `proxy.ts`: `/`, `/signup`, `/forgot-password` are for logged-out visitors; `/dashboard`, `/lesson`, `/reset-password` need a login.

## Lessons
- `lessons.kind` is `student` (fixed link; board kept until the next lesson) or `quick` (one-off; not saved; deleted with "End" or after 12 hours).
- `lessons.last_active_at` is set by the token route when the teacher joins, and by each save.
  - If it's more than 3 hours old, `app/lesson/[id]/page.tsx` starts with a clean board.

## Classroom files
- Each student lesson has a classroom at `/dashboard/[id]`: Start lesson, the student link, and the teacher's files.
- Files sit in the private Storage bucket `resources` at `<teacher_id>/<lesson_id>/<random name>`, with one row each in the `resources` table (original name, kind `image`/`pdf`/`audio`, size). Migrations `0004_resources.sql`, `0005_resource_images.sql` and `0006_resource_limits.sql`.
- The bucket allows PDF, `audio/*` and JPG/PNG/WebP/GIF pictures, up to 10 MB each. One upload button takes all of them (the type is also read from the extension, as some browsers send none or "image/jpg"); the classroom lists them under Pictures, PDFs and Audio. RLS on the table and on `storage.objects`: a teacher only sees, adds and deletes their own, and only adds to their own student lessons.
- Each teacher can store 200 MB across all classrooms (the free tier's 1 GB is shared by every teacher). `resources_used_bytes()` sums the teacher's folder in Storage, and the upload policy refuses new files once it reaches 200 MB; the size of the file being uploaded isn't known there, so the total can end up at most one file (10 MB) over. The upload form checks the exact total first and shows how much is used.
- `components/classroom/FileUpload.tsx` uploads from the browser straight to Storage (server actions cap request bodies), then inserts the row. If the row fails, it deletes the upload again.
- Deleting a file or a student (`removeResource`, `removeLesson`) removes the stored files first: the rows cascade with the lesson, the files don't.
- The classroom's "open" links are signed URLs valid for an hour. Students get no Storage access.
- **In a lesson (L2a):** PDFs and pictures open as tabs (`pdf:<id>`, `image:<id>`). Both roles get the file through `/api/resource-url` (POST `{ slug, id }`): the service-role client finds the *student* lesson by `invite_slug` and the resource by id **and** `lesson_id`, then returns `{ name, kind, url }` with a signed URL valid 5 minutes. The browser downloads each file once and keeps it for the session (`lib/room/fileCache.ts`: PDF bytes, picture object URLs), so the short URL is never needed again. pdf.js (`pdfjs-dist`) renders from the bytes; its worker loads from the package via `new URL(…, import.meta.url)`.

## Shared state
One Yjs `Y.Doc` per join, created in `LessonContent` (`components/room/LessonRoom.tsx`). It holds:
- the text pad: Tiptap's default XML fragment
- `board`: a Y.Map of Excalidraw elements by id, merged with `reconcileElements`

## Sync
- `lib/sync/useYjsSync.ts` syncs the doc over LiveKit **data streams** (`lib/sync/transport.ts`; no size limit).
- When two peers see each other, they exchange state vectors and the missing updates. Late joins and refreshes recover from the peer.
- A full-state `diff` is applied only from a peer we asked (`awaitingDiff`: our join, a reconnect, or a gap after a dropped update), and a peer gets at most one full diff every 3 s, so a tampered client can neither push a rewritten document at will nor make us resend the whole document in a loop.

## Teacher settings (what the student follows)
The teacher's settings live in her LiveKit participant attributes (`lib/sync/useTeacherSettings.ts`), not in the Y.Doc: the teacher accepts full-state diffs from the student (to recover after a refresh), and those could change anything in the doc. The token route gives only teachers `canUpdateOwnMetadata`, so a student can't set attributes or change their own role. One hook publishes all keys in one `setAttributes` call whenever one changes, and on every (re)connect. Values are strings:
- `studentCanEdit`: `"true"` / `"false"` (see "Edit permission")
- `tabs`: JSON array of 1–2 tab ids (`screen`, `text`, `draw`; L2a adds `pdf:<id>`, `image:<id>`)
- `active`: `"0"` / `"1"`, the tab the teacher clicked last
- `layout`: `"split"` / `"single"` (a teacher on a phone publishes `single`)
- `justTalk`: `"true"` / `"false"`

The student reads them only from the participant whose token metadata says `teacher`, checks them (`cleanTabs`, `cleanActive`, `cleanLayout` in `lib/room/tabs.ts`: known ids, no duplicates, at most two) and writes nothing. Every join starts from the defaults (`["text"]`, side by side, not Just talk, editing off). When the teacher drops out, the student keeps the last tabs, but editing goes off.

The tab rules are pure functions in `lib/room/tabs.ts` (open, close, pick, screen started / stopped), tested without a browser in `e2e/l1-tab-rules.spec.ts`. Only the teacher's client runs them, in `LessonContent` (`components/room/LessonRoom.tsx`). It watches the room's screen-share track: a share opens Screen (left of a single tab, or in the active tab's place, remembering that tab), and the end of the share closes it and gives the remembered tab back.

Personal sizes (camera column, files panel, split between tabs, files folded) are in `localStorage` (`lib/useStored.ts`), never synced. Whether two tabs fit side by side is measured on each screen separately (320 px per tab); below that the stage shows one at a time by itself.

On a phone the student may tap between the teacher's two tabs; her choice lasts until the teacher switches tabs or opens or closes one.

**Audio (A1):** the `audio` attribute (`{ id, name, duration, startedAt, pausedAt }`, checked by `cleanAudio` in `lib/room/audio.ts`) drives both people's audio bar; the student computes the position from it. The sound itself is a separate LiveKit track from the teacher (`lib/room/useLessonAudio.ts`: an `<audio>` element → Web Audio → `MediaStreamAudioDestinationNode` → `publishTrack`, source "unknown"), so muting her microphone doesn't mute it. It's unpublished on Stop, at the end of the file and when she leaves.

**PDF scroll position** (`lib/sync/useViewSync.ts`) isn't an attribute: it changes too often. The teacher sends `{ tab, pos }` (pos = page index + fraction into the page, so different widths line up) as lossy data messages on topic `view`, at most 10 a second, and everything again (reliably) when someone joins. Only messages from the teacher count. The student can scroll but jumps to the teacher's next position.

## Edit permission
"Student can edit" is the `studentCanEdit` teacher setting above. It's enforced in two places:
- The student's editors are read-only when permission is off (Tiptap's `setEditable`, Excalidraw's `viewModeEnabled`).
- The teacher's client ignores student updates while permission is off.

Details:
- The teacher's filter drops live `update`s from the student; full-state `diff`s are applied only when the teacher asked for one (her own join or reconnect, or a gap), so a refreshed page can recover from the peer.
- Dropping a Yjs update leaves later updates from that client "pending", because they depend on it. `useYjsSync` notices pending structs and asks that peer for a diff, which heals the gap. A side effect: edits made while forbidden arrive once permission is back on, and a tampered client can still get content in through that one asked-for diff. The teacher can Clear and remove the student.

## Snapshots
- `useLessonPersistence` (teacher only) saves the whole Y.Doc as base64 into `lessons.doc_snapshot`.
- It saves every 30 seconds if something changed, when the tab is hidden, and when leaving.
- `app/lesson/[id]/page.tsx` loads the snapshot back into the teacher's doc.

## Teacher actions
- **Muting:** `/api/mute` (teacher only, checks lesson ownership) mutes microphones through LiveKit's server API and sends a server-only data message (`lib/mute.ts`) so the student sees why. LiveKit can't switch a mic back on; the student unmutes themselves.
- **Screen sharing:** only the teacher has the Share button, and only her token may publish a screen (`canPublishSources` limits students to camera and microphone). The room watches screen tracks from the teacher only, so nothing else can open the Screen tab. Student tokens also carry a `roomConfig` of two participants and a 5-minute empty timeout.
- **"Clear"** sits in the Text and Draw toolbars (teacher only) and clears only that tab for both (`lib/sync/clearLesson.ts`): `clearText` empties the text fragment, `clearBoard` marks whiteboard elements deleted with a higher version.
- The old (!) nudge (`useNudge`, a one-off data message that switched the student's board) is gone since L1: the student follows the teacher's tabs instead.

## Join camera check (S5)
- `components/room/CameraCheck.tsx`: the join card starts the camera and microphone with `createLocalTracks` (if both fail together it tries each alone, so a missing camera still lets the mic work) and shows a preview with mic/camera buttons that mute the tracks.
- Joining hands the tracks to `LessonRoom` (`tracks` prop): `LiveKitRoom` then gets `video={false} audio={false}` and `PublishTracks` publishes the same tracks once connected, so a muted mic stays muted. LiveKit stops them on disconnect. Rejoin skips the check and lets LiveKit start new tracks.

## Writing on PDFs (L2b)
- `lib/room/pdfInk.ts`: one flat `Y.Map` `pdfInk` in the lesson Y.Doc, keyed by item id: `{ file, page, tool: "pen" | "highlighter" | "text", pts | at + text }`. Coordinates are fractions of the page width on both axes, so every screen size lines up. Flat keys can't clash when both write at once; the eraser and Clear delete keys. It syncs and saves with the rest of the doc (the teacher ignores the student's edits while "can edit" is off).
- `components/room/PdfInk.tsx`: the sticky toolbar (Scroll is the default, so the PDF scrolls as before) and an SVG layer per page. With a tool picked the layer takes pointer events (`touch-action: none`); a stroke is sent when the pen lifts.
- **Save as new PDF** (teacher, student lessons): `inkedPdf` draws the items onto the original with `pdf-lib` (`drawSvgPath` on the crop box, Helvetica text), then `lib/files/uploadResource.ts` (shared with the classroom page's uploads) stores "Name (10 Nov 2026).pdf" and the room adds it to the files panel (`model.addFile`).
