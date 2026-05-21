import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { categories } from "@/lib/catalog";
import {
  buildPartSearchResult,
  type PartSearchResult,
  type StockSnapshot,
  type PriceSnapshot,
} from "@/lib/rules/parts-availability";

/**
 * GET /api/parts
 *
 * Query params:
 *   q              — text search (part number, name EN/AR, OEM, model)
 *   category       — category id from catalog.ts (e.g. "brakes")
 *   model          — full model name (e.g. "Peugeot 3008")
 *   availability   — one of: AVAILABLE | PARTIALLY_AVAILABLE | NOT_AVAILABLE_WITH_ETA | NOT_AVAILABLE_NO_ETA
 *   priceable_only — "true" to only return parts with displayable prices
 *   limit, offset  — pagination (defaults: 50, 0)
 *
 * Returns:
 *   { data: PartSearchResult[], meta: { total, limit, offset, pages, stale_data_warning? } }
 *
 * The no-price-on-unavailable rule is enforced server-side via
 * `buildPartSearchResult` — clients cannot bypass it by ignoring UI flags.
 */
export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const q = url.searchParams.get("q")?.toLowerCase().trim() ?? "";
    const categoryFilter = url.searchParams.get("category") ?? "";
    const modelFilter = url.searchParams.get("model") ?? "";
    const availabilityFilter = url.searchParams.get("availability") ?? "";
    const priceableOnly = url.searchParams.get("priceable_only") === "true";
    const limit = Math.min(Math.max(Number(url.searchParams.get("limit")) || 50, 1), 200);
    const offset = Math.max(Number(url.searchParams.get("offset")) || 0, 0);

    // 1. Catalog source — the `parts_catalog` table is the single source
    //    of truth. Seed via SAP CSV sync (/dashboard/admin/sync).
    const { data: catalogData, error: catalogError } = await supabaseAdmin
      .from("parts_catalog")
      .select("part_number, name_en, name_ar, category_id, model, oem, image_url");

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

    const catalogRows = (catalogData ?? []).map((r) => ({
      partNumber: r.part_number,
      name: r.name_en,
      nameAr: r.name_ar ?? "",
      category: r.category_id ?? "",
      categoryAr: categories.find((c) => c.id === r.category_id)?.ar ?? "",
      model: r.model ?? "",
      image: r.image_url ?? "/parts/placeholder.jpg",
      oem: r.oem ?? undefined,
    }));

    // 2. Stock snapshot — best-effort fetch; missing rows = NOT_AVAILABLE_NO_ETA
    let stockMap = new Map<string, StockSnapshot>();
    try {
      const { data: stockRows } = await supabaseAdmin
        .from("stock_availability")
        .select("part_number, quantity_available, quantity_atp, source_location, replenishment_eta, last_synced_at");
      if (stockRows) {
        stockMap = new Map(stockRows.map((s) => [s.part_number, s as StockSnapshot]));
      }
    } catch {
      // stock table not seeded yet — proceed with empty map
    }

    // 3. Price snapshot — best-effort fetch
    let priceMap = new Map<string, PriceSnapshot>();
    try {
      const { data: priceRows } = await supabaseAdmin
        .from("price_list_items")
        .select("part_number, unit_price, currency, price_list_id");
      if (priceRows) {
        priceMap = new Map(priceRows.map((p) => [p.part_number, p as PriceSnapshot]));
      }
    } catch {
      // price table not seeded yet
    }

    // 4. Build search results applying the no-price rule
    let results: PartSearchResult[] = catalogRows.map((part) =>
      buildPartSearchResult({
        catalog: part,
        stock: stockMap.get(part.partNumber) ?? null,
        price: priceMap.get(part.partNumber) ?? null,
      })
    );

    // 5. Apply filters
    if (q) {
      results = results.filter(
        (r) =>
          r.part_number.toLowerCase().includes(q) ||
          r.name.toLowerCase().includes(q) ||
          (r.name_ar && r.name_ar.includes(q)) ||
          (r.oem && r.oem.toLowerCase().includes(q)) ||
          r.model.toLowerCase().includes(q)
      );
    }
    if (categoryFilter && categoryFilter !== "all") {
      results = results.filter((r) => r.category === categoryFilter);
    }
    if (modelFilter && modelFilter !== "all") {
      results = results.filter((r) => r.model === modelFilter);
    }
    if (availabilityFilter && availabilityFilter !== "all") {
      results = results.filter((r) => r.availability_state === availabilityFilter);
    }
    if (priceableOnly) {
      results = results.filter((r) => r.unit_price !== null);
    }

    // 6. Stale-data warning
    const STALE_MIN = Number(process.env.SAP_SYNC_STALE_THRESHOLD_MINUTES ?? 60);
    let oldestSync: number | null = null;
    for (const r of results) {
      if (!r.stock_last_synced_at) continue;
      const t = new Date(r.stock_last_synced_at).getTime();
      if (oldestSync === null || t < oldestSync) oldestSync = t;
    }
    const ageMinutes = oldestSync ? (Date.now() - oldestSync) / 60000 : null;
    const stale = ageMinutes !== null && ageMinutes > STALE_MIN;

    const total = results.length;
    const paged = results.slice(offset, offset + limit);

    return NextResponse.json({
      data: paged,
      meta: {
        total,
        limit,
        offset,
        pages: Math.ceil(total / limit),
        ...(stale ? { stale_data_warning: `Stock data is ${Math.round(ageMinutes!)}min old (threshold ${STALE_MIN}min)` } : {}),
      },
    });
  } catch (e) {
    return NextResponse.json(
      { error: { code: "SERVER_ERROR", message: e instanceof Error ? e.message : "Unexpected error" } },
      { status: 500 }
    );
  }
}
