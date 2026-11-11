# TeachingTime

Live at [teachingtime.app](https://teachingtime.app).

1-on-1 online lessons: video call, screen share, a shared text pad and whiteboard, and the
teacher's PDFs, pictures and audio. Next.js + LiveKit + Yjs + Supabase, deployed on Vercel.

- How to work on it, test it and ship it: `AGENTS.md`
- What's built and what's next: `docs/ROADMAP.md`
- How it fits together: `docs/ARCHITECTURE.md`
- The design: `docs/DESIGN.md` and `docs/design/`

## Run it

```bash
cp .env.local.example .env.local   # fill in the LiveKit and Supabase keys
npm install
npm run dev
```

Run the SQL in `supabase/migrations/` (in order) in the Supabase SQL editor, once per project.

## Check it

```bash
npx tsc --noEmit -p .
npm run lint
npm run test:e2e   # Playwright; needs the test account in .env.local
npm run build
```
