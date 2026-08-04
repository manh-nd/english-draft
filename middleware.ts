import { NextRequest, NextResponse } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

// Routes that don't require authentication
export const PUBLIC_PATHS = ["/login", "/api/auth"];

export function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some((path) => pathname.startsWith(path));
}

export type MiddlewareAction =
  { action: "pass" } | { action: "redirect"; url: string };

export function getMiddlewareAction(
  pathname: string,
  hasSession: boolean,
  baseUrl: string
): MiddlewareAction {
  // Auth API always passes through
  if (pathname.startsWith("/api/auth")) {
    return { action: "pass" };
  }

  // Unauthenticated on a protected path -> redirect to login with callbackUrl
  if (!hasSession && !isPublicPath(pathname)) {
    const loginUrl = new URL("/login", baseUrl);
    if (pathname !== "/") {
      loginUrl.searchParams.set("callbackUrl", pathname);
    }
    return { action: "redirect", url: loginUrl.toString() };
  }

  // Authenticated user visiting login -> redirect to app home
  if (hasSession && pathname.startsWith("/login")) {
    return { action: "redirect", url: new URL("/", baseUrl).toString() };
  }

  return { action: "pass" };
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const sessionCookie = getSessionCookie(request);
  const hasSession = Boolean(sessionCookie);

  const decision = getMiddlewareAction(pathname, hasSession, request.url);

  if (decision.action === "redirect") {
    return NextResponse.redirect(decision.url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths EXCEPT:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico, sitemap.xml, robots.txt
     * - public folder files
     */
    "/((?!_next/static|_next/image|favicon\\.ico|sitemap\\.xml|robots\\.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
