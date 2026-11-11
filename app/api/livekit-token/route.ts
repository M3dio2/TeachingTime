import { AccessToken, RoomConfiguration, TrackSource } from "livekit-server-sdk";
import { after } from "next/server";
import { MAX_LESSON_HOURS, MONTHLY_LESSON_HOURS } from "@/lib/limits";
import { closeRoom, roomName } from "@/lib/livekit";
import { clientIp, LIMITS, overMemoryLimit, sharedLimit, tooMany } from "@/lib/rateLimit";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { isWithin, QUICK_CALL_MAX_AGE_MS } from "@/lib/time";

type Role = "teacher" | "student";

// Teacher: { lessonId } plus a Supabase session; RLS makes sure the lesson is theirs.
// Student: { slug, name } from the invite link; no account needed.
// Identities are fixed (teacher account; one student per lesson), so joining again from another
// tab or device makes LiveKit drop the older one (DisconnectReason.DUPLICATE_IDENTITY).
export async function POST(request: Request) {
  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;
  if (!apiKey || !apiSecret) {
    return Response.json({ error: "LiveKit keys are not configured" }, { status: 500 });
  }

  // Rate limit per IP (lib/rateLimit.ts): memory first; the shared count runs alongside the
  // lookups below and is checked before a token is made.
  const ip = clientIp(request);
  if (overMemoryLimit(LIMITS.token, ip)) return tooMany();
  const withinShared = sharedLimit(LIMITS.token, ip);

  const body = await request.json().catch(() => ({}));
  let lessonId: string;
  let role: Role;
  let name: string;
  let identity: string;
  let teacherId: string;

  if (typeof body.lessonId === "string") {
    const supabase = await createClient();
    // Side by side: each is a round trip to Supabase. getUser (not getClaims): the name may
    // have changed since the session's token was issued. RLS makes the lesson query come back
    // empty unless the lesson belongs to this teacher.
    const [
      {
        data: { user },
      },
      { data: lesson },
    ] = await Promise.all([
      supabase.auth.getUser(),
      supabase.from("lessons").select("id").eq("id", body.lessonId).maybeSingle(),
    ]);
    if (!user) {
      return Response.json({ error: "Please log in" }, { status: 401 });
    }
    if (!lesson) {
      return Response.json({ error: "Lesson not found" }, { status: 404 });
    }
    lessonId = lesson.id;
    role = "teacher";
    // Marks the lesson as started (dashboard "Last lesson", 3-hour clean-board rule).
    // After the response, so joining doesn't wait for it.
    after(async () => {
      await supabase
        .from("lessons")
        .update({ last_active_at: new Date().toISOString() })
        .eq("id", lesson.id);
    });
    name = user.user_metadata.display_name || "Teacher";
    identity = `teacher-${user.id}`;
    teacherId = user.id;
  } else if (typeof body.slug === "string") {
    name = typeof body.name === "string" ? body.name.trim().slice(0, 40) : "";
    if (!name) {
      return Response.json({ error: "Name is required" }, { status: 400 });
    }
    const { data: lesson } = await createAdminClient()
      .from("lessons")
      .select("id, kind, created_at, teacher_id")
      .eq("invite_slug", body.slug)
      .maybeSingle();
    // A quick call's link stops working after 12 hours, even before the dashboard removes it.
    const expired = lesson?.kind === "quick" && !isWithin(lesson.created_at, QUICK_CALL_MAX_AGE_MS);
    if (!lesson || expired) {
      return Response.json({ error: "This invite link is not valid" }, { status: 404 });
    }
    lessonId = lesson.id;
    role = "student";
    // One student identity per lesson: a lesson is one teacher and one student, so joining from
    // a second device or tab makes LiveKit drop the older one (it shows "Continue here").
    // LiveKit Cloud doesn't enforce the room's maxParticipants (tested), so this is the limit.
    // Prefixed, so a student can never take over the teacher's identity.
    identity = `student-${lesson.id}`;
    teacherId = lesson.teacher_id;
  } else {
    return Response.json({ error: "Bad request" }, { status: 400 });
  }

  if (!(await withinShared)) return tooMany();

  const time = await lessonTime(teacherId, lessonId);
  if (time && time.month_seconds >= MONTHLY_LESSON_HOURS * 3600) {
    return Response.json(
      {
        error:
          role === "teacher"
            ? `You've used this month's ${MONTHLY_LESSON_HOURS} hours of lessons (TeachingTime is free while it's new). They come back on the 1st.`
            : "Your teacher's lesson time for this month is used up. Please ask them.",
        code: "month_limit",
      },
      { status: 403 },
    );
  }
  if (time && time.open_seconds >= MAX_LESSON_HOURS * 3600) {
    // A lesson that kept going past 3 hours (e.g. the teacher's tab was closed): end it.
    await closeRoom(lessonId);
    return Response.json(
      {
        error: `This lesson ran for ${MAX_LESSON_HOURS} hours, the most for one lesson, so it ended. Start it again to continue.`,
        code: "lesson_limit",
      },
      { status: 403 },
    );
  }

  const token = new AccessToken(apiKey, apiSecret, {
    identity,
    name,
    metadata: JSON.stringify({ role }),
    ttl: "4h",
  });
  // No room admin for anyone (muting goes through /api/mute). Only the teacher may set their own
  // attributes ("student can edit" and the tabs, lib/sync/useTeacherSettings.ts); a student can't change
  // their metadata, so they can't make themselves a teacher. Students may publish camera and
  // microphone only: no screen share, whatever their client says.
  token.addGrant({
    roomJoin: true,
    room: roomName(lessonId),
    canPublish: true,
    canSubscribe: true,
    canPublishData: true,
    canUpdateOwnMetadata: role === "teacher",
    canPublishSources: role === "teacher" ? undefined : [TrackSource.CAMERA, TrackSource.MICROPHONE],
  });
  // A lesson is two people. The room takes these settings from the token that creates it.
  token.roomConfig = new RoomConfiguration({ maxParticipants: 2, emptyTimeout: 5 * 60 });

  return Response.json({ token: await token.toJwt() });
}

// This month's lesson time for the teacher and how long this lesson's room has been open
// (supabase/migrations/0010_beta_limits.sql). null if it can't be asked (e.g. the migration
// hasn't been run): then nobody is refused for time.
async function lessonTime(teacherId: string, lessonId: string) {
  const { data, error } = await createAdminClient().rpc("lesson_time", { p_teacher: teacherId, p_lesson: lessonId });
  if (error || !data) return null;
  return data as { month_seconds: number; open_seconds: number };
}
