import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/auth-guards";

export async function GET() {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  try {
    const { data, error } = await supabaseAdmin
      .from("dealers")
      .select("*")
      .order("created_at", { ascending: false });

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
