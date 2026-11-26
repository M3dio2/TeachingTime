# Plan: Calendar, Library, Slides (Nov 2026)

Mock-ups: `docs/mockups/calendar/Calendar and Library concepts.html` (10 screens, switch at the top).

## 1. Calendar

Goal: a teacher sees when her lessons are and gets into the call from there, without the app
getting heavier. Classrooms stay the heart: a lesson in the calendar is always *a Classroom at a
time*.

What a teacher can do:
- Plan a lesson: student, day, time, length (30/45/60/90), once or every week. From an empty
  spot in the week, from a Classroom card ("Plan"), or "+ Plan a lesson".
- Several lessons per student (Mon & Thu) and one-off extras / trial lessons.
- Move or cancel *one* lesson of a weekly series ("only this / every week"), like Google Calendar.
- Start the lesson from the calendar (button active 15 min before), see "Lucía is waiting".
- Put everything into Google / Apple / Outlook calendar with one subscription link (updates by
  itself; no Google login, no OAuth review).
- Student: their own times in their own time zone on their link (Fri 20:00 Zurich = Sat 03:00
  Beijing), "Add to my calendar", cancelled lessons disappear.

Where it lives (decision for you, see mock-ups 1–3):
- A. "Today" list on top of the Classrooms page + a Calendar tab.
- **B. "This week" column beside the Classrooms + a Calendar tab (recommended).**
- C. The week is the home page, Classrooms a side list.

Phone: no week grid, a day-by-day list with a big Start button (mock-up 6).

Not in v1 (keeps it simple): two-way Google sync (would need Google verification), booking
pages for students, paid reminders by SMS, group lessons. Email reminders to students need their
address: optional field later.

Data (one migration):
- `lesson_slots`: classroom, starts_at, minutes, weekly (bool), until (optional), created_by.
- `slot_changes`: slot, original date, moved_to / cancelled.
- The current `next_lesson_at` / `repeats_weekly` move into `lesson_slots` (migration copies them).
- A secret per teacher for the calendar subscription link (can be reset).

Size: about 4–6 days with tests.

## 2. Library (shared files) and big files

Problem: the same worksheet or book uploaded into every Classroom: slow for the teacher, and
stored (and paid) N times. Books are bigger than 10 MB.

Ideas:
1. **Library (recommended).** Files belong to the teacher; each is switched on for "All
   Classrooms" or chosen ones. Same pattern as quizzes (quiz_classrooms), so nothing new to learn.
   A file uploaded inside a Classroom stays that student's own (homework, their texts); "Move to
   Library" later. Stored once, counted once. In the lesson's file panel: "Lucía's files" and
   "From your Library".
2. **Big books, loaded page by page.** Today a PDF is downloaded completely before it shows.
   With range loading (pdf.js asks only for the pages you look at) a 100 MB book opens in
   seconds, for the student too. Plus "last time: page 84" per Classroom.
3. **Keep the book in Google Drive / Dropbox**, not on TeachingTime: no storage cost for us, but
   the student's side needs a temporary link from the cloud during the lesson (works for Dropbox;
   Google needs the file shared). Good as an extra, not as the main way.
4. **Automatic de-duplication**: the same file uploaded twice is stored once (by its fingerprint).
   Invisible for teachers; saves space even without the Library.
5. A "folders" tree: left out on purpose. Filters (documents, pictures…) plus search are enough
   for 1:1 teachers; folders add management work.

Limits and cost (decision for you):
- Supabase Free: 1 GB storage in total for all teachers, 50 MB max per file.
- Supabase Pro (about 25 USD/month): 100 GB included, bigger files possible.
- Suggestion for now: Library files up to 50 MB (fits Free), 500 MB per teacher counted once;
  switch to Pro when the first teachers fill it, then 100–200 MB per book.

Size: Library 3–4 days; range loading 1–2 days; de-duplication 1 day.

## 3. PowerPoint / presentations

- Done now: uploading a .pptx/.ppt/.key/.odp explains how to save it as PDF (PowerPoint, Keynote,
  Google Slides: two clicks). As a PDF, every slide is a page: in sync, with the pen.
- Proposed: a **"Slides" switch** on PDFs (mock-up 10): one slide fills the stage, ← → move both
  screens, the pen still works. About 1–2 days.
- Not recommended: playing .pptx directly. It needs a paid converter on a server (CloudConvert
  and similar), animations and fonts still break, and screen sharing already covers live
  PowerPoint with animations.

## 4. Asia (done in branch `asia-video`, details in docs/ASIA.md)

- Chat-app browsers (WeChat, LINE, KakaoTalk, Zalo, Facebook, Instagram…): the join page says so
  and how to open the link in Safari/Chrome; LINE and most Android apps get a one-tap "Open in
  my browser".
- "Test my connection" on the join page: LiveKit's own checks (delay, lost packets, upload)
  in ~20 s, one plain verdict and advice. Every result is sent to us with the country only
  (error_reports, page "connection-test"), so we see how China/Thailand really perform.
- In lessons: when someone's connection stays poor, their own video drops to the smallest copy
  (sound first) with a note and "Turn off my camera"; the teacher is told when the student's
  connection is weak.
- Video at most 1 Mbit/s, 24 fps (faces don't need more; long routes keep up); audio with
  redundancy (RED) so lost packets don't cut words.
- FAQ entry "Does it work with students in China?".
- What we can't change from here: LiveKit has no servers inside mainland China; the route goes to
  Hong Kong/Singapore/Tokyo through the firewall. If tests from China show "weak" often, the next
  steps are LiveKit's region settings (paid plans) or a provider with China coverage (Agora,
  Tencent TRTC), which is a bigger change.
