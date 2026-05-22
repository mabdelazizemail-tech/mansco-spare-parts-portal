import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/auth-guards";

/**
 * POST /api/lost-sales — admin-only endpoint to submit a lost sale directly
 *
 * Body:
 *   {
 *     dealer_id: string,
 *     part_number: string,
 *     quantity: number,
 *     reason: string,
 *     customer_name?: string,
 *     estimated_value?: number
 *   }
 */
export async function POST(req: NextRequest) {
  try {
    // Verify admin authentication
    const adminOrError = await requireAdmin();
    if (adminOrError) return adminOrError;

    const body = await req.json();
    const { dealer_id, part_number, quantity, reason, customer_name, estimated_value } = body ?? {};

    // Validate required fields
    if (!dealer_id || !part_number || !quantity || !reason) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "dealer_id, part_number, quantity, and reason are required",
          },
        },
        { status: 400 }
      );
    }

    // Verify dealer exists
    const { data: dealer, error: dealerError } = await supabaseAdmin
      .from("dealers")
      .select("id")
      .eq("id", dealer_id)
      .single();

    if (dealerError || !dealer) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "Dealer not found" } },
        { status: 400 }
      );
    }

    // Verify part exists
    const { data: part, error: partError } = await supabaseAdmin
      .from("parts_catalog")
      .select("part_number")
      .eq("part_number", part_number)
      .single();

    if (partError || !part) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "Part not found" } },
        { status: 400 }
      );
    }

    // Insert lost sale record
    const { data: lostSale, error: lostSaleError } = await supabaseAdmin
      .from("lost_sales")
      .insert({
        dealer_id,
        part_number,
        quantity: Math.max(1, parseInt(quantity) || 1),
        reason,
        customer_name: customer_name || null,
        estimated_value: estimated_value ? parseFloat(estimated_value) : null,
        inquiry_id: null, // Direct submission, not from inquiry
      })
      .select("id, dealer_id, part_number, quantity, reason, customer_name, estimated_value, created_at")
      .single();

    if (lostSaleError) {
      return NextResponse.json(
        {
          error: {
            code: "DB_ERROR",
            message: lostSaleError.message,
          },
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        data: {
          id: lostSale.id,
          dealer_id: lostSale.dealer_id,
          part_number: lostSale.part_number,
          quantity: lostSale.quantity,
          reason: lostSale.reason,
          customer_name: lostSale.customer_name,
          estimated_value: lostSale.estimated_value,
          created_at: lostSale.created_at,
        },
      },
      { status: 201 }
    );
  } catch (e) {
    return NextResponse.json(
      {
        error: {
          code: "SERVER_ERROR",
          message: e instanceof Error ? e.message : "Unexpected error",
        },
      },
      { status: 500 }
    );
  }
}
