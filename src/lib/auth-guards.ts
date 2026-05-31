import { NextResponse } from "next/server";
import type { User } from "@supabase/supabase-js";
import { createServerSupabaseClient } from "./supabase/server";

/**
 * Resolve the authenticated admin user, or return a NextResponse error.
 *
 * This is the canonical admin authorization primitive. Routes that need the
 * admin's identity (e.g. to stamp `reviewed_by` / `approved_by` from the
 * SESSION rather than a spoofable request body) should use this directly.
 *
 * Allows ONLY real Supabase admins (user_metadata.role === "admin" |
 * "super_admin"). There is intentionally no demo/bypass path — identity is
 * always derived from the verified Supabase session.
 */
export async function getAdminUser(): Promise<User | NextResponse> {
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

  return user;
}

/**
 * Guard for admin-only API routes. Returns null if the request is
 * authorized, or a NextResponse with the appropriate error status otherwise.
 *
 * Allows ONLY real Supabase admins (user_metadata.role === "admin" |
 * "super_admin"). No demo/bypass path.
 */
export async function requireAdmin(): Promise<NextResponse | null> {
  const result = await getAdminUser();
  return result instanceof NextResponse ? result : null;
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

/**
 * Resolve how the current session should be scoped for dealer-owned
 * collections (invoices, back-orders, orders).
 *
 * - admin / super_admin → { isAdmin: true, scope: null }   (sees everything)
 * - dealer / sub_dealer → { isAdmin: false, scope: [uuid, code] }
 *
 * The scope contains BOTH the dealer's UUID and code because different tables
 * persist `dealer_id` differently (orders/back_orders/invoices store the
 * CODE, while some helpers use the UUID). Filtering with `.in("dealer_id",
 * scope)` is robust to either convention.
 *
 * Returns a NextResponse error for unauthenticated or unknown-role callers.
 */
export async function resolveDealerScope(): Promise<
  { isAdmin: boolean; scope: string[] | null } | NextResponse
> {
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
  if (role === "admin" || role === "super_admin") {
    return { isAdmin: true, scope: null };
  }
  if (role !== "dealer" && role !== "sub_dealer") {
    return NextResponse.json(
      { error: { code: "FORBIDDEN", message: "Access denied" } },
      { status: 403 }
    );
  }

  const { data: dealer } = await supabase
    .from("dealers")
    .select("id, code")
    .eq("supabase_uid", user.id)
    .maybeSingle();

  if (!dealer) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "Dealer profile not found" } },
      { status: 404 }
    );
  }

  const scope = [dealer.id, dealer.code].filter(
    (v): v is string => typeof v === "string" && v.length > 0
  );
  return { isAdmin: false, scope };
}

/**
 * Best-effort dealer lookup for routes that should still respond when the
 * caller is anonymous or an admin (e.g. catalog browsing). Returns the
 * authenticated dealer's UUID when one exists, otherwise null.
 *
 * Unlike `requireDealerSession`, this NEVER produces a NextResponse —
 * callers use the null return to skip dealer-scoped enrichment (such as
 * campaign discounts) without breaking the request.
 */
export async function resolveOptionalDealerId(): Promise<string | null> {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;
    const role = user.user_metadata?.role;
    if (role !== "dealer" && role !== "sub_dealer") return null;
    const { data: dealer } = await supabase
      .from("dealers")
      .select("id")
      .eq("supabase_uid", user.id)
      .maybeSingle();
    return dealer?.id ?? null;
  } catch (err) {
    console.error(
      "[resolveOptionalDealerId] unexpected error, falling back to no-discount path:",
      err,
    );
    return null;
  }
}
