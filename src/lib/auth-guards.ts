import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "./supabase/server";

/**
 * Guard for admin-only API routes. Returns null if the request is
 * authorized, or a NextResponse with the appropriate error status otherwise.
 *
 * Allows: real Supabase admins (user_metadata.role === "admin" | "super_admin")
 *         and the demo-admin cookie used in local development.
 */
export async function requireAdmin(): Promise<NextResponse | null> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { error: { code: "UNAUTHENTICATED", message: "Sign in required" } },
      { status: 401 }
    );
  }

  const role = user.user_metadata?.role;
  if (role !== "admin" && role !== "super_admin") {
    return NextResponse.json(
      { error: { code: "FORBIDDEN", message: "Admin access required" } },
      { status: 403 }
    );
  }

  return null;
}
