import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from("dealer_registrations")
      .select("*")
      .order("submitted_at", { ascending: false });

    if (error) {
      return NextResponse.json(
        { error: { code: "DB_ERROR", message: error.message } },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: data ?? [] });
  } catch {
    return NextResponse.json(
      { error: { code: "SERVER_ERROR", message: "Failed to fetch registrations" } },
      { status: 500 }
    );
  }
}
