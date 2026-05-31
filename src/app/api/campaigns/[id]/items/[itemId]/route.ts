import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getAdminUser } from "@/lib/auth-guards";

type RouteParams = { params: Promise<{ id: string; itemId: string }> };

// PUT /api/campaigns/[id]/items/[itemId] – update a single campaign item (admin only)
export async function PUT(req: NextRequest, { params }: RouteParams) {
  const admin = await getAdminUser();
  if (admin instanceof NextResponse) return admin;
  const { id, itemId } = await params;
  try {
    const body = await req.json();

    // Validation
    if (body.discount_value !== undefined) {
      const v = Number(body.discount_value);
      if (Number.isNaN(v) || v < 0) {
        return NextResponse.json(
          { error: { code: "VALIDATION_ERROR", message: "discount_value must be a non-negative number" } },
          { status: 400 }
        );
      }
      if (body.discount_type === "percentage" && v > 100) {
        return NextResponse.json(
          { error: { code: "VALIDATION_ERROR", message: "Percentage discount cannot exceed 100" } },
          { status: 400 }
        );
      }
    }
    if (body.min_order_quantity !== undefined) {
      const q = Number(body.min_order_quantity);
      if (Number.isNaN(q) || q < 1) {
        return NextResponse.json(
          { error: { code: "VALIDATION_ERROR", message: "min_order_quantity must be ≥ 1" } },
          { status: 400 }
        );
      }
    }

    // Snapshot for audit (before mutation)
    const { data: before } = await supabaseAdmin
      .from("campaign_items")
      .select("*")
      .eq("id", itemId)
      .eq("campaign_id", id)
      .single();

    if (!before) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Item not found" } },
        { status: 404 }
      );
    }

    const patch: Record<string, unknown> = {};
    if (body.part_number !== undefined) patch.part_number = String(body.part_number).trim();
    if (body.part_description !== undefined) patch.part_description = body.part_description || null;
    if (body.discount_type !== undefined) patch.discount_type = body.discount_type;
    if (body.discount_value !== undefined) patch.discount_value = Number(body.discount_value);
    if (body.min_order_quantity !== undefined) patch.min_order_quantity = Number(body.min_order_quantity);
    if (body.order_type_restriction !== undefined) patch.order_type_restriction = body.order_type_restriction || null;

    const { data, error } = await supabaseAdmin
      .from("campaign_items")
      .update(patch)
      .eq("id", itemId)
      .eq("campaign_id", id)
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { error: { code: "DB_ERROR", message: error.message } },
        { status: 500 }
      );
    }

    // Build per-field diff for audit
    const diff: Record<string, { from: unknown; to: unknown }> = {};
    for (const key of Object.keys(patch)) {
      if ((before as Record<string, unknown>)[key] !== patch[key]) {
        diff[key] = { from: (before as Record<string, unknown>)[key], to: patch[key] };
      }
    }

    await supabaseAdmin.from("campaign_audit_log").insert({
      campaign_id: id,
      action: "item_edited",
      details: {
        item_id: itemId,
        part_number: before.part_number,
        changes: diff,
      },
      performed_by: admin.id,
    });

    return NextResponse.json({ data });
  } catch {
    return NextResponse.json(
      { error: { code: "SERVER_ERROR", message: "An unexpected error occurred" } },
      { status: 500 }
    );
  }
}

// DELETE /api/campaigns/[id]/items/[itemId] – remove a single campaign item
export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  const admin = await getAdminUser();
  if (admin instanceof NextResponse) return admin;
  const { id, itemId } = await params;
  try {
    const { data: item } = await supabaseAdmin
      .from("campaign_items")
      .select("part_number")
      .eq("id", itemId)
      .eq("campaign_id", id)
      .single();

    if (!item) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Item not found" } },
        { status: 404 }
      );
    }

    const { error } = await supabaseAdmin
      .from("campaign_items")
      .delete()
      .eq("id", itemId)
      .eq("campaign_id", id);

    if (error) {
      return NextResponse.json(
        { error: { code: "DB_ERROR", message: error.message } },
        { status: 500 }
      );
    }

    await supabaseAdmin.from("campaign_audit_log").insert({
      campaign_id: id,
      action: "item_removed",
      details: { item_id: itemId, part_number: item.part_number },
      performed_by: admin.id,
    });

    return NextResponse.json({ data: { deleted: true } });
  } catch {
    return NextResponse.json(
      { error: { code: "SERVER_ERROR", message: "An unexpected error occurred" } },
      { status: 500 }
    );
  }
}
