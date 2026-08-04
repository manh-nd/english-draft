import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

/**
 * Retrieves the current session and returns the user.
 * Returns a 401 NextResponse if unauthenticated.
 *
 * Usage:
 *   const result = await requireSession();
 *   if (result instanceof NextResponse) return result;
 *   const { userId } = result;
 */
export async function requireSession(): Promise<
  { userId: string } | NextResponse
> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return { userId: session.user.id };
}
