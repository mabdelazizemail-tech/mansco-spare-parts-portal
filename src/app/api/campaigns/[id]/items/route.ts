import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

// GET /api/campaigns/[id]/items – list items for a campaign
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const { data, error } = await supabaseAdmin
      .from("campaign_items")
      .select("*")
      .eq("campaign_id", id)
      .order("created_at", { ascending: true });

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

// POST /api/campaigns/[id]/items – add item(s) to a campaign
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const body = await req.json();
    const items = Array.isArray(body) ? body : [body];

    const toInsert = items.map((item: Record<string, unknown>) => ({
      campaign_id: id,
      part_number: item.part_number,
      part_description: item.part_description || null,
      discount_type: item.discount_type || "percentage",
      discount_value: item.discount_value || 0,
      min_order_quantity: item.min_order_quantity || 1,
      order_type_restriction: item.order_type_restriction || null,
    }));

    const { data, error } = await supabaseAdmin
      .from("campaign_items")
      .insert(toInsert)
      .select();

    if (error) {
      return NextResponse.json(
        { error: { code: "DB_ERROR", message: error.message } },
        { status: 500 }
      );
    }

    // Audit
    await supabaseAdmin.from("campaign_audit_log").insert({
      campaign_id: id,
      action: "item_added",
      details: { count: toInsert.length, part_numbers: toInsert.map((i) => i.part_number) },
    });

    return NextResponse.json({ data: data ?? [] }, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: { code: "SERVER_ERROR", message: "An unexpected error occurred" } },
      { status: 500 }
    );
  }
}

// DELETE /api/campaigns/[id]/items – remove item by item_id (in query param)
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const url = new URL(req.url);
    const itemId = url.searchParams.get("item_id");

    if (!itemId) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "item_id query param is required" } },
        { status: 400 }
      );
    }

    // Get part number for audit
    const { data: item } = await supabaseAdmin
      .from("campaign_items")
      .select("part_number")
      .eq("id", itemId)
      .eq("campaign_id", id)
      .single();

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

    if (item) {
      await supabaseAdmin.from("campaign_audit_log").insert({
        campaign_id: id,
        action: "item_removed",
        details: { part_number: item.part_number },
      });
    }

    return NextResponse.json({ data: { deleted: true } });
  } catch {
    return NextResponse.json(
      { error: { code: "SERVER_ERROR", message: "An unexpected error occurred" } },
      { status: 500 }
    );
  }
}
