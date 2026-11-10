import "server-only";
import { RoomServiceClient } from "livekit-server-sdk";

// Server-only LiveKit helpers.

export function roomName(lessonId: string) {
  return `lesson-${lessonId}`;
}

export function roomService() {
  const url = process.env.NEXT_PUBLIC_LIVEKIT_URL;
  if (!url) return null;
  return new RoomServiceClient(
    url.replace(/^wss:/, "https:"),
    process.env.LIVEKIT_API_KEY,
    process.env.LIVEKIT_API_SECRET,
  );
}

// Lesson ids whose room has someone in it right now. On the dashboard the teacher isn't in
// any room, so this means "the student is waiting". null = LiveKit couldn't be asked, so
// callers must not treat rooms as empty.
// Lists all of the project's active rooms, so it can run alongside the lessons query instead
// of waiting for its ids; callers only look up their own lessons in the result.
export async function occupiedLessons(): Promise<Set<string> | null> {
  const client = roomService();
  if (!client) return null;
  try {
    const rooms = await client.listRooms();
    return new Set(
      rooms
        .filter((room) => room.numParticipants > 0)
        .map((room) => room.name.slice("lesson-".length)),
    );
  } catch (error) {
    console.error("Could not check LiveKit rooms:", error);
    return null;
  }
}

// Ends the call for everyone still in the room. Errors (e.g. the room already closed) are ignored.
export async function closeRoom(lessonId: string) {
  try {
    await roomService()?.deleteRoom(roomName(lessonId));
  } catch {}
}
