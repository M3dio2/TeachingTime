import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Pages only for logged-out visitors: the start page, login, sign-up, forgot password.
// (A logged-in teacher who opens teachingtime.app goes straight to her classrooms.)
const loggedOutPages = ["/", "/login", "/signup", "/forgot-password"];

// Refreshes the Supabase session cookie, sends logged-out visitors from teacher
// pages to the login page, and logged-in teachers from the login pages to the dashboard.
// Pages and the token route still check auth themselves.
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet, headers) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
          Object.entries(headers).forEach(([key, value]) => response.headers.set(key, value));
        },
      },
    },
  );

  const { data } = await supabase.auth.getClaims();
  const loggedIn = Boolean(data?.claims);
  const onLoggedOutPage = loggedOutPages.includes(request.nextUrl.pathname);

  if (loggedIn && onLoggedOutPage) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }
  if (!loggedIn && !onLoggedOutPage) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return response;
}

export const config = {
  matcher: ["/", "/login", "/signup", "/forgot-password", "/reset-password", "/dashboard/:path*", "/lesson/:path*"],
};
