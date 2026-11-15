import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

// "Continue with Google": Google sends the teacher back to Supabase, Supabase sends her here with
// a one-time code, which becomes her session (cookie). A new teacher has an account from now on;
// the dashboard asks what students should call her (her Google name is suggested).
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL("/dashboard", request.url));
    console.error("Google sign-in:", error.message);
  }
  // Cancelled at Google, or the code was used already.
  return NextResponse.redirect(new URL("/login?google=failed", request.url));
}
