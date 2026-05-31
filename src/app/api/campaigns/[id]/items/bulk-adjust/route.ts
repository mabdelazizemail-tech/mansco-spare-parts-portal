import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getAdminUser } from "@/lib/auth-guards";

type BulkMode = "set_percentage" | "set_fixed" | "increase_pct" | "decrease_pct";

// POST /api/campaigns/[id]/items/bulk-adjust
// Body: { mode: BulkMode, value: number }
//   set_percentage  → all items become percentage discounts at `value`%
//   set_fixed       → all items become fixed EGP discounts at `value`
//   increase_pct    → percentage items only: add `value` points to current discount_value (capped 100)
//   decrease_pct    → percentage items only: subtract `value` points (floored 0)
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await getAdminUser();
  if (admin instanceof NextResponse) return admin;
  const { id } = await params;
  try {
    const { mode, value } = await req.json();

    const v = Number(value);
    if (!mode || Number.isNaN(v) || v < 0) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "mode and a non-negative numeric value are required" } },
        { status: 400 }
      );
    }
    const validModes: BulkMode[] = ["set_percentage", "set_fixed", "increase_pct", "decrease_pct"];
    if (!validModes.includes(mode)) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: `Invalid mode '${mode}'` } },
        { status: 400 }
      );
    }
    if ((mode === "set_percentage" || mode === "increase_pct" || mode === "decrease_pct") && v > 100) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "Percentage value cannot exceed 100" } },
        { status: 400 }
      );
    }

    // Load current items
    const { data: items, error: loadErr } = await supabaseAdmin
      .from("campaign_items")
      .select("id, discount_type, discount_value, part_number")
      .eq("campaign_id", id);

    if (loadErr) {
      return NextResponse.json(
        { error: { code: "DB_ERROR", message: loadErr.message } },
        { status: 500 }
      );
    }
    if (!items || items.length === 0) {
      return NextResponse.json(
        { error: { code: "NO_ITEMS", message: "Campaign has no items to adjust" } },
        { status: 400 }
      );
    }

    // Compute the patch per item
    type Patch = { id: string; discount_type: string; discount_value: number };
    const patches: Patch[] = [];

    for (const it of items) {
      let nextType = it.discount_type;
      let nextValue = Number(it.discount_value);

      switch (mode as BulkMode) {
        case "set_percentage":
          nextType = "percentage";
          nextValue = v;
          break;
        case "set_fixed":
          nextType = "fixed";
          nextValue = v;
          break;
        case "increase_pct":
          if (it.discount_type !== "percentage") continue; // skip non-percentage items
          nextValue = Math.min(100, Number(it.discount_value) + v);
          break;
        case "decrease_pct":
          if (it.discount_type !== "percentage") continue;
          nextValue = Math.max(0, Number(it.discount_value) - v);
          break;
      }

      patches.push({ id: it.id, discount_type: nextType, discount_value: nextValue });
    }

    if (patches.length === 0) {
      return NextResponse.json(
        { error: { code: "NO_APPLICABLE_ITEMS", message: "No items matched the chosen bulk-adjust mode" } },
        { status: 400 }
      );
    }

    // Apply patches (one update per item — Supabase doesn't have a batch update by primary key)
    const results = await Promise.all(
      patches.map((p) =>
        supabaseAdmin
          .from("campaign_items")
          .update({ discount_type: p.discount_type, discount_value: p.discount_value })
          .eq("id", p.id)
          .eq("campaign_id", id)
      )
    );

    const failures = results.filter((r) => r.error);
    if (failures.length > 0) {
      return NextResponse.json(
        {
          error: {
            code: "PARTIAL_FAILURE",
            message: `${failures.length}/${patches.length} updates failed`,
            details: failures.map((f) => f.error?.message),
          },
        },
        { status: 500 }
      );
    }

    // Audit
    await supabaseAdmin.from("campaign_audit_log").insert({
      campaign_id: id,
      action: "items_bulk_adjusted",
      details: {
        mode,
        value: v,
        items_affected: patches.length,
        items_total: items.length,
      },
      performed_by: admin.id,
    });

    return NextResponse.json({
      data: {
        adjusted: patches.length,
        skipped: items.length - patches.length,
        mode,
        value: v,
      },
    });
  } catch {
    return NextResponse.json(
      { error: { code: "SERVER_ERROR", message: "An unexpected error occurred" } },
      { status: 500 }
    );
  }
}
