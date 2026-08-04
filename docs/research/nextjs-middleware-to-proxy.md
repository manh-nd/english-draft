# Next.js Deprecation: Migrating `middleware` to `proxy`

**Author:** Technical Research Agent  
**Date:** August 4, 2026  
**Target File:** `docs/research/nextjs-middleware-to-proxy.md`  
**Status:** Completed

---

## Executive Summary

During production build execution (`bun run build`), Next.js 16 emits the following deprecation warning:

```text
⚠ The "middleware" file convention is deprecated. Please use "proxy" instead.
Learn more: https://nextjs.org/docs/messages/middleware-to-proxy
```

This research document analyzes why Next.js introduced this deprecation, details the architectural differences between `middleware.ts` and `proxy.ts`, performs an audit of the current codebase (`middleware.ts` and `middleware.test.ts`), and outlines an actionable migration plan with empirical verification steps.

---

## 1. Background & Cause

### 1.1 Architectural Shift in Next.js 16

In Next.js 16, Vercel/Next.js officially deprecated the `middleware.ts` (or `.js`) file convention and introduced `proxy.ts` (or `.js`) as its replacement.

- **Primary Reason for Naming Change:**  
  The term _"middleware"_ was historically overloaded and frequently confused with Node.js/Express.js style backend middleware. Developers often attempted to run heavy server-side business logic, ORM database queries, complex session mutations, or external API calls inside `middleware.ts`. Because middleware runs prior to every request at the network boundary (often on Edge runtime nodes), placing heavy synchronous or database tasks inside middleware introduced severe latency penalties (Time to First Byte / TTFB degradation) and edge timeout errors.

- **Purpose of `proxy.ts`:**  
  Renaming the convention to **`proxy`** explicitly communicates the architectural intent: it is a **lightweight network proxy gateway**. Its sole responsibility is request interception, header manipulation, path rewrites, dynamic redirects, and initial edge gating. Heavy data fetching and business logic should remain in Route Handlers (`app/api/.../route.ts`), Server Actions, or server components.

---

## 2. Comparison: `middleware.ts` vs `proxy.ts`

| Feature / Aspect             | Deprecated (`middleware.ts`)               | New (`proxy.ts`)                                | Notes / Changes                                            |
| :--------------------------- | :----------------------------------------- | :---------------------------------------------- | :--------------------------------------------------------- |
| **File Location & Name**     | `middleware.ts` (root or `src/`)           | `proxy.ts` (root or `src/`)                     | Renamed file convention.                                   |
| **Function Export Name**     | `export function middleware(...)`          | `export function proxy(...)`                    | Exported function must be named `proxy` or default export. |
| **Route Matching Config**    | `export const config = { matcher: [...] }` | `export const config = { matcher: [...] }`      | Unchanged structure & glob syntax.                         |
| **Request & Response Types** | `NextRequest`, `NextResponse`              | `NextRequest`, `NextResponse`                   | Imported from `next/server` (unchanged).                   |
| **Runtime Environment**      | Edge Runtime / Node.js Runtime             | Edge Runtime / Node.js Runtime                  | Network boundary execution before route rendering.         |
| **Recommended Usage**        | Frequently misused for heavy DB calls      | Strictly lightweight gating, redirects, headers | Architectural clarification.                               |

### 2.1 Function Export Signature Comparison

#### Legacy Syntax (`middleware.ts`):

```typescript
import { NextRequest, NextResponse } from "next/server";

export async function middleware(request: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
```

#### New Syntax (`proxy.ts`):

```typescript
import { NextRequest, NextResponse } from "next/server";

export async function proxy(request: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
```

---

## 3. Current Codebase Audit

### 3.1 [`middleware.ts`](file:///Users/manh/english-draft/middleware.ts)

The existing implementation in `middleware.ts` handles session-based route protection using `better-auth/cookies`:

1. **Imports & Types:**
   - Imports `NextRequest`, `NextResponse` from `next/server`.
   - Imports `getSessionCookie` from `better-auth/cookies`.
2. **Helper Logic (`getMiddlewareAction`, `isPublicPath`):**
   - Decoupled pure functions that evaluate route decisions without making network/DB calls.
   - `PUBLIC_PATHS = ["/login", "/api/auth"]`
   - Handles unauthenticated redirection to `/login?callbackUrl=...` and authenticated redirection from `/login` to `/`.
3. **Execution Function (`middleware`):**
   - `export async function middleware(request: NextRequest)` reads the session cookie synchronously and delegates to `getMiddlewareAction`.
4. **Matcher Configuration:**
   - Excludes static assets, Next.js internal paths (`_next/static`, `_next/image`), and public images/favicons.

### 3.2 [`middleware.test.ts`](file:///Users/manh/english-draft/middleware.test.ts)

- Contains 14 unit tests in Bun test format (`describe`, `it`, `expect` from `bun:test`).
- Directly imports `isPublicPath` and `getMiddlewareAction` from `./middleware`.
- Validates redirect target construction, callback URL encoding, and public route access.

### 3.3 Build Output Verification

Running `bun run build` yields:

```text
▲ Next.js 16.2.12 (Turbopack)
- Environments: .env

⚠ The "middleware" file convention is deprecated. Please use "proxy" instead. Learn more: https://nextjs.org/docs/messages/middleware-to-proxy
```

---

## 4. Recommended Migration Plan

To resolve the deprecation warning while maintaining 100% test coverage and zero breaking changes, follow these step-by-step instructions.

### Step 1: Automated Codemod or Manual Rename

#### Option A: Official Next.js Codemod

Next.js provides an official codemod to automate file and export renaming:

```bash
npx @next/codemod@canary middleware-to-proxy
```

#### Option B: Manual Renaming (Recommended for full control)

1. **Rename File:**
   ```bash
   mv middleware.ts proxy.ts
   mv middleware.test.ts proxy.test.ts
   ```
2. **Update Export & Types in [`proxy.ts`](file:///Users/manh/english-draft/proxy.ts):**
   - Rename function export `export async function middleware(...)` to `export async function proxy(...)`.
   - Optionally rename helper types/functions (e.g., `getMiddlewareAction` -> `getProxyAction`, `MiddlewareAction` -> `ProxyAction`).
3. **Update Unit Test Import in [`proxy.test.ts`](file:///Users/manh/english-draft/proxy.test.ts):**
   - Change `import { ... } from "./middleware"` to `import { ... } from "./proxy"`.

### Step 2: Proposed Code Changes

#### [`proxy.ts`](file:///Users/manh/english-draft/proxy.ts)

```typescript
import { NextRequest, NextResponse } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

// Routes that don't require authentication
export const PUBLIC_PATHS = ["/login", "/api/auth"];

export function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some((path) => pathname.startsWith(path));
}

export type ProxyAction =
  { action: "pass" } | { action: "redirect"; url: string };

export function getProxyAction(
  pathname: string,
  hasSession: boolean,
  baseUrl: string
): ProxyAction {
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

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const sessionCookie = getSessionCookie(request);
  const hasSession = Boolean(sessionCookie);

  const decision = getProxyAction(pathname, hasSession, request.url);

  if (decision.action === "redirect") {
    return NextResponse.redirect(decision.url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon\\.ico|sitemap\\.xml|robots\\.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
```

---

## 5. Verification Commands

After performing the migration, run the following commands to confirm clean execution:

1. **Run Unit Tests:**

   ```bash
   bun test
   ```

   _Expected Output:_ All tests pass across test files.

2. **Run TypeScript Check:**

   ```bash
   bun run typecheck
   ```

   _Expected Output:_ Clean exit code 0 without type errors.

3. **Run Production Build:**
   ```bash
   bun run build
   ```
   _Expected Output:_ Next.js build succeeds with zero `⚠ The "middleware" file convention is deprecated` warnings and lists `ƒ Proxy`.

---

## 6. Primary Source Citations

- **Next.js Deprecation Warning Page:**  
  [https://nextjs.org/docs/messages/middleware-to-proxy](https://nextjs.org/docs/messages/middleware-to-proxy)
- **Next.js Routing & Proxy Documentation:**  
  [https://nextjs.org/docs/app/getting-started/proxy](https://nextjs.org/docs/app/getting-started/proxy)
- **Official Codemod Repository / Command:**  
  `npx @next/codemod@canary middleware-to-proxy`
- **Local Workspace Dependencies & Source Files:**
  - [`package.json`](file:///Users/manh/english-draft/package.json) (`"next": "16.2.12"`)
  - [`middleware.ts`](file:///Users/manh/english-draft/middleware.ts)
  - [`middleware.test.ts`](file:///Users/manh/english-draft/middleware.test.ts)
  - [`next.config.ts`](file:///Users/manh/english-draft/next.config.ts)
