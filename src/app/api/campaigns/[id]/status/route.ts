import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

// Valid state transitions
const TRANSITIONS: Record<string, string[]> = {
  draft: ["active"],
  active: ["paused", "completed"],
  paused: ["active", "completed"],
  completed: ["archived"],
};

// POST /api/campaigns/[id]/status – change campaign status
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const { status: newStatus, reason } = await req.json();

    if (!newStatus) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "status is required" } },
        { status: 400 }
      );
    }

    // Get current campaign
    const { data: campaign, error: fetchErr } = await supabaseAdmin
      .from("campaigns")
      .select("status, name")
      .eq("id", id)
      .single();

    if (fetchErr || !campaign) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Campaign not found" } },
        { status: 404 }
      );
    }

    const allowed = TRANSITIONS[campaign.status] ?? [];
    if (!allowed.includes(newStatus)) {
      return NextResponse.json(
        {
          error: {
            code: "INVALID_TRANSITION",
            message: `Cannot transition from '${campaign.status}' to '${newStatus}'. Allowed: ${allowed.join(", ") || "none"}`,
          },
        },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from("campaigns")
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { error: { code: "DB_ERROR", message: error.message } },
        { status: 500 }
      );
    }

    // Map status to audit action
    const actionMap: Record<string, string> = {
      active: campaign.status === "paused" ? "resumed" : "activated",
      paused: "paused",
      completed: "completed",
      archived: "archived",
    };

    await supabaseAdmin.from("campaign_audit_log").insert({
      campaign_id: id,
      action: actionMap[newStatus] || newStatus,
      details: {
        from: campaign.status,
        to: newStatus,
        ...(reason ? { reason } : {}),
      },
    });

    return NextResponse.json({ data });
  } catch {
    return NextResponse.json(
      { error: { code: "SERVER_ERROR", message: "An unexpected error occurred" } },
      { status: 500 }
    );
  }
}
