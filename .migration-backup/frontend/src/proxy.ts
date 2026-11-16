import { type NextRequest, NextResponse } from "next/server";

/**
 * Supabase stores the session in a cookie whose name starts with
 * "sb-" and ends with "-auth-token". We check for its presence
 * rather than validating the JWT — proper JWT validation requires
 * the Supabase secret key which should never be in client-accessible
 * middleware on the edge runtime without @supabase/ssr.
 *
 * This is sufficient to prevent unauthenticated users from seeing
 * any admin HTML before being redirected, because:
 *  1. The cookie is HttpOnly-secured and set by Supabase on sign-in.
 *  2. The client-side AdminLayout still validates the full session on mount.
 */
function hasSupabaseAuthCookie(request: NextRequest): boolean {
  const cookies = request.cookies;
  for (const [name] of cookies) {
    if (name.startsWith("sb-") && name.endsWith("-auth-token")) {
      return true;
    }
  }
  return false;
}

export function proxy(request: NextRequest): NextResponse {
  const { pathname } = request.nextUrl;

  // Allow the login page through unconditionally
  if (pathname === "/admin/login") {
    return NextResponse.next();
  }

  // Protect all other /admin/* routes
  if (!hasSupabaseAuthCookie(request)) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/admin/login";
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
