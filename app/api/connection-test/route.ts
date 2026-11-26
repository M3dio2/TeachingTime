import { AccessToken, RoomConfiguration } from "livekit-server-sdk";
import { clientIp, LIMITS, overMemoryLimit, sharedLimit, tooMany } from "@/lib/rateLimit";

// Asia: "Test my connection" on the join page (components/room/ConnectionTest.tsx). A token for
// a throw-away room of one, so LiveKit's own connection checks can measure the way from this
// network to the video servers (delay, lost packets, upload speed) before a lesson. No lesson,
// no name; a few minutes at most.
export async function POST(request: Request) {
  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;
  if (!apiKey || !apiSecret) return new Response(null, { status: 500 });
  const ip = clientIp(request);
  if (overMemoryLimit(LIMITS.connectionTest, ip) || !(await sharedLimit(LIMITS.connectionTest, ip))) return tooMany();

  const id = crypto.randomUUID();
  const token = new AccessToken(apiKey, apiSecret, { identity: `check-${id}`, name: "Connection test", ttl: "5m" });
  token.addGrant({
    roomJoin: true,
    room: `check-${id}`,
    canPublish: true,
    canSubscribe: true,
    canPublishData: false, // (the test publishes a drawn test picture, not a camera)
  });
  token.roomConfig = new RoomConfiguration({ maxParticipants: 1, emptyTimeout: 30 });
  return Response.json({ token: await token.toJwt() });
}
