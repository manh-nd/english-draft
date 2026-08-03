# Better Auth over NextAuth/Auth.js

We use Better Auth with Google OAuth for authentication instead of Auth.js v5 (NextAuth). Better Auth is TypeScript-first, lighter, and has a simpler API surface for the App Router. Auth.js v5 is more established but heavier and has had breaking API changes between versions.

Considered: Auth.js v5 (larger ecosystem but heavier), simple JWT auth (no OAuth, worse UX), NPM basic auth (no user model in app).
