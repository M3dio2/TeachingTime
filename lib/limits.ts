// Per-teacher limits while TeachingTime runs on free plans (docs/ROADMAP.md, G1). The database
// enforces the same (supabase/migrations/0008_classroom_cap.sql, 0010_beta_limits.sql); these
// are for the UI, server actions and the token route.
export const MAX_CLASSROOMS = 30;

// Lesson time, counted from LiveKit's room started/finished calls (app/api/livekit-webhook).
// LiveKit's free plan has 5,000 participant minutes a month for everyone (about 40 lesson-hours).
export const MONTHLY_LESSON_HOURS = 20;
export const MAX_LESSON_HOURS = 3;
// The teacher's room warns this long before the 3 hours are up.
export const LESSON_WARNING_MINUTES = 10;
