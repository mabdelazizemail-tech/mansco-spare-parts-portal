import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { validatePartRow } from "@/lib/csv/parts-schemas";
import { ADMIN_MANUAL_PRICE_LIST_ID } from "@/lib/rules/parts-availability";

/**
 * POST /api/parts/bulk-upload
 *
 * Admin-only. Accepts a JSON body { items: PartUploadInput[] } and upserts
 * each row into the deployed denormalized schema:
 *   - parts_catalog        (PK: part_number)
 *   - price_list_items     (composite PK: part_number, price_list_id)
 *
 * Prices are written under the ADMIN_MANUAL price-list tag so they live in
 * their own row and are never clobbered by a SAP `STANDARD` pricing sync.
 * Display precedence between tags is resolved centrally in
 * `@/lib/rules/parts-availability` (pickPrice / buildPriceMap).
 *
 * NOTE: There is intentionally NO `price_lists` parent table — that table does
 * not exist in this database. The price list is just a text tag on each item.
 *
 * The endpoint re-validates each row server-side using the same Zod schema
 * the client uses — never trust client validation alone.
 */

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
      const now = new Date().toISOString();

      // Pre-check existence (PK is part_number, not an id column) so we can
      // report inserted vs updated counts.
      const { data: existing } = await supabaseAdmin
        .from("parts_catalog")
        .select("part_number")
        .eq("part_number", partNumber)
        .maybeSingle();
      const isUpdate = Boolean(existing);

      // Upsert catalog row (mirrors src/lib/sync/parts-importer.ts).
      const { error: catalogError } = await supabaseAdmin
        .from("parts_catalog")
        .upsert(
          {
            part_number: partNumber,
            name_en: nameEn,
            name_ar: nameAr,
            category_id: category,
            model,
            last_synced_at: now,
          },
          { onConflict: "part_number" },
        );

      if (catalogError) {
        result.failed++;
        result.failures.push({
          row: i + 1,
          part_number: partNumberDisplay,
          errors: [`Catalog write failed: ${catalogError.message}`],
        });
        continue;
      }

      if (isUpdate) result.updated++;
      else result.inserted++;

      // Upsert the price under the ADMIN_MANUAL tag — composite PK keeps it
      // separate from any SAP STANDARD row for the same part.
      const { error: priceError } = await supabaseAdmin
        .from("price_list_items")
        .upsert(
          {
            part_number: partNumber,
            price_list_id: ADMIN_MANUAL_PRICE_LIST_ID,
            unit_price: price,
            currency,
            last_synced_at: now,
          },
          { onConflict: "part_number,price_list_id" },
        );

      if (priceError) {
        // Catalog persisted, but the price did not — surface it so the admin
        // knows to retry, without losing the catalog write.
        result.failures.push({
          row: i + 1,
          part_number: partNumberDisplay,
          errors: [`Catalog saved, but price write failed: ${priceError.message}`],
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
