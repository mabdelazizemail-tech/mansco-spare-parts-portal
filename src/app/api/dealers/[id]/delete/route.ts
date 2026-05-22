import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";

/**
 * Soft-deletes a dealer. Requires the caller to retype the dealer's
 * company_name in the request body as a confirmation guard against accidental
 * deletes. Sets deleted_at + deleted_by and revokes portal access via the
 * Supabase user_metadata flag.
 *
 * Note: existing orders, invoices, and shipments remain intact and untouched.
 * To restore a deleted dealer, an admin can reset deleted_at to NULL.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Inline admin check so we can also keep a reference to the actor's UID
  // for the deleted_by audit field.
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

  const { id } = await params;

  let body: { confirm_company_name?: string } = {};
  try {
    body = await req.json();
  } catch {
    // Empty body — confirm_company_name will be undefined and we'll reject below.
  }
  const confirm = (body.confirm_company_name ?? "").trim();

  try {
    // 1. Load the dealer to verify it exists and to read company_name for the
    //    confirmation check.
    const { data: dealer, error: fetchError } = await supabaseAdmin
      .from("dealers")
      .select("id, supabase_uid, company_name, deleted_at")
      .eq("id", id)
      .single();

    if (fetchError || !dealer) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Dealer not found" } },
        { status: 404 }
      );
    }

    if (dealer.deleted_at) {
      return NextResponse.json(
        {
          error: {
            code: "ALREADY_DELETED",
            message: "This dealer has already been deleted",
          },
        },
        { status: 409 }
      );
    }

    // 2. Confirmation guard: caller must type the dealer's company name.
    if (confirm.toLowerCase() !== dealer.company_name.toLowerCase()) {
      return NextResponse.json(
        {
          error: {
            code: "CONFIRMATION_MISMATCH",
            message:
              "Confirmation does not match dealer company name. Type the company name exactly to confirm deletion.",
          },
        },
        { status: 400 }
      );
    }

    // 3. Soft-delete: set deleted_at and deleted_by. Leave is_active alone —
    //    that field continues to represent the suspend/active toggle, which
    //    is a separate concern.
    const nowIso = new Date().toISOString();
    const { error: updateError } = await supabaseAdmin
      .from("dealers")
      .update({
        deleted_at: nowIso,
        deleted_by: user.id,
        updated_at: nowIso,
      })
      .eq("id", id);

    if (updateError) {
      return NextResponse.json(
        { error: { code: "DB_ERROR", message: updateError.message } },
        { status: 500 }
      );
    }

    // 4. Revoke portal access at the auth layer so the dealer can't sign back in.
    if (dealer.supabase_uid) {
      await supabaseAdmin.auth.admin.updateUserById(dealer.supabase_uid, {
        user_metadata: {
          registration_status: "suspended",
        },
      });
    }

    return NextResponse.json({
      data: {
        message: `${dealer.company_name} has been deleted`,
        dealer_id: id,
        deleted_at: nowIso,
      },
    });
  } catch {
    return NextResponse.json(
      { error: { code: "SERVER_ERROR", message: "An unexpected error occurred" } },
      { status: 500 }
    );
  }
}
