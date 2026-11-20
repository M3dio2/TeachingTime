import { WebhookReceiver } from "livekit-server-sdk";
import { createAdminClient } from "@/lib/supabase/server";

// LiveKit calls this when a room starts and when it finishes (set up in the LiveKit dashboard:
// Settings → Webhooks). The times go into lesson_sessions, which the token route uses for the
// per-teacher lesson-time limits (supabase/migrations/0010_beta_limits.sql, lib/limits.ts).
// The signature (a JWT signed with our API secret) proves the call comes from LiveKit.
export async function POST(request: Request) {
  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;
  if (!apiKey || !apiSecret) return new Response(null, { status: 500 });

  let event;
  try {
    const body = await request.text();
    event = await new WebhookReceiver(apiKey, apiSecret).receive(
      body,
      request.headers.get("Authorization") ?? undefined,
    );
  } catch (e) {
    await reportRejected(request.headers.get("Authorization"), apiKey, e);
    return new Response(null, { status: 401 });
  }

  const room = event.room;
  const lessonId = room?.name.startsWith("lesson-") ? room.name.slice("lesson-".length) : null;
  if (!room?.sid || !lessonId || !/^[0-9a-f-]{36}$/.test(lessonId)) return new Response(null, { status: 204 });
  const admin = createAdminClient();

  if (event.event === "room_started") {
    const { data: lesson } = await admin.from("lessons").select("teacher_id").eq("id", lessonId).maybeSingle();
    if (!lesson) return new Response(null, { status: 204 });
    const started = room.creationTime ? new Date(Number(room.creationTime) * 1000) : new Date();
    const { error } = await admin.from("lesson_sessions").upsert(
      { room_sid: room.sid, lesson_id: lessonId, teacher_id: lesson.teacher_id, started_at: started.toISOString() },
      { onConflict: "room_sid", ignoreDuplicates: true },
    );
    if (error) console.error("lesson_sessions insert:", error.message);
  } else if (event.event === "room_finished") {
    const { error } = await admin
      .from("lesson_sessions")
      .update({ ended_at: new Date().toISOString() })
      .eq("room_sid", room.sid)
      .is("ended_at", null);
    if (error) console.error("lesson_sessions update:", error.message);
  }
  return new Response(null, { status: 204 });
}

// A refused call that looks like LiveKit's (a signed token): note which key signed it, so a
// wrong signing key in the LiveKit dashboard shows up in /api/usage. Key names are not secret;
// only their first 6 characters are kept. At most one note per hour.
async function reportRejected(auth: string | null, ourKey: string, error: unknown) {
  const payload = auth?.replace(/^Bearer /, "").split(".")[1];
  if (!payload) return;
  let iss = "";
  try {
    iss = String(JSON.parse(Buffer.from(payload, "base64url").toString()).iss ?? "");
  } catch {
    return;
  }
  const admin = createAdminClient();
  const hourAgo = new Date(Date.now() - 3600_000).toISOString();
  const { count } = await admin
    .from("error_reports")
    .select("id", { count: "exact", head: true })
    .eq("page", "/api/livekit-webhook")
    .gte("created_at", hourAgo);
  if (count) return;
  const reason = error instanceof Error ? error.message.slice(0, 120) : "invalid";
  await admin.from("error_reports").insert({
    page: "/api/livekit-webhook",
    message: `webhook refused (${reason}): signed with key ${iss.slice(0, 6)}…, the app uses ${ourKey.slice(0, 6)}…`,
  });
}
