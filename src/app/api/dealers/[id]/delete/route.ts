import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/auth-guards";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  const { id } = await params;

  try {
    // 1. Get the dealer record to find supabase_uid
    const { data: dealer, error: fetchError } = await supabaseAdmin
      .from("dealers")
      .select("id, supabase_uid, company_name")
      .eq("id", id)
      .single();

    if (fetchError || !dealer) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Dealer not found" } },
        { status: 404 }
      );
    }

    // 2. Soft delete: mark as inactive (deactivated)
    const { error: updateError } = await supabaseAdmin
      .from("dealers")
      .update({
        is_active: false,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (updateError) {
      return NextResponse.json(
        { error: { code: "DB_ERROR", message: updateError.message } },
        { status: 500 }
      );
    }

    // 3. Update Supabase Auth user_metadata to block access
    if (dealer.supabase_uid) {
      await supabaseAdmin.auth.admin.updateUserById(dealer.supabase_uid, {
        user_metadata: {
          registration_status: "suspended",
        },
      });
    }

    return NextResponse.json({
      data: { message: `${dealer.company_name} has been deleted`, dealer_id: id },
    });
  } catch {
    return NextResponse.json(
      { error: { code: "SERVER_ERROR", message: "An unexpected error occurred" } },
      { status: 500 }
    );
  }
}
