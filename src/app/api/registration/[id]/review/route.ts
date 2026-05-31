import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getAdminUser } from "@/lib/auth-guards";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Authorization: admins only. Previously unauthenticated → anyone could
  // approve/reject any registration (privilege escalation).
  const admin = await getAdminUser();
  if (admin instanceof NextResponse) return admin;

  try {
    const { id } = await params;
    // FIX (G5): Accept admin_notes alongside rejection_reason
    const { action, rejection_reason, admin_notes } = await req.json();

    if (!["approve", "reject"].includes(action)) {
      return NextResponse.json(
        { error: { code: "INVALID_ACTION", message: "Action must be approve or reject" } },
        { status: 400 }
      );
    }

    const { data: registration, error: fetchError } = await supabaseAdmin
      .from("dealer_registrations")
      .select("*")
      .eq("id", id)
      .single();

    if (fetchError || !registration) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Registration not found" } },
        { status: 404 }
      );
    }

    // FIX (G4): Guard against double-review — a non-pending registration must not
    // be acted on again (prevents duplicate dealer records or state corruption).
    if (registration.review_status !== "pending") {
      return NextResponse.json(
        {
          error: {
            code: "ALREADY_REVIEWED",
            message: `This registration has already been ${registration.review_status}. No further action is allowed.`,
          },
        },
        { status: 409 }
      );
    }

    if (action === "approve") {
      // 1. Update the registration record
      const { error: updateRegError } = await supabaseAdmin
        .from("dealer_registrations")
        .update({
          review_status: "approved",
          reviewed_at: new Date().toISOString(),
          reviewed_by: admin.id,
          // store admin notes if provided
          ...(admin_notes ? { rejection_reason: `[Admin Notes] ${admin_notes}` } : {}),
        })
        .eq("id", id);

      if (updateRegError) {
        return NextResponse.json(
          { error: { code: "DB_ERROR", message: "Failed to update registration" } },
          { status: 500 }
        );
      }

      // 2. Update Supabase user_metadata so middleware allows dashboard access
      const { error: authUpdateError } = await supabaseAdmin.auth.admin.updateUserById(
        registration.supabase_uid,
        { user_metadata: { registration_status: "approved" } }
      );

      if (authUpdateError) {
        return NextResponse.json(
          { error: { code: "AUTH_ERROR", message: "Failed to update user status" } },
          { status: 500 }
        );
      }

      // 3. Create the Dealer record (the authoritative business record)
      const { error: dealerError } = await supabaseAdmin.from("dealers").insert({
        supabase_uid: registration.supabase_uid,
        email: registration.email,
        company_name: registration.company_name,
        contact_person: registration.contact_person,
        phone: registration.phone,
        tax_id: registration.tax_id,
        branch_address: registration.branch_address,
        dealer_type: registration.dealer_type_requested,
        parent_dealer_code: registration.parent_dealer_code,
        registration_status: "approved",
        is_active: true,
      });

      if (dealerError) {
        return NextResponse.json(
          { error: { code: "DB_ERROR", message: "Failed to create dealer record" } },
          { status: 500 }
        );
      }
    } else {
      // action === "reject"
      if (!rejection_reason || !rejection_reason.trim()) {
        return NextResponse.json(
          { error: { code: "VALIDATION_ERROR", message: "Rejection reason is required" } },
          { status: 400 }
        );
      }

      const { error: updateError } = await supabaseAdmin
        .from("dealer_registrations")
        .update({
          review_status: "rejected",
          rejection_reason: rejection_reason.trim(),
          reviewed_at: new Date().toISOString(),
          reviewed_by: admin.id,
        })
        .eq("id", id);

      if (updateError) {
        return NextResponse.json(
          { error: { code: "DB_ERROR", message: "Failed to update registration" } },
          { status: 500 }
        );
      }

      // Update Supabase user_metadata so pending page shows rejection state
      await supabaseAdmin.auth.admin.updateUserById(registration.supabase_uid, {
        user_metadata: {
          registration_status: "rejected",
          rejection_reason: rejection_reason.trim(),
        },
      });
    }

    return NextResponse.json({
      data: { message: `Registration ${action}d successfully` },
    });
  } catch {
    return NextResponse.json(
      { error: { code: "SERVER_ERROR", message: "An unexpected error occurred" } },
      { status: 500 }
    );
  }
}
