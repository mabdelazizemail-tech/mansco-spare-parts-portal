import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getAdminUser } from "@/lib/auth-guards";

// POST /api/campaigns/[id]/duplicate – clone a campaign as draft (admin only)
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await getAdminUser();
  if (admin instanceof NextResponse) return admin;
  const { id } = await params;
  try {
    // Fetch original
    const { data: original, error: fetchErr } = await supabaseAdmin
      .from("campaigns")
      .select("*")
      .eq("id", id)
      .single();

    if (fetchErr || !original) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Campaign not found" } },
        { status: 404 }
      );
    }

    // Create clone
    const { data: clone, error: cloneErr } = await supabaseAdmin
      .from("campaigns")
      .insert({
        name: `${original.name} (Copy)`,
        description: original.description,
        campaign_type: original.campaign_type,
        status: "draft",
        start_date: original.start_date,
        end_date: original.end_date,
        target_audience: original.target_audience,
        target_dealer_ids: original.target_dealer_ids,
        target_dealer_group: original.target_dealer_group,
        eligibility_rules: original.eligibility_rules,
        created_by: admin.id,
      })
      .select()
      .single();

    if (cloneErr || !clone) {
      return NextResponse.json(
        { error: { code: "DB_ERROR", message: cloneErr?.message || "Clone failed" } },
        { status: 500 }
      );
    }

    // Clone items
    const { data: originalItems } = await supabaseAdmin
      .from("campaign_items")
      .select("*")
      .eq("campaign_id", id);

    if (originalItems && originalItems.length > 0) {
      const clonedItems = originalItems.map((item) => ({
        campaign_id: clone.id,
        part_number: item.part_number,
        part_description: item.part_description,
        discount_type: item.discount_type,
        discount_value: item.discount_value,
        min_order_quantity: item.min_order_quantity,
        order_type_restriction: item.order_type_restriction,
      }));

      await supabaseAdmin.from("campaign_items").insert(clonedItems);
    }

    // Audit
    await supabaseAdmin.from("campaign_audit_log").insert({
      campaign_id: clone.id,
      action: "created",
      details: { cloned_from: id, original_name: original.name },
      performed_by: admin.id,
    });

    return NextResponse.json({ data: clone }, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: { code: "SERVER_ERROR", message: "An unexpected error occurred" } },
      { status: 500 }
    );
  }
}
