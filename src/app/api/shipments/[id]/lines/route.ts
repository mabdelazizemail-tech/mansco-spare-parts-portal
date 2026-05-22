// src/app/api/shipments/[id]/lines/route.ts

import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { addShipmentLine } from "@/lib/shipments/service";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: { code: "UNAUTHORIZED" } }, { status: 401 });
    }

    const body = await req.json();
    const { order_line_id, shipped_qty } = body;

    if (!order_line_id || !shipped_qty) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "order_line_id and shipped_qty are required" } },
        { status: 400 }
      );
    }

    const line = await addShipmentLine(id, { order_line_id, shipped_qty });

    return NextResponse.json({ data: line }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to add line";
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", message } },
      { status: 400 }
    );
  }
}
