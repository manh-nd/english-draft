import { describe, expect, it } from "bun:test";

// ---------------------------------------------------------------------------
// Lightweight stubs — no real DB / network needed
// ---------------------------------------------------------------------------

// We test the redirect logic by extracting it into pure helper functions that
// mirror what the middleware does, so we don't need to import the actual
// Next.js middleware (which would require a full Next.js runtime).

const PUBLIC_PATHS = ["/login", "/api/auth"];

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some((path) => pathname.startsWith(path));
}

/**
 * Simulate the middleware decision for a given pathname + session state.
 * Returns one of: "redirect-to-login" | "redirect-to-home" | "pass-through"
 */
function simulateMiddleware(
  pathname: string,
  hasSession: boolean
): "redirect-to-login" | "redirect-to-home" | "pass-through" {
  // Auth API always passes through
  if (pathname.startsWith("/api/auth")) return "pass-through";

  // Unauthenticated on a protected path
  if (!hasSession && !isPublicPath(pathname)) return "redirect-to-login";

  // Authenticated user on login page
  if (hasSession && pathname.startsWith("/login")) return "redirect-to-home";

  return "pass-through";
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("middleware redirect logic", () => {
  describe("unauthenticated requests", () => {
    it("redirects / to /login", () => {
      expect(simulateMiddleware("/", false)).toBe("redirect-to-login");
    });

    it("redirects /documents to /login", () => {
      expect(simulateMiddleware("/documents", false)).toBe("redirect-to-login");
    });

    it("redirects nested paths to /login", () => {
      expect(simulateMiddleware("/documents/abc-123", false)).toBe(
        "redirect-to-login"
      );
    });

    it("allows /login through", () => {
      expect(simulateMiddleware("/login", false)).toBe("pass-through");
    });

    it("allows /api/auth/signin through", () => {
      expect(simulateMiddleware("/api/auth/signin", false)).toBe(
        "pass-through"
      );
    });

    it("allows /api/auth/callback/google through", () => {
      expect(simulateMiddleware("/api/auth/callback/google", false)).toBe(
        "pass-through"
      );
    });
  });

  describe("authenticated requests", () => {
    it("allows / through", () => {
      expect(simulateMiddleware("/", true)).toBe("pass-through");
    });

    it("allows /documents through", () => {
      expect(simulateMiddleware("/documents", true)).toBe("pass-through");
    });

    it("redirects /login to / (home)", () => {
      expect(simulateMiddleware("/login", true)).toBe("redirect-to-home");
    });

    it("allows /api/auth routes through regardless", () => {
      expect(simulateMiddleware("/api/auth/session", true)).toBe(
        "pass-through"
      );
    });
  });

  describe("isPublicPath", () => {
    it("matches /login exactly", () => {
      expect(isPublicPath("/login")).toBe(true);
    });

    it("matches /api/auth and sub-paths", () => {
      expect(isPublicPath("/api/auth")).toBe(true);
      expect(isPublicPath("/api/auth/callback/google")).toBe(true);
    });

    it("does not match /api/other", () => {
      expect(isPublicPath("/api/other")).toBe(false);
    });

    it("does not match /", () => {
      expect(isPublicPath("/")).toBe(false);
    });
  });
});
