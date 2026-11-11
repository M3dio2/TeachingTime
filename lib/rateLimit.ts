import "server-only";
import { createAdminClient } from "@/lib/supabase/server";

// H4 (security review): limits for the API routes. Two layers:
// - a count in this server instance's memory (instant, works everywhere, but each Vercel
//   instance counts on its own), and
// - a shared count in Postgres (supabase/migrations/0009_rate_limits.sql), so many instances
//   can't multiply the limit.
// The shared one fails open: if the database can't be asked (or the migration isn't run yet),
// the request goes through on the memory count alone.

export type Limit = { name: string; max: number; windowSeconds: number };

export const LIMITS = {
  token: { name: "token", max: 30, windowSeconds: 60 },
  resource: { name: "resource", max: 120, windowSeconds: 60 },
  mute: { name: "mute", max: 30, windowSeconds: 60 },
} satisfies Record<string, Limit>;

const memory = new Map<string, { start: number; hits: number }>();

function hitMemory(key: string, limit: Limit) {
  const now = Date.now();
  const entry = memory.get(key);
  if (!entry || now - entry.start > limit.windowSeconds * 1000) {
    memory.set(key, { start: now, hits: 1 });
    if (memory.size > 10_000) {
      // Forget old windows so the map can't grow without end.
      for (const [k, v] of memory) if (now - v.start > 3600_000) memory.delete(k);
    }
    return true;
  }
  entry.hits++;
  return entry.hits <= limit.max;
}

async function hitShared(key: string, limit: Limit) {
  try {
    const { data, error } = await createAdminClient().rpc("hit_rate_limit", {
      p_key: key,
      p_limit: limit.max,
      p_window_seconds: limit.windowSeconds,
    });
    if (error) return true;
    return data !== false;
  } catch {
    return true;
  }
}

// The caller's IP. On Vercel `x-forwarded-for` is set by the platform (not the client), and its
// first entry is the visitor; locally it's absent.
export function clientIp(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || request.headers.get("x-real-ip") || "local";
}

// Quick, memory-only check: run it first, before any other work.
export function overMemoryLimit(limit: Limit, who: string) {
  return !hitMemory(`${limit.name}:${who}`, limit);
}

// The shared check; start it alongside the route's own lookups so it adds no wait.
export function sharedLimit(limit: Limit, who: string) {
  return hitShared(`${limit.name}:${who}`, limit);
}

export function tooMany() {
  return Response.json(
    { error: "Too many tries. Please wait a minute and try again." },
    { status: 429, headers: { "Retry-After": "60" } },
  );
}
