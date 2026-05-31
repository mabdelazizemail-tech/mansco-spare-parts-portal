import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/auth-guards";
import { dbError } from "@/lib/api-errors";

export async function GET(req: NextRequest) {
  // Authorization: admins only. Previously unauthenticated → leaked all dealer PII.
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  try {
    const sp = req.nextUrl.searchParams;
    const status = sp.get("status");
    const limit = Math.min(Number(sp.get("limit")) || 100, 200);
    const offset = Number(sp.get("offset")) || 0;

    let query = supabaseAdmin
      .from("dealer_registrations")
      .select("*", { count: "exact" })
      .order("submitted_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (status && status !== "all") query = query.eq("review_status", status);

    const { data, count, error } = await query;

    if (error) {
      return dbError(error);
    }

    return NextResponse.json({ data: data ?? [], meta: { total: count ?? 0, limit, offset } });
  } catch {
    return NextResponse.json(
      { error: { code: "SERVER_ERROR", message: "Failed to fetch registrations" } },
      { status: 500 }
    );
  }
}
