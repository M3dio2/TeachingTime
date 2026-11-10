import { AccessToken, RoomConfiguration, TrackSource } from "livekit-server-sdk";
import { after } from "next/server";
import { roomName } from "@/lib/livekit";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { isWithin, QUICK_CALL_MAX_AGE_MS } from "@/lib/time";

type Role = "teacher" | "student";

// Teacher: { lessonId } plus a Supabase session; RLS makes sure the lesson is theirs.
// Student: { slug, name, clientId } from the invite link; no account needed.
// Identities are fixed per person (teacher account, student browser), so joining again from
// another tab makes LiveKit drop the older one (DisconnectReason.DUPLICATE_IDENTITY).
export async function POST(request: Request) {
  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;
  if (!apiKey || !apiSecret) {
    return Response.json({ error: "LiveKit keys are not configured" }, { status: 500 });
  }

  const body = await request.json().catch(() => ({}));
  let lessonId: string;
  let role: Role;
  let name: string;
  let identity: string;

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
  } else if (typeof body.slug === "string") {
    name = typeof body.name === "string" ? body.name.trim().slice(0, 40) : "";
    if (!name) {
      return Response.json({ error: "Name is required" }, { status: 400 });
    }
    const { data: lesson } = await createAdminClient()
      .from("lessons")
      .select("id, kind, created_at")
      .eq("invite_slug", body.slug)
      .maybeSingle();
    // A quick call's link stops working after 12 hours, even before the dashboard removes it.
    const expired = lesson?.kind === "quick" && !isWithin(lesson.created_at, QUICK_CALL_MAX_AGE_MS);
    if (!lesson || expired) {
      return Response.json({ error: "This invite link is not valid" }, { status: 404 });
    }
    lessonId = lesson.id;
    role = "student";
    // Prefixed, so a student can never take over the teacher's identity.
    // typeof first: the regex alone accepts a missing id as the string "undefined", and every
    // such student would then share one identity and kick each other out of the room.
    const clientId =
      typeof body.clientId === "string" && /^[a-z0-9-]{8,40}$/i.test(body.clientId)
        ? body.clientId
        : crypto.randomUUID();
    identity = `student-${clientId}`;
  } else {
    return Response.json({ error: "Bad request" }, { status: 400 });
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
