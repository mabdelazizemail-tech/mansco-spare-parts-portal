import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { validatePartRow } from "@/lib/csv/parts-schemas";

/**
 * POST /api/parts/bulk-upload
 *
 * Admin-only. Accepts a JSON body { items: PartUploadInput[] } and upserts
 * each row into parts_catalog. Price/currency is written to a designated
 * "Admin Bulk Upload" price list (created on demand).
 *
 * The endpoint re-validates each row server-side using the same Zod schema
 * the client uses — never trust client validation alone.
 */

const ADMIN_PRICE_LIST_NAME = "Admin Bulk Upload";

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

    // 3. Find or create the "Admin Bulk Upload" price list
    let priceListId: string;
    const { data: existingList } = await supabaseAdmin
      .from("price_lists")
      .select("id")
      .eq("name", ADMIN_PRICE_LIST_NAME)
      .maybeSingle();

    if (existingList) {
      priceListId = existingList.id;
    } else {
      const { data: newList, error: listError } = await supabaseAdmin
        .from("price_lists")
        .insert({
          name: ADMIN_PRICE_LIST_NAME,
          effective_from: new Date().toISOString(),
        })
        .select("id")
        .single();

      if (listError || !newList) {
        return NextResponse.json(
          {
            error: {
              code: "DB_ERROR",
              message: `Failed to create price list: ${listError?.message ?? "unknown"}`,
            },
          },
          { status: 500 },
        );
      }
      priceListId = newList.id;
    }

    // 4. Validate + upsert each row
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

      // Check if part already exists
      const { data: existing } = await supabaseAdmin
        .from("parts_catalog")
        .select("id")
        .eq("part_number", partNumber)
        .maybeSingle();

      let partId: string;

      if (existing) {
        // Update existing
        const { error: updateError } = await supabaseAdmin
          .from("parts_catalog")
          .update({
            name_en: nameEn,
            name_ar: nameAr,
            category_id: category,
            model: model,
            last_synced_at: new Date().toISOString(),
          })
          .eq("id", existing.id);

        if (updateError) {
          result.failed++;
          result.failures.push({
            row: i + 1,
            part_number: partNumberDisplay,
            errors: [`DB update failed: ${updateError.message}`],
          });
          continue;
        }
        partId = existing.id;
        result.updated++;
      } else {
        // Insert new
        const { data: newPart, error: insertError } = await supabaseAdmin
          .from("parts_catalog")
          .insert({
            part_number: partNumber,
            name_en: nameEn,
            name_ar: nameAr,
            category_id: category,
            model: model,
            last_synced_at: new Date().toISOString(),
          })
          .select("id")
          .single();

        if (insertError || !newPart) {
          result.failed++;
          result.failures.push({
            row: i + 1,
            part_number: partNumberDisplay,
            errors: [`DB insert failed: ${insertError?.message ?? "unknown"}`],
          });
          continue;
        }
        partId = newPart.id;
        result.inserted++;
      }

      // Upsert price list item — one row per (priceListId, partId)
      const { data: existingPli } = await supabaseAdmin
        .from("price_list_items")
        .select("id")
        .eq("price_list_id", priceListId)
        .eq("part_id", partId)
        .maybeSingle();

      if (existingPli) {
        await supabaseAdmin
          .from("price_list_items")
          .update({
            part_number: partNumber,
            unit_price: price,
            currency,
            last_synced_at: new Date().toISOString(),
          })
          .eq("id", existingPli.id);
      } else {
        await supabaseAdmin.from("price_list_items").insert({
          price_list_id: priceListId,
          part_id: partId,
          part_number: partNumber,
          unit_price: price,
          currency,
          last_synced_at: new Date().toISOString(),
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
