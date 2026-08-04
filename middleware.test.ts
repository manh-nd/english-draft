import { describe, expect, it } from "bun:test";
import { isPublicPath, getMiddlewareAction } from "./middleware";

const BASE_URL = "http://localhost:3000";

describe("middleware redirect logic", () => {
  describe("unauthenticated requests", () => {
    it("redirects / to /login", () => {
      const res = getMiddlewareAction("/", false, BASE_URL);
      expect(res.action).toBe("redirect");
      if (res.action === "redirect") {
        expect(res.url).toBe("http://localhost:3000/login");
      }
    });

    it("redirects /documents to /login with callbackUrl", () => {
      const res = getMiddlewareAction("/documents", false, BASE_URL);
      expect(res.action).toBe("redirect");
      if (res.action === "redirect") {
        expect(res.url).toBe(
          "http://localhost:3000/login?callbackUrl=%2Fdocuments"
        );
      }
    });

    it("redirects nested paths to /login with callbackUrl", () => {
      const res = getMiddlewareAction("/documents/abc-123", false, BASE_URL);
      expect(res.action).toBe("redirect");
      if (res.action === "redirect") {
        expect(res.url).toBe(
          "http://localhost:3000/login?callbackUrl=%2Fdocuments%2Fabc-123"
        );
      }
    });

    it("allows /login through", () => {
      expect(getMiddlewareAction("/login", false, BASE_URL)).toEqual({
        action: "pass",
      });
    });

    it("allows /api/auth/signin through", () => {
      expect(getMiddlewareAction("/api/auth/signin", false, BASE_URL)).toEqual({
        action: "pass",
      });
    });

    it("allows /api/auth/callback/google through", () => {
      expect(
        getMiddlewareAction("/api/auth/callback/google", false, BASE_URL)
      ).toEqual({
        action: "pass",
      });
    });
  });

  describe("authenticated requests", () => {
    it("allows / through", () => {
      expect(getMiddlewareAction("/", true, BASE_URL)).toEqual({
        action: "pass",
      });
    });

    it("allows /documents through", () => {
      expect(getMiddlewareAction("/documents", true, BASE_URL)).toEqual({
        action: "pass",
      });
    });

    it("redirects /login to / (home)", () => {
      const res = getMiddlewareAction("/login", true, BASE_URL);
      expect(res.action).toBe("redirect");
      if (res.action === "redirect") {
        expect(res.url).toBe("http://localhost:3000/");
      }
    });

    it("allows /api/auth routes through regardless", () => {
      expect(getMiddlewareAction("/api/auth/session", true, BASE_URL)).toEqual({
        action: "pass",
      });
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
