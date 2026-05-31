import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { categories } from "@/lib/catalog";
import {
  buildPartSearchResult,
  buildPriceMap,
  type StockSnapshot,
  type PriceSnapshot,
} from "@/lib/rules/parts-availability";
import { getCampaignDiscounts } from "@/lib/rules/campaign-discount";
import { resolveOptionalDealerId } from "@/lib/auth-guards";

/**
 * POST /api/parts/bulk-lookup
 *
 * Body: { items: [{ part_number, quantity }] }
 *
 * Returns full PartSearchResult per part, with the no-price-on-unavailable
 * rule already applied via buildPartSearchResult. Used by the dealer's
 * order CSV upload preview.
 *
 * Caps the request at 200 part numbers to protect the catalog query.
 */

type LookupItem = { part_number: string; quantity: number };

const MAX_ITEMS = 200;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const items: LookupItem[] = body?.items ?? [];

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "items[] is required" } },
        { status: 400 },
      );
    }

    if (items.length > MAX_ITEMS) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: `Maximum ${MAX_ITEMS} part numbers per lookup` } },
        { status: 400 },
      );
    }

    const partNumbers = Array.from(
      new Set(
        items
          .map((i) => i.part_number?.toString().trim())
          .filter((p): p is string => Boolean(p)),
      ),
    );

    if (partNumbers.length === 0) {
      return NextResponse.json({ data: [] });
    }

    // 1. Catalog rows
    const { data: catalogRows, error: catalogError } = await supabaseAdmin
      .from("parts_catalog")
      .select("part_number, name_en, name_ar, category_id, model, oem, image_url")
      .in("part_number", partNumbers);

    if (catalogError) {
      return NextResponse.json(
        { error: { code: "CATALOG_UNAVAILABLE", message: "Parts catalog unavailable" } },
        { status: 503 },
      );
    }

    const catalogMap = new Map(
      (catalogRows ?? []).map((r) => [
        r.part_number,
        {
          partNumber: r.part_number,
          name: r.name_en,
          nameAr: r.name_ar ?? "",
          category: r.category_id ?? "",
          categoryAr: categories.find((c) => c.id === r.category_id)?.ar ?? "",
          model: r.model ?? "",
          image: r.image_url ?? "/parts/placeholder.jpg",
          oem: r.oem ?? undefined,
        },
      ]),
    );

    // 2. Stock rows (best-effort — table may be missing)
    let stockMap = new Map<string, StockSnapshot>();
    try {
      const { data } = await supabaseAdmin
        .from("stock_availability")
        .select(
          "part_number, quantity_available, quantity_atp, source_location, replenishment_eta, last_synced_at",
        )
        .in("part_number", partNumbers);
      if (data) {
        stockMap = new Map(data.map((r) => [r.part_number, r as StockSnapshot]));
      }
    } catch {
      // tolerate
    }

    // 3. Price rows (best-effort)
    let priceMap = new Map<string, PriceSnapshot>();
    try {
      const { data } = await supabaseAdmin
        .from("price_list_items")
        .select("part_number, unit_price, currency, price_list_id")
        .in("part_number", partNumbers);
      if (data) {
        priceMap = buildPriceMap(data as PriceSnapshot[]);
      }
    } catch {
      // tolerate
    }

    // Discount candidates — best-effort (no dealer = no discounts)
    const dealerId = await resolveOptionalDealerId();
    const discountMap = await getCampaignDiscounts(dealerId, partNumbers);

    // 4. Build PartSearchResult per requested item, preserving requested qty
    const results = items.map((item) => {
      const partNum = item.part_number?.toString().trim();
      const catalog = partNum ? catalogMap.get(partNum) : undefined;

      if (!catalog) {
        return {
          part_number: partNum ?? "",
          requested_quantity: item.quantity,
          found: false,
          error: `Part ${partNum} not found in catalog`,
        };
      }

      const result = buildPartSearchResult({
        catalog,
        stock: stockMap.get(partNum!) ?? null,
        price: priceMap.get(partNum!) ?? null,
        requestedQty: Math.max(1, Number(item.quantity) || 1),
        discountCandidates: discountMap.get(partNum!) ?? null,
      });

      return {
        part_number: partNum,
        requested_quantity: item.quantity,
        found: true,
        result,
      };
    });

    return NextResponse.json({ data: results });
  } catch (e) {
    return NextResponse.json(
      {
        error: {
          code: "SERVER_ERROR",
          message: e instanceof Error ? e.message : "Unexpected error",
        },
      },
      { status: 500 },
    );
  }
}
