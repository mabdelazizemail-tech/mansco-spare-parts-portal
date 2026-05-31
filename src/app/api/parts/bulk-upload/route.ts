import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { validatePartRow } from "@/lib/csv/parts-schemas";

/**
 * POST /api/parts/bulk-upload
 *
 * Admin-only. Accepts a JSON body { items: PartUploadInput[] } and upserts
 * each row into parts_catalog. Price/currency is written to price_list_items
 * under a dedicated "ADMIN_BULK" price list id.
 *
 * NOTE: this matches the actual database shape used by the SAP CSV importer
 * (src/lib/sync/parts-importer.ts): parts_catalog is keyed by `part_number`
 * (no uuid id column) and price_list_items is keyed by
 * (part_number, price_list_id) where price_list_id is plain text. There is no
 * separate `price_lists` table.
 *
 * The endpoint re-validates each row server-side using the same Zod schema
 * the client uses — never trust client validation alone.
 */

// Text price-list id (price_list_items.price_list_id is text, same convention
// the SAP importer uses for its price lists, e.g. "STANDARD").
const ADMIN_PRICE_LIST_ID = "ADMIN_BULK";

type PartUploadInput = {
  "Part Number": string;
  "Name (EN)": string;
  "Name (AR)"?: string;
  Category?: string;
  Model?: string;
  Price: number | string;
  Currency?: string;
};

type UploadResult = {
  inserted: number;
  updated: number;
  failed: number;
  failures: { row: number; part_number: string; errors: string[] }[];
};

export async function POST(req: NextRequest) {
  try {
    // 1. Auth — admin only
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: { code: "UNAUTHENTICATED", message: "Sign in required" } },
        { status: 401 },
      );
    }

    const role = user.user_metadata?.role;
    if (role !== "admin" && role !== "super_admin") {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Admin access required" } },
        { status: 403 },
      );
    }

    // 2. Parse body
    const body = await req.json();
    const items: PartUploadInput[] = body?.items ?? [];

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "items[] is required and must be non-empty" } },
        { status: 400 },
      );
    }

    if (items.length > 5000) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "Maximum 5000 rows per upload" } },
        { status: 400 },
      );
    }

    // 3. Validate + upsert each row
    const result: UploadResult = { inserted: 0, updated: 0, failed: 0, failures: [] };

    for (let i = 0; i < items.length; i++) {
      const raw = items[i] as Record<string, unknown>;
      const partNumberDisplay = (raw["Part Number"] ?? "").toString().trim() || `(row ${i + 1})`;

      const validation = validatePartRow(raw);
      if (!validation.valid) {
        result.failed++;
        result.failures.push({ row: i + 1, part_number: partNumberDisplay, errors: validation.errors });
        continue;
      }

      const partNumber = (raw["Part Number"] as string).trim();
      const nameEn = (raw["Name (EN)"] as string).trim();
      const nameAr = raw["Name (AR)"] ? String(raw["Name (AR)"]).trim() : null;
      const category = raw["Category"] ? String(raw["Category"]).trim() : null;
      const model = raw["Model"] ? String(raw["Model"]).trim() : null;
      const price = Number(raw["Price"]);
      const currency = (raw["Currency"] ? String(raw["Currency"]).trim() : "EGP").toUpperCase();

      // Determine insert vs update (parts_catalog is keyed by part_number).
      const { data: existing } = await supabaseAdmin
        .from("parts_catalog")
        .select("part_number")
        .eq("part_number", partNumber)
        .maybeSingle();

      const { error: upsertError } = await supabaseAdmin
        .from("parts_catalog")
        .upsert(
          {
            part_number: partNumber,
            name_en: nameEn,
            name_ar: nameAr,
            category_id: category,
            model: model,
            last_synced_at: new Date().toISOString(),
          },
          { onConflict: "part_number" },
        );

      if (upsertError) {
        result.failed++;
        result.failures.push({
          row: i + 1,
          part_number: partNumberDisplay,
          errors: [`DB write failed: ${upsertError.message}`],
        });
        continue;
      }

      if (existing) result.updated++;
      else result.inserted++;

      // Upsert the price into the ADMIN_BULK price list
      // (price_list_items is keyed by part_number + price_list_id).
      const { error: priceError } = await supabaseAdmin
        .from("price_list_items")
        .upsert(
          {
            part_number: partNumber,
            price_list_id: ADMIN_PRICE_LIST_ID,
            unit_price: price,
            currency,
            last_synced_at: new Date().toISOString(),
          },
          { onConflict: "part_number,price_list_id" },
        );

      if (priceError) {
        // Part saved successfully; surface the pricing issue without failing
        // the whole row.
        result.failures.push({
          row: i + 1,
          part_number: partNumberDisplay,
          errors: [`Saved, but price not written: ${priceError.message}`],
        });
      }
    }

    return NextResponse.json({ data: result }, { status: 200 });
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
