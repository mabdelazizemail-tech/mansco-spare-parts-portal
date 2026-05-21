import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/auth-guards";

/**
 * GET /api/sync/logs
 *
 * Query params:
 *   limit — default 20
 *   file_type — optional filter (stock | pricing | parts_catalog)
 *
 * Returns recent SyncLog entries, newest first.
 */
export async function GET(req: NextRequest) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  try {
    const url = new URL(req.url);
    const limit = Math.min(Math.max(Number(url.searchParams.get("limit")) || 20, 1), 100);
    const fileType = url.searchParams.get("file_type");

    let query = supabaseAdmin
      .from("sync_logs")
      .select("*")
      .order("started_at", { ascending: false })
      .limit(limit);

    if (fileType) query = query.eq("file_type", fileType);

    const { data, error } = await query;
    if (error) {
      // Table may not exist yet — return empty list so the UI still renders
      return NextResponse.json({ data: [], meta: { unavailable: true, reason: error.message } });
    }
    return NextResponse.json({ data: data ?? [] });
  } catch (e) {
    return NextResponse.json(
      { error: { code: "SERVER_ERROR", message: e instanceof Error ? e.message : "Unexpected error" } },
      { status: 500 }
    );
  }
}
