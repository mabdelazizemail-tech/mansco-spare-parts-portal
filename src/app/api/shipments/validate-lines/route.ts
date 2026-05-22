// src/app/api/shipments/validate-lines/route.ts

import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { validateShippedQty } from "@/lib/shipments/validation";

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: { code: "UNAUTHORIZED" } }, { status: 401 });
    }

    const { order_id, order_line_ids, quantities } = await req.json();

    if (!order_id || !Array.isArray(order_line_ids) || !Array.isArray(quantities)) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "order_id, order_line_ids[], and quantities[] are required" } },
        { status: 400 }
      );
    }

    if (order_line_ids.length !== quantities.length) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "order_line_ids and quantities must have same length" } },
        { status: 400 }
      );
    }

    // Fetch all order lines
    const { data: lines } = await supabaseAdmin
      .from("order_lines")
      .select("id, quantity_requested")
      .eq("order_id", order_id);

    const lineMap = new Map(lines?.map(l => [l.id, l.quantity_requested]) ?? []);

    // For each line, calculate cumulative shipped qty
    const results = [];
    let valid = true;

    for (let i = 0; i < order_line_ids.length; i++) {
      const lineId = order_line_ids[i];
      const requestedQty = quantities[i];
      const orderedQty = lineMap.get(lineId);

      if (!orderedQty) {
        results.push({
          order_line_id: lineId,
          requested_qty: requestedQty,
          ordered_qty: null,
          already_shipped: 0,
          available: 0,
          status: "error",
          error: "Order line not found",
        });
        valid = false;
        continue;
      }

      // Get cumulative shipped
      const { data: shipLines } = await supabaseAdmin
        .from("shipment_lines")
        .select("shipped_qty")
        .eq("order_line_id", lineId);

      const alreadyShipped = shipLines?.reduce((s, l) => s + l.shipped_qty, 0) ?? 0;
      const available = orderedQty - alreadyShipped;

      const isValid = validateShippedQty(requestedQty, { ordered_qty: orderedQty, already_shipped: alreadyShipped });

      results.push({
        order_line_id: lineId,
        requested_qty: requestedQty,
        ordered_qty: orderedQty,
        already_shipped: alreadyShipped,
        available,
        status: isValid ? "ok" : "error",
        error: isValid ? null : `Requested ${requestedQty} but only ${available} available`,
      });

      if (!isValid) valid = false;
    }

    return NextResponse.json({
      data: {
        valid,
        lines: results,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to validate lines";
    return NextResponse.json(
      { error: { code: "SERVER_ERROR", message } },
      { status: 500 }
    );
  }
}
