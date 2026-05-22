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

/**
 * Guard for dealer-only API routes. Returns the authenticated dealer ID if
 * authorized, or a NextResponse with the appropriate error status otherwise.
 *
 * Allows: authenticated users with dealer or sub_dealer role
 */
export async function requireDealerSession(): Promise<string | NextResponse> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return NextResponse.json(
      { error: { code: "UNAUTHENTICATED", message: "Sign in required" } },
      { status: 401 }
    );
  }

  const role = user.user_metadata?.role;
  if (role !== "dealer" && role !== "sub_dealer") {
    return NextResponse.json(
      { error: { code: "FORBIDDEN", message: "Dealer access required" } },
      { status: 403 }
    );
  }

  // Get the dealer ID from the database using supabase_uid
  const { data: dealer, error: dealerError } = await supabase
    .from("dealers")
    .select("id")
    .eq("supabase_uid", user.id)
    .single();

  if (dealerError || !dealer) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "Dealer profile not found" } },
      { status: 404 }
    );
  }

  return dealer.id;
}

/**
 * Guard to ensure a dealer can only access their own data.
 * Pass the dealerId from the request and the authenticatedDealerId from requireDealerSession.
 *
 * Allows: admins (can access any dealer) or dealers accessing their own data
 */
export async function requireDealerOwnership(
  requestedDealerId: string,
  authenticatedDealerId: string
): Promise<NextResponse | null> {
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

  // Admins can access any dealer's data
  if (role === "admin" || role === "super_admin") {
    return null;
  }

  // Dealers can only access their own data
  if (authenticatedDealerId !== requestedDealerId) {
    return NextResponse.json(
      { error: { code: "FORBIDDEN", message: "Access denied" } },
      { status: 403 }
    );
  }

  return null;
}
