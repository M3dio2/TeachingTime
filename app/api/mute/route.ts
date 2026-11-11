import { DataPacket_Kind, TrackSource } from "livekit-server-sdk";
import { MUTED_BY_TEACHER_TOPIC } from "@/lib/mute";
import { roomName, roomService } from "@/lib/livekit";
import { clientIp, LIMITS, overMemoryLimit, sharedLimit, tooMany } from "@/lib/rateLimit";
import { createClient } from "@/lib/supabase/server";

// Teacher mutes a participant's microphone ({ lessonId, identity }) or everyone else's
// ({ lessonId }). LiveKit can only mute a microphone, not switch it back on; each muted
// participant gets a message so their app can say what happened.
export async function POST(request: Request) {
  const ip = clientIp(request);
  if (overMemoryLimit(LIMITS.mute, ip)) return tooMany();

  const body = await request.json().catch(() => ({}));
  if (typeof body.lessonId !== "string") {
    return Response.json({ error: "Bad request" }, { status: 400 });
  }

  const supabase = await createClient();
  const [
    withinShared,
    {
      data: { user },
    },
  ] = await Promise.all([sharedLimit(LIMITS.mute, ip), supabase.auth.getUser()]);
  if (!withinShared) return tooMany();
  if (!user) {
    return Response.json({ error: "Please log in" }, { status: 401 });
  }
  // RLS: only finds the lesson if it belongs to this teacher.
  const { data: lesson } = await supabase
    .from("lessons")
    .select("id")
    .eq("id", body.lessonId)
    .maybeSingle();
  const client = roomService();
  if (!lesson || !client) {
    return Response.json({ error: "Lesson not found" }, { status: 404 });
  }

  const room = roomName(lesson.id);
  try {
    const participants = await client.listParticipants(room);
    const targets = participants.filter(
      (p) =>
        p.identity !== `teacher-${user.id}` &&
        (typeof body.identity !== "string" || p.identity === body.identity),
    );
    const muted: string[] = [];
    for (const p of targets) {
      for (const track of p.tracks) {
        if (track.source === TrackSource.MICROPHONE && !track.muted) {
          await client.mutePublishedTrack(room, p.identity, track.sid, true);
          if (!muted.includes(p.identity)) muted.push(p.identity);
        }
      }
    }
    if (muted.length) {
      await client.sendData(room, new Uint8Array(), DataPacket_Kind.RELIABLE, {
        destinationIdentities: muted,
        topic: MUTED_BY_TEACHER_TOPIC,
      });
    }
    return Response.json({ muted: muted.length });
  } catch (error) {
    console.error("Could not mute:", error);
    return Response.json({ error: "Could not mute right now" }, { status: 502 });
  }
}
