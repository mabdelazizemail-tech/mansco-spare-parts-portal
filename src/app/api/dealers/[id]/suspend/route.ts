import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/auth-guards";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  const { id } = await params;

  try {
    const body = await req.json();
    const suspend = body.suspend === true; // true = suspend, false = reactivate

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

    // 2. Update the dealers table
    const { error: updateError } = await supabaseAdmin
      .from("dealers")
      .update({
        is_active: !suspend,
        registration_status: suspend ? "suspended" : "approved",
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (updateError) {
      return NextResponse.json(
        { error: { code: "DB_ERROR", message: updateError.message } },
        { status: 500 }
      );
    }

    // 3. Update Supabase Auth user_metadata so middleware blocks/allows access
    if (dealer.supabase_uid) {
      const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(
        dealer.supabase_uid,
        {
          user_metadata: {
            registration_status: suspend ? "suspended" : "approved",
          },
        }
      );

      if (authError) {
        // Rollback the dealer table change
        await supabaseAdmin
          .from("dealers")
          .update({
            is_active: suspend,
            registration_status: suspend ? "approved" : "suspended",
          })
          .eq("id", id);

        return NextResponse.json(
          { error: { code: "AUTH_ERROR", message: "Failed to update user access" } },
          { status: 500 }
        );
      }
    }

    // 4. Return the updated dealer
    const { data: updated } = await supabaseAdmin
      .from("dealers")
      .select("*")
      .eq("id", id)
      .single();

    return NextResponse.json({ data: updated });
  } catch {
    return NextResponse.json(
      { error: { code: "SERVER_ERROR", message: "An unexpected error occurred" } },
      { status: 500 }
    );
  }
}
