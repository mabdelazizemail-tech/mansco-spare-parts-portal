import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { categories } from "@/lib/catalog";
import {
  buildPartSearchResult,
  pickPrice,
  type StockSnapshot,
  type PriceSnapshot,
} from "@/lib/rules/parts-availability";
import { getCampaignDiscounts } from "@/lib/rules/campaign-discount";
import { resolveOptionalDealerId } from "@/lib/auth-guards";

/**
 * GET /api/parts/[partNumber]
 *
 * Optional query param:
 *   qty — requested quantity, drives PARTIALLY_AVAILABLE vs AVAILABLE
 *
 * Returns the full PartSearchResult shape, no-price rule pre-applied.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ partNumber: string }> }
) {
  const { partNumber } = await params;
  try {
    const url = new URL(req.url);
    const qty = Math.max(1, Number(url.searchParams.get("qty")) || 1);

    // Catalog lookup — DB only. Seed via SAP CSV sync.
    const { data, error: catalogError } = await supabaseAdmin
      .from("parts_catalog")
      .select("part_number, name_en, name_ar, category_id, model, oem, image_url")
      .eq("part_number", partNumber)
      .maybeSingle();

    if (catalogError) {
      return NextResponse.json(
        {
          error: {
            code: "CATALOG_UNAVAILABLE",
            message:
              "Parts catalog table is not provisioned. Run the parts_and_sync migration before serving parts.",
            details: catalogError.message,
          },
        },
        { status: 503 }
      );
    }

    if (!data) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: `Part ${partNumber} not found` } },
        { status: 404 }
      );
    }

    const catalogRow = {
      partNumber: data.part_number,
      name: data.name_en,
      nameAr: data.name_ar ?? "",
      category: data.category_id ?? "",
      categoryAr: categories.find((c) => c.id === data.category_id)?.ar ?? "",
      model: data.model ?? "",
      image: data.image_url ?? "/parts/placeholder.jpg",
      oem: data.oem ?? undefined,
    };

    // Stock & price lookups
    let stock: StockSnapshot | null = null;
    let price: PriceSnapshot | null = null;
    try {
      const { data } = await supabaseAdmin
        .from("stock_availability")
        .select("part_number, quantity_available, quantity_atp, source_location, replenishment_eta, last_synced_at")
        .eq("part_number", partNumber)
        .maybeSingle();
      if (data) stock = data as StockSnapshot;
    } catch {
      // tolerate missing table
    }
    try {
      // Fetch ALL price rows for the part (it may have STANDARD + ADMIN_MANUAL)
      // and resolve to the winning tag. maybeSingle() would error on >1 row.
      const { data } = await supabaseAdmin
        .from("price_list_items")
        .select("part_number, unit_price, currency, price_list_id")
        .eq("part_number", partNumber);
      price = pickPrice(data as PriceSnapshot[] | null);
    } catch {
      // tolerate
    }

    const dealerId = await resolveOptionalDealerId();
    const discountMap = await getCampaignDiscounts(dealerId, [partNumber]);

    const result = buildPartSearchResult({
      catalog: catalogRow,
      stock,
      price,
      requestedQty: qty,
      discountCandidates: discountMap.get(partNumber) ?? null,
    });

    return NextResponse.json({ data: result });
  } catch (e) {
    return NextResponse.json(
      { error: { code: "SERVER_ERROR", message: e instanceof Error ? e.message : "Unexpected error" } },
      { status: 500 }
    );
  }
}
