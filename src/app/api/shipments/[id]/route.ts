// src/app/api/shipments/[id]/route.ts

import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getShipment, updateShipmentStatus } from "@/lib/shipments/service";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: { code: "UNAUTHORIZED" } }, { status: 401 });
    }

    const shipment = await getShipment(id);
    if (!shipment) {
      return NextResponse.json({ error: { code: "NOT_FOUND" } }, { status: 404 });
    }

    // Fetch lines
    const { data: lines } = await supabaseAdmin
      .from("shipment_lines")
      .select(
        "id, shipment_id, order_line_id, shipped_qty, order_lines(part_number, part_name, quantity_requested, unit_price)"
      )
      .eq("shipment_id", id);

    // Fetch timeline (status changes)
    const timeline = [
      {
        event: "Shipment created",
        status: "pending",
        actor: shipment.created_by,
        timestamp: shipment.created_at,
        notes: null,
      },
    ];

    return NextResponse.json({
      data: {
        ...shipment,
        shipment_lines: lines ?? [],
        timeline,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to get shipment";
    return NextResponse.json(
      { error: { code: "SERVER_ERROR", message } },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: { code: "UNAUTHORIZED" } }, { status: 401 });
    }

    const body = await req.json();
    const { shipment_status, ship_date, eta_delivery, actual_delivery_date, notes } = body;

    if (!shipment_status) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "shipment_status is required" } },
        { status: 400 }
      );
    }

    const updated = await updateShipmentStatus(id, shipment_status, user.id, {
      ship_date,
      eta_delivery,
      actual_delivery_date,
      notes,
    });

    return NextResponse.json({ data: updated });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update shipment";
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", message } },
      { status: 400 }
    );
  }
}
