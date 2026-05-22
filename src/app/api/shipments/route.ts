// src/app/api/shipments/route.ts

import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { listShipments, createShipment } from "@/lib/shipments/service";
import type { CreateShipmentInput } from "@/lib/shipments/service";

export async function GET(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: { code: "UNAUTHORIZED" } }, { status: 401 });
    }

    const sp = req.nextUrl.searchParams;
    const orderId = sp.get("order_id");
    const status = sp.get("status");
    const carrierCode = sp.get("carrier_code");
    const dateFrom = sp.get("date_from");
    const dateTo = sp.get("date_to");
    const limit = Math.min(Number(sp.get("limit")) || 50, 200);
    const offset = Number(sp.get("offset")) || 0;

    const result = await listShipments({
      order_id: orderId || undefined,
      status: (status as any) || undefined,
      carrier_code: (carrierCode as any) || undefined,
      date_from: dateFrom || undefined,
      date_to: dateTo || undefined,
      limit,
      offset,
    });

    return NextResponse.json({
      data: result.data,
      meta: { total: result.total, limit: result.limit, offset: result.offset },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to list shipments";
    return NextResponse.json(
      { error: { code: "SERVER_ERROR", message } },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: { code: "UNAUTHORIZED" } }, { status: 401 });
    }

    const body = await req.json();
    const input: CreateShipmentInput = {
      order_id: body.order_id,
      carrier_code: body.carrier_code,
      carrier_name: body.carrier_name,
      tracking_number: body.tracking_number,
      awb_number: body.awb_number,
      dhl_reference: body.dhl_reference,
      shipment_type: body.shipment_type || "manual",
      notes: body.notes,
    };

    // Validate required fields
    if (!input.order_id || !input.carrier_code) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "order_id and carrier_code are required" } },
        { status: 400 }
      );
    }

    const shipment = await createShipment(input, user.id);

    return NextResponse.json({ data: shipment }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create shipment";
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", message } },
      { status: 400 }
    );
  }
}
