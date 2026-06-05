export type ActiveCampaignItemRow = { discount_type: string; discount_value: number };

export type ActiveCampaignRow = {
  id: string;
  name: string;
  description: string | null;
  campaign_type: string;
  start_date: string;
  end_date: string;
  target_audience: string;
  cover_image_url?: string | null;
  campaign_items?: ActiveCampaignItemRow[];
};

export type ActiveCampaign = {
  id: string;
  name: string;
  description: string;
  campaignType: string;
  startDate: string;
  endDate: string;
  coverImageUrl: string | null;
  discountLabel: string | null;
  itemCount: number;
};

/** Representative discount label: highest percentage, else highest fixed amount. */
export function discountLabelFromItems(items: ActiveCampaignItemRow[]): string | null {
  const pct = items.filter((i) => i.discount_type === "percentage").map((i) => Number(i.discount_value));
  const fixed = items.filter((i) => i.discount_type === "fixed").map((i) => Number(i.discount_value));
  const maxPct = pct.length ? Math.max(...pct) : null;
  const maxFixed = fixed.length ? Math.max(...fixed) : null;
  if (maxPct !== null) return `${maxPct}%`;
  if (maxFixed !== null) return `${maxFixed} EGP`;
  return null;
}

/** Shape a raw campaign row into the dealer card/banner DTO. */
export function toActiveCampaign(row: ActiveCampaignRow): ActiveCampaign {
  const items = row.campaign_items ?? [];
  return {
    id: row.id,
    name: row.name,
    description: row.description ?? "",
    campaignType: row.campaign_type,
    startDate: row.start_date,
    endDate: row.end_date,
    coverImageUrl: row.cover_image_url ?? null,
    discountLabel: discountLabelFromItems(items),
    itemCount: items.length,
  };
}
