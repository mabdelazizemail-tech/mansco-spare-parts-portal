import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

// GET /api/campaigns – list all campaigns
export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const status = url.searchParams.get("status"); // filter by status

    let query = supabaseAdmin
      .from("campaigns")
      .select("*, campaign_items(count)")
      .order("created_at", { ascending: false });

    if (status && status !== "all") {
      query = query.eq("status", status);
    }

    const { data, error } = await query;

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

// POST /api/campaigns – create a new campaign
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const {
      name,
      description,
      campaign_type,
      start_date,
      end_date,
      target_audience,
      target_dealer_ids,
      target_dealer_group,
      eligibility_rules,
      items, // optional: array of campaign items to create with the campaign
    } = body;

    if (!name || !start_date || !end_date) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "Name, start_date, and end_date are required" } },
        { status: 400 }
      );
    }

    // Create campaign
    const { data: campaign, error: campError } = await supabaseAdmin
      .from("campaigns")
      .insert({
        name,
        description: description || null,
        campaign_type: campaign_type || "discount",
        status: "draft",
        start_date,
        end_date,
        target_audience: target_audience || "all",
        target_dealer_ids: target_dealer_ids || [],
        target_dealer_group: target_dealer_group || null,
        eligibility_rules: eligibility_rules || {},
      })
      .select()
      .single();

    if (campError) {
      return NextResponse.json(
        { error: { code: "DB_ERROR", message: campError.message } },
        { status: 500 }
      );
    }

    // Create items if provided
    if (items && Array.isArray(items) && items.length > 0) {
      const itemsToInsert = items.map((item: Record<string, unknown>) => ({
        campaign_id: campaign.id,
        part_number: item.part_number,
        part_description: item.part_description || null,
        discount_type: item.discount_type || "percentage",
        discount_value: item.discount_value || 0,
        min_order_quantity: item.min_order_quantity || 1,
        order_type_restriction: item.order_type_restriction || null,
      }));

      await supabaseAdmin.from("campaign_items").insert(itemsToInsert);
    }

    // Audit log
    await supabaseAdmin.from("campaign_audit_log").insert({
      campaign_id: campaign.id,
      action: "created",
      details: { name, campaign_type: campaign_type || "discount" },
    });

    return NextResponse.json({ data: campaign }, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: { code: "SERVER_ERROR", message: "An unexpected error occurred" } },
      { status: 500 }
    );
  }
}
