// Per-teacher limits while TeachingTime runs on free plans (docs/ROADMAP.md, G1). The database
// enforces the same (supabase/migrations/0008_classroom_cap.sql, 0010_beta_limits.sql); these
// are for the UI, server actions and the token route.
export const MAX_CLASSROOMS = 30;

// Lesson time, counted from LiveKit's room started/finished calls (app/api/livekit-webhook).
// LiveKit's free plan has 5,000 participant minutes a month for everyone (about 40 lesson-hours).
// No monthly limit per teacher since Nov 2026 (the user's decision): the total of all teachers
// is watched instead (/api/usage, checked daily; the user is told at USAGE_ALERT_HOURS).
// `null` = no monthly limit; the token route still supports a number.
export const MONTHLY_LESSON_HOURS: number | null = null;
export const USAGE_ALERT_HOURS = 30;
// A forgotten call doesn't run all night.
export const MAX_LESSON_HOURS = 3;
// The teacher's room warns this long before the 3 hours are up.
export const LESSON_WARNING_MINUTES = 10;
