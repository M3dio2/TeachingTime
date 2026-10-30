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
- Files sit in the private Storage bucket `resources` at `<teacher_id>/<lesson_id>/<random name>`, with one row each in the `resources` table (original name, kind `image`/`pdf`/`audio`, size). Migrations `0004_resources.sql` and `0005_resource_images.sql`.
- The bucket allows PDF, `audio/*` and JPG/PNG/WebP/GIF pictures, up to 20 MB each. One upload button takes all of them (the type is also read from the extension, as some browsers send none or "image/jpg"); the classroom lists them under Pictures, PDFs and Audio. RLS on the table and on `storage.objects`: a teacher only sees, adds and deletes their own, and only adds to their own student lessons.
- `components/classroom/FileUpload.tsx` uploads from the browser straight to Storage (server actions cap request bodies), then inserts the row. If the row fails, it deletes the upload again.
- Deleting a file or a student (`removeResource`, `removeLesson`) removes the stored files first: the rows cascade with the lesson, the files don't.
- The classroom's "open" links are signed URLs valid for an hour. Students get no Storage access; L2a will hand them short signed URLs from the server.

## Shared state
One Yjs `Y.Doc` per join, created in `LessonContent` (`components/room/LessonRoom.tsx`). It holds:
- the text pad: Tiptap's default XML fragment
- `board`: a Y.Map of Excalidraw elements by id, merged with `reconcileElements`

## Sync
- `lib/sync/useYjsSync.ts` syncs the doc over LiveKit **data streams** (`lib/sync/transport.ts`; no size limit).
- When two peers see each other, they exchange state vectors and the missing updates. Late joins and refreshes recover from the peer.

## Edit permission
The teacher's "student can edit" switch is **not** in the Y.Doc (the teacher accepts full-state diffs from the student, and those could change it). It's a LiveKit participant attribute on the teacher (`lib/sync/useStudentCanEdit.ts`). The token route gives only teachers `canUpdateOwnMetadata`, so a student can't set attributes or change their own role. It starts off on every join.

Enforced in two places:
- The student's editors are read-only when permission is off (Tiptap's `setEditable`, Excalidraw's `viewModeEnabled`).
- The teacher's client ignores student updates while permission is off.

Details:
- The teacher's filter drops live `update`s from the student, but always accepts full-state `diff`s, so a refreshed page can recover from the peer.
- Dropping a Yjs update leaves later updates from that client "pending", because they depend on it. `useYjsSync` notices pending structs and asks that peer for a diff, which heals the gap. A side effect: edits made while forbidden arrive once permission is back on.
- A tampered student client could still send a diff with board content while editing is off. Accepted (see S3 in `docs/ROADMAP.md`).

## Snapshots
- `useLessonPersistence` (teacher only) saves the whole Y.Doc as base64 into `lessons.doc_snapshot`.
- It saves every 30 seconds if something changed, when the tab is hidden, and when leaving.
- `app/lesson/[id]/page.tsx` loads the snapshot back into the teacher's doc.

## Teacher actions
- **Muting:** `/api/mute` (teacher only, checks lesson ownership) mutes microphones through LiveKit's server API and sends a server-only data message (`lib/mute.ts`) so the student sees why. LiveKit can't switch a mic back on; the student unmutes themselves.
- **(!) nudge** (`lib/sync/useNudge.ts`): a one-off LiveKit data message (topic `nudge`), not stored in the Y.Doc, so it isn't replayed on join or refresh. Only accepted from a participant whose token says `teacher`. The student's board switches to that tab and highlights it.
- **"Clear"** (`lib/sync/clearLesson.ts`) marks whiteboard elements deleted with a higher version, and empties the text fragment.
