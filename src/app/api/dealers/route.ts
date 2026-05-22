import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/auth-guards";

export async function GET(req: NextRequest) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  // Optional ?include_deleted=true to surface soft-deleted dealers (for a "Trash" view).
  // Default behavior hides them so the main dealer table only shows live records.
  const includeDeleted = req.nextUrl.searchParams.get("include_deleted") === "true";

  try {
    let query = supabaseAdmin
      .from("dealers")
      .select("*")
      .order("created_at", { ascending: false });

    if (!includeDeleted) {
      query = query.is("deleted_at", null);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json(
        { error: { code: "DB_ERROR", message: error.message } },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: data ?? [] });
  } catch {
    return NextResponse.json(
      { error: { code: "SERVER_ERROR", message: "An unexpected error occurred" } },
      { status: 500 }
    );
  }
}
