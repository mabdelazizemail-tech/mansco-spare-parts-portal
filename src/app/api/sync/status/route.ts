import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-guards";
import { supabaseAdmin } from "@/lib/supabase/admin";

/**
 * GET /api/sync/status — freshness of each SAP-synced data feed.
 *
 * Returns the most recent last_synced_at per feed and a `stale` flag computed
 * against SAP_SYNC_STALE_THRESHOLD_MINUTES (default 60). Powers the stale-data
 * warning badge on the admin sync page.
 */
const FEEDS: { key: string; table: string }[] = [
  { key: "stock", table: "stock_availability" },
  { key: "pricing", table: "price_list_items" },
  { key: "parts_catalog", table: "parts_catalog" },
];

export async function GET() {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  const thresholdMin = Number(process.env.SAP_SYNC_STALE_THRESHOLD_MINUTES) || 60;
  const thresholdMs = thresholdMin * 60 * 1000;
  const now = Date.now();

  try {
    const feeds = await Promise.all(
      FEEDS.map(async ({ key, table }) => {
        const { data } = await supabaseAdmin
          .from(table)
          .select("last_synced_at")
          .order("last_synced_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        const lastSynced = data?.last_synced_at ?? null;
        const ageMs = lastSynced ? now - new Date(lastSynced).getTime() : null;
        return {
          feed: key,
          last_synced_at: lastSynced,
          age_minutes: ageMs === null ? null : Math.round(ageMs / 60000),
          stale: ageMs === null ? true : ageMs > thresholdMs,
        };
      })
    );

    return NextResponse.json({
      data: {
        threshold_minutes: thresholdMin,
        any_stale: feeds.some((f) => f.stale),
        feeds,
      },
    });
  } catch (e) {
    return NextResponse.json(
      { error: { code: "SERVER_ERROR", message: e instanceof Error ? e.message : "Failed to read sync status" } },
      { status: 500 }
    );
  }
}
