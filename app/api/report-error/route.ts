import { clientIp, LIMITS, overMemoryLimit, sharedLimit } from "@/lib/rateLimit";
import { createAdminClient } from "@/lib/supabase/server";

// The error pages send what went wrong here (G1), so a breakage shows up in Supabase's
// `error_reports` table before someone has to tell us. Short fields only; rate limited.
export async function POST(request: Request) {
  const ip = clientIp(request);
  if (overMemoryLimit(LIMITS.errorReport, ip) || !(await sharedLimit(LIMITS.errorReport, ip))) {
    return new Response(null, { status: 429 });
  }
  const body = await request.json().catch(() => ({}));
  const text = (v: unknown, max: number) => (typeof v === "string" ? v.slice(0, max) : null);
  const { error } = await createAdminClient()
    .from("error_reports")
    .insert({
      message: text(body.message, 1000),
      digest: text(body.digest, 100),
      page: text(body.page, 200),
      user_agent: text(request.headers.get("user-agent"), 300),
    });
  if (error) console.error("error_reports:", error.message);
  return new Response(null, { status: 204 });
}
