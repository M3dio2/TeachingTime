import { createHash, timingSafeEqual } from "node:crypto";
import { MAX_LESSON_HOURS } from "@/lib/limits";
import { createAdminClient } from "@/lib/supabase/server";

// This month's lesson time of all teachers together (UTC calendar month), for the agent's
// daily check against LiveKit's shared free plan (lib/limits.ts, USAGE_ALERT_HOURS). Only for
// whoever holds the token: here is just its SHA-256, so the public repo doesn't reveal it.
const TOKEN_SHA256 = "c0cf54718c45292a0ae06c39468e3962575817a15feff941f6c49adbf0ef00cc";

export async function GET(request: Request) {
  const given = request.headers.get("authorization")?.replace(/^Bearer /, "") ?? "";
  const hash = createHash("sha256").update(given).digest();
  if (!timingSafeEqual(hash, Buffer.from(TOKEN_SHA256, "hex"))) return new Response(null, { status: 404 });

  const now = new Date();
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const { data, error } = await createAdminClient()
    .from("lesson_sessions")
    .select("teacher_id, started_at, ended_at")
    .gte("started_at", monthStart.toISOString());
  if (error) return Response.json({ error: error.message }, { status: 500 });

  // A room still open counts until now (at most the per-lesson cap).
  const capMs = MAX_LESSON_HOURS * 3600_000;
  let ms = 0;
  for (const s of data ?? []) {
    const end = s.ended_at ? Date.parse(s.ended_at) : now.getTime();
    ms += Math.min(Math.max(0, end - Date.parse(s.started_at)), capMs);
  }
  return Response.json(
    {
      month: monthStart.toISOString().slice(0, 7),
      lessonHours: Math.round((ms / 3600_000) * 10) / 10,
      lessons: data?.length ?? 0,
      teachers: new Set((data ?? []).map((s) => s.teacher_id)).size,
    },
    { headers: { "cache-control": "no-store" } },
  );
}
