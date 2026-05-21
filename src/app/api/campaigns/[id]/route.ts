import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

// GET /api/campaigns/[id] – get single campaign with items
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const { data: campaign, error } = await supabaseAdmin
      .from("campaigns")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Campaign not found" } },
        { status: 404 }
      );
    }

    // Fetch items
    const { data: items } = await supabaseAdmin
      .from("campaign_items")
      .select("*")
      .eq("campaign_id", id)
      .order("created_at", { ascending: true });

    // Fetch audit log
    const { data: auditLog } = await supabaseAdmin
      .from("campaign_audit_log")
      .select("*")
      .eq("campaign_id", id)
      .order("created_at", { ascending: false })
      .limit(50);

    return NextResponse.json({
      data: { ...campaign, items: items ?? [], audit_log: auditLog ?? [] },
    });
  } catch {
    return NextResponse.json(
      { error: { code: "SERVER_ERROR", message: "An unexpected error occurred" } },
      { status: 500 }
    );
  }
}

// PUT /api/campaigns/[id] – update campaign
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const body = await req.json();

    const allowedFields: Record<string, unknown> = {};
    const editable = [
      "name",
      "description",
      "campaign_type",
      "start_date",
      "end_date",
      "target_audience",
      "target_dealer_ids",
      "target_dealer_group",
      "eligibility_rules",
    ];

    for (const key of editable) {
      if (body[key] !== undefined) {
        allowedFields[key] = body[key];
      }
    }

    if (Object.keys(allowedFields).length === 0) {
      return NextResponse.json(
        { error: { code: "NO_FIELDS", message: "No valid fields to update" } },
        { status: 400 }
      );
    }

    allowedFields.updated_at = new Date().toISOString();

    const { data, error } = await supabaseAdmin
      .from("campaigns")
      .update(allowedFields)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { error: { code: "DB_ERROR", message: error.message } },
        { status: 500 }
      );
    }

    // Audit
    await supabaseAdmin.from("campaign_audit_log").insert({
      campaign_id: id,
      action: "edited",
      details: { fields_updated: Object.keys(allowedFields).filter((k) => k !== "updated_at") },
    });

    return NextResponse.json({ data });
  } catch {
    return NextResponse.json(
      { error: { code: "SERVER_ERROR", message: "An unexpected error occurred" } },
      { status: 500 }
    );
  }
}

// DELETE /api/campaigns/[id] – delete draft campaign only
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    // Only allow deleting draft campaigns
    const { data: campaign } = await supabaseAdmin
      .from("campaigns")
      .select("status")
      .eq("id", id)
      .single();

    if (!campaign) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Campaign not found" } },
        { status: 404 }
      );
    }

    if (campaign.status !== "draft") {
      return NextResponse.json(
        { error: { code: "INVALID_STATE", message: "Only draft campaigns can be deleted" } },
        { status: 400 }
      );
    }

    const { error } = await supabaseAdmin
      .from("campaigns")
      .delete()
      .eq("id", id);

    if (error) {
      return NextResponse.json(
        { error: { code: "DB_ERROR", message: error.message } },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: { deleted: true } });
  } catch {
    return NextResponse.json(
      { error: { code: "SERVER_ERROR", message: "An unexpected error occurred" } },
      { status: 500 }
    );
  }
}
