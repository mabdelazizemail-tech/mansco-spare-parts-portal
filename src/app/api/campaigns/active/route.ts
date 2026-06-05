import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { requireDealerSession } from "@/lib/auth-guards";
import { dbError } from "@/lib/api-errors";
import { toActiveCampaign, type ActiveCampaignRow } from "@/lib/campaigns/active-mapper";

/**
 * GET /api/campaigns/active — read-only list of ACTIVE campaigns for the portal.
 *
 * - Dealers / sub-dealers: only campaigns targeted to them
 *   (target_audience = 'all' OR their dealer id is in target_dealer_ids).
 * - Admins / super-admins: all active campaigns (preview of the dealer view).
 *
 * Unlike the admin /api/campaigns surface, this endpoint is read-only and
 * dealer-safe, and it never exposes draft/paused/internal campaigns.
 */
export async function GET() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { error: { code: "UNAUTHENTICATED", message: "Sign in required" } },
      { status: 401 }
    );
  }

  const role = user.user_metadata?.role;
  const isAdmin = role === "admin" || role === "super_admin";

  let dealerId: string | null = null;
  if (!isAdmin) {
    const dealerOrError = await requireDealerSession();
    if (dealerOrError instanceof NextResponse) return dealerOrError;
    dealerId = dealerOrError;
  }

  let query = supabaseAdmin
    .from("campaigns")
    .select(
      "id, name, description, campaign_type, status, start_date, end_date, target_audience, target_dealer_ids, cover_image_url, campaign_items(discount_type, discount_value)"
    )
    .eq("status", "active")
    .order("end_date", { ascending: true });

  // Dealers only see campaigns targeted to them.
  if (!isAdmin && dealerId) {
    query = query.or(`target_audience.eq.all,target_dealer_ids.cs.{${dealerId}}`);
  }

  const { data, error } = await query;
  if (error) return dbError(error, "campaigns.active");

  const campaigns = (data ?? []).map((c) => toActiveCampaign(c as ActiveCampaignRow));

  return NextResponse.json({ data: campaigns });
}
