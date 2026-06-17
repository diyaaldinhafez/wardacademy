import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Refreshes the Supabase auth session on each request to the studio and guards
 * it: unauthenticated visitors are sent to the login page. Scoped to /studio
 * via the matcher in middleware.ts, so the marketing site is untouched.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // Do not run code between createServerClient and getUser — it refreshes the token.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const guarded =
    path.startsWith("/studio") || path.startsWith("/learn") || path.startsWith("/guardian");
  if (!user && guarded && path !== "/studio/login") {
    const url = request.nextUrl.clone();
    url.pathname = "/studio/login";
    return NextResponse.redirect(url);
  }

  return response;
}
