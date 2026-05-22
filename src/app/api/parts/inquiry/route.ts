import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { requireDealerSession } from "@/lib/auth-guards";
import {
  buildPartSearchResult,
  type StockSnapshot,
  type PriceSnapshot,
} from "@/lib/rules/parts-availability";
import { categories } from "@/lib/catalog";

/**
 * POST /api/parts/inquiry
 *
 * Body:
 *   { dealer_id, part_number, quantity, inquiry_type?: "search" | "order_attempt" }
 *
 * Behaviour:
 *   - Always logs an `inquiries` row (search analytics / demand signal).
 *   - If the part is unavailable or only partially available given the
 *     requested qty, ALSO logs a `lost_sales` row with the reason
 *     (out_of_stock / no_eta / partial). This feeds the lost-sales report
 *     that MANSCO uses for demand planning.
 *
 * The response includes the post-rule availability snapshot so the UI can
 * show the dealer why their inquiry was logged.
 */
export async function POST(req: NextRequest) {
  try {
    // Verify dealer authentication
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: { code: "UNAUTHENTICATED", message: "Sign in required" } },
        { status: 401 }
      );
    }

    const userRole = user.user_metadata?.role;
    if (userRole !== "dealer" && userRole !== "sub_dealer") {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Dealer access required" } },
        { status: 403 }
      );
    }

    // Get authenticated dealer ID
    const authenticatedDealerIdOrError = await requireDealerSession();
    if (authenticatedDealerIdOrError instanceof NextResponse) {
      return authenticatedDealerIdOrError;
    }

    const body = await req.json();
    const { dealer_id, part_number, quantity, inquiry_type } = body ?? {};

    if (!dealer_id || !part_number) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "dealer_id and part_number are required" } },
        { status: 400 }
      );
    }

    // Verify dealer can only submit inquiries for themselves
    if (authenticatedDealerIdOrError !== dealer_id) {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Cannot submit inquiry for another dealer" } },
        { status: 403 }
      );
    }
    const qty = Math.max(1, Number(quantity) || 1);
    const type = (inquiry_type as string) || "search";

    // Resolve current state (no-price rule applied)
    let stock: StockSnapshot | null = null;
    let price: PriceSnapshot | null = null;
    try {
      const { data } = await supabaseAdmin
        .from("stock_availability")
        .select("part_number, quantity_available, quantity_atp, source_location, replenishment_eta, last_synced_at")
        .eq("part_number", part_number)
        .maybeSingle();
      if (data) stock = data as StockSnapshot;
    } catch {}
    try {
      const { data } = await supabaseAdmin
        .from("price_list_items")
        .select("part_number, unit_price, currency, price_list_id")
        .eq("part_number", part_number)
        .maybeSingle();
      if (data) price = data as PriceSnapshot;
    } catch {}

    const { data: catalogData, error: catalogError } = await supabaseAdmin
      .from("parts_catalog")
      .select("part_number, name_en, name_ar, category_id, model, oem, image_url")
      .eq("part_number", part_number)
      .maybeSingle();

    if (catalogError) {
      return NextResponse.json(
        {
          error: {
            code: "CATALOG_UNAVAILABLE",
            message: "Parts catalog table is not provisioned.",
            details: catalogError.message,
          },
        },
        { status: 503 }
      );
    }
    if (!catalogData) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: `Part ${part_number} not found in catalog` } },
        { status: 404 }
      );
    }

    const catalogRow = {
      partNumber: catalogData.part_number,
      name: catalogData.name_en,
      nameAr: catalogData.name_ar ?? "",
      category: catalogData.category_id ?? "",
      categoryAr: categories.find((c) => c.id === catalogData.category_id)?.ar ?? "",
      model: catalogData.model ?? "",
      image: catalogData.image_url ?? "/parts/placeholder.jpg",
      oem: catalogData.oem ?? undefined,
    };

    const snapshot = buildPartSearchResult({
      catalog: catalogRow,
      stock,
      price,
      requestedQty: qty,
    });

    // 1. Always record the inquiry
    let inquiryId: string | null = null;
    try {
      const { data, error } = await supabaseAdmin
        .from("inquiries")
        .insert({
          dealer_id,
          part_number,
          quantity: qty,
          inquiry_type: type,
          availability_at_inquiry: snapshot.availability_state,
        })
        .select("id")
        .single();
      if (!error && data) inquiryId = data.id as string;
    } catch {
      // Non-fatal; we still want the response to succeed even if logging fails
    }

    // 2. Log a lost sale if applicable
    let lostSaleId: string | null = null;
    let lostSaleReason: string | null = null;
    switch (snapshot.availability_state) {
      case "PARTIALLY_AVAILABLE":
        lostSaleReason = "partial_stock";
        break;
      case "NOT_AVAILABLE_WITH_ETA":
        lostSaleReason = "out_of_stock";
        break;
      case "NOT_AVAILABLE_NO_ETA":
        lostSaleReason = "no_eta";
        break;
    }
    if (lostSaleReason) {
      try {
        const { data, error } = await supabaseAdmin
          .from("lost_sales")
          .insert({
            inquiry_id: inquiryId,
            dealer_id,
            part_number,
            quantity: qty,
            reason: lostSaleReason,
            eta_if_available: snapshot.replenishment_eta,
          })
          .select("id")
          .single();
        if (!error && data) lostSaleId = data.id as string;
      } catch {}
    }

    return NextResponse.json(
      {
        data: {
          inquiry_id: inquiryId,
          lost_sale_id: lostSaleId,
          lost_sale_reason: lostSaleReason,
          part: snapshot,
        },
      },
      { status: 201 }
    );
  } catch (e) {
    return NextResponse.json(
      { error: { code: "SERVER_ERROR", message: e instanceof Error ? e.message : "Unexpected error" } },
      { status: 500 }
    );
  }
}
