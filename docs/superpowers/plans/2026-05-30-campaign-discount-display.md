# Campaign Discount Display Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the silently-broken campaign discount engine (camelCase columns vs snake_case tables) and surface discounts to the dealer across the ordering flow — parts search, bulk-upload preview, cart, and order summary — using a single shared resolver + math helper so what the dealer sees equals what submission charges.

**Architecture:** Rebuilt resolver in `src/lib/rules/campaign-discount.ts` exports pure helpers (`applyDiscount`, `filterEligibleCampaignItems`, `pickWinningRule`) and one batched DB function (`getCampaignDiscounts`) that the lookup APIs and the orders POST both call. Discount fields are threaded through `PartSearchResult` → cart snapshot → cart selectors → UI. No new endpoints, no new DB columns, no admin-side changes.

**Tech Stack:** Next.js 16 App Router, Supabase JS client + PostgREST, TypeScript, Vitest, React. Branch: `feature/p4-campaign-discount-display`.

**Spec:** `docs/superpowers/specs/2026-05-29-campaign-discount-display-design.md`

---

## Task 1: Rebuild discount resolver — pure helpers (TDD)

Replace the broken camelCase functions with three small pure helpers, alongside the old code for now. Old exports stay until Task 11 (the orders route still imports them).

**Files:**
- Modify: `src/lib/rules/campaign-discount.ts`
- Create: `tests/unit/campaign-discount.test.ts`

- [ ] **Step 1: Write failing tests for `applyDiscount`**

Create `tests/unit/campaign-discount.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import {
  applyDiscount,
  filterEligibleCampaignItems,
  pickWinningRule,
  type CampaignRule,
  type CampaignItemRow,
} from "@/lib/rules/campaign-discount";

describe("applyDiscount", () => {
  it("returns null for null/undefined rule", () => {
    expect(applyDiscount(100, null)).toBeNull();
    expect(applyDiscount(100, undefined)).toBeNull();
  });

  it("returns null when unit price is zero or negative", () => {
    const rule: CampaignRule = { campaignId: "c1", discountType: "percentage", discountValue: 10 };
    expect(applyDiscount(0, rule)).toBeNull();
    expect(applyDiscount(-5, rule)).toBeNull();
  });

  it("applies a percentage discount and rounds to 2 dp", () => {
    const rule: CampaignRule = { campaignId: "c1", discountType: "percentage", discountValue: 10 };
    const r = applyDiscount(1250, rule)!;
    expect(r.discountedUnitPrice).toBe(1125);
    expect(r.lineDiscountPerUnit).toBe(125);
    expect(r.discountPct).toBe(10);
  });

  it("applies a fixed discount", () => {
    const rule: CampaignRule = { campaignId: "c1", discountType: "fixed", discountValue: 50 };
    const r = applyDiscount(200, rule)!;
    expect(r.discountedUnitPrice).toBe(150);
    expect(r.lineDiscountPerUnit).toBe(50);
    expect(r.discountPct).toBe(25);
  });

  it("clamps fixed discount at zero (never negative)", () => {
    const rule: CampaignRule = { campaignId: "c1", discountType: "fixed", discountValue: 999 };
    const r = applyDiscount(100, rule)!;
    expect(r.discountedUnitPrice).toBe(0);
    expect(r.lineDiscountPerUnit).toBe(100);
    expect(r.discountPct).toBe(100);
  });

  it("returns null when rule yields no actual discount", () => {
    const zero: CampaignRule = { campaignId: "c1", discountType: "percentage", discountValue: 0 };
    expect(applyDiscount(100, zero)).toBeNull();
    const negative: CampaignRule = { campaignId: "c1", discountType: "fixed", discountValue: -10 };
    expect(applyDiscount(100, negative)).toBeNull();
  });
});

const camp = (over: Partial<CampaignItemRow["campaign"]> = {}): CampaignItemRow["campaign"] => ({
  status: "active",
  start_date: null,
  end_date: null,
  target_audience: "all",
  target_dealer_ids: null,
  ...over,
});

const row = (over: Partial<CampaignItemRow> = {}): CampaignItemRow => ({
  campaign_id: "c1",
  discount_type: "percentage",
  discount_value: 10,
  campaign: camp(),
  ...over,
});

describe("filterEligibleCampaignItems", () => {
  const NOW = new Date("2026-06-01T00:00:00Z");

  it("keeps active campaigns targeting 'all'", () => {
    expect(filterEligibleCampaignItems([row()], "dealer-A", NOW)).toHaveLength(1);
  });

  it("drops campaigns whose status is not 'active'", () => {
    expect(
      filterEligibleCampaignItems([row({ campaign: camp({ status: "completed" }) })], "dealer-A", NOW),
    ).toHaveLength(0);
  });

  it("drops campaigns before their start_date", () => {
    expect(
      filterEligibleCampaignItems([row({ campaign: camp({ start_date: "2026-07-01" }) })], "dealer-A", NOW),
    ).toHaveLength(0);
  });

  it("drops campaigns after their end_date", () => {
    expect(
      filterEligibleCampaignItems([row({ campaign: camp({ end_date: "2026-05-15" }) })], "dealer-A", NOW),
    ).toHaveLength(0);
  });

  it("targets specific dealers only when target_audience != 'all'", () => {
    const r = row({ campaign: camp({ target_audience: "selected", target_dealer_ids: ["dealer-B"] }) });
    expect(filterEligibleCampaignItems([r], "dealer-A", NOW)).toHaveLength(0);
    expect(filterEligibleCampaignItems([r], "dealer-B", NOW)).toHaveLength(1);
  });

  it("drops rows without a joined campaign object", () => {
    const r = { ...row() };
    // @ts-expect-error — modeling defensive nullability
    r.campaign = null;
    expect(filterEligibleCampaignItems([r], "dealer-A", NOW)).toHaveLength(0);
  });
});

describe("pickWinningRule", () => {
  it("returns null for empty / nullish input", () => {
    expect(pickWinningRule([], 100)).toBeNull();
    expect(pickWinningRule(null, 100)).toBeNull();
    expect(pickWinningRule(undefined, 100)).toBeNull();
  });

  it("returns null when unit price is zero or negative", () => {
    expect(pickWinningRule([row()], 0)).toBeNull();
  });

  it("returns a rule when one candidate matches", () => {
    const r = pickWinningRule([row({ discount_value: 10 })], 100);
    expect(r).toEqual({ campaignId: "c1", discountType: "percentage", discountValue: 10 });
  });

  it("picks the rule yielding the lowest discounted unit price", () => {
    const low = row({ campaign_id: "low", discount_value: 5 }); // -5% => 95
    const high = row({ campaign_id: "high", discount_value: 20 }); // -20% => 80
    expect(pickWinningRule([low, high], 100)?.campaignId).toBe("high");
    expect(pickWinningRule([high, low], 100)?.campaignId).toBe("high");
  });

  it("compares percentage vs fixed by absolute discounted price", () => {
    // unit 200: 10% off => 180; fixed 50 off => 150 (fixed wins)
    const pct = row({ campaign_id: "pct", discount_type: "percentage", discount_value: 10 });
    const fxd = row({ campaign_id: "fxd", discount_type: "fixed", discount_value: 50 });
    expect(pickWinningRule([pct, fxd], 200)?.campaignId).toBe("fxd");
  });

  it("ignores candidates that yield no actual discount", () => {
    const zero = row({ campaign_id: "zero", discount_value: 0 });
    expect(pickWinningRule([zero], 100)).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- campaign-discount`
Expected: FAIL — `applyDiscount`/`filterEligibleCampaignItems`/`pickWinningRule` not exported.

- [ ] **Step 3: Implement the pure helpers in `campaign-discount.ts`**

Open `src/lib/rules/campaign-discount.ts` and **add** the following block above the existing `checkCampaignDiscount` (do NOT remove the old code yet — it's still imported by `/api/orders` until Task 11):

```ts
// ─────────────────────────────────────────────────────────────────────────────
// New shared resolver — see docs/superpowers/specs/2026-05-29-campaign-discount-display-design.md
//
// `applyDiscount`, `filterEligibleCampaignItems`, `pickWinningRule` are pure
// helpers, shared by the display path (parts lookups + cart) and the charge
// path (POST /api/orders) so what the dealer sees == what submission charges.
// `getCampaignDiscounts` is the batched DB query (correct snake_case schema).
// ─────────────────────────────────────────────────────────────────────────────

export type DiscountType = "percentage" | "fixed";

export interface CampaignRule {
  campaignId: string;
  discountType: DiscountType;
  discountValue: number;
}

export interface CampaignItemRow {
  campaign_id: string;
  discount_type: DiscountType;
  discount_value: number;
  campaign: {
    status: string;
    start_date: string | null;
    end_date: string | null;
    target_audience: string;
    target_dealer_ids: string[] | null;
  };
}

export interface AppliedDiscount {
  discountedUnitPrice: number;
  discountPct: number;
  lineDiscountPerUnit: number;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Apply a campaign rule to a unit price. Returns null when the rule yields
 * no actual discount (zero/negative value, discounted price >= original).
 */
export function applyDiscount(
  unitPrice: number,
  rule: CampaignRule | null | undefined,
): AppliedDiscount | null {
  if (!rule || unitPrice <= 0) return null;
  if (rule.discountValue <= 0) return null;
  let discounted: number;
  if (rule.discountType === "percentage") {
    discounted = unitPrice * (1 - rule.discountValue / 100);
  } else {
    discounted = Math.max(0, unitPrice - rule.discountValue);
  }
  discounted = round2(discounted);
  if (discounted >= unitPrice) return null;
  const lineDiscountPerUnit = round2(unitPrice - discounted);
  const discountPct = round2((lineDiscountPerUnit / unitPrice) * 100);
  return { discountedUnitPrice: discounted, discountPct, lineDiscountPerUnit };
}

/**
 * Keep only campaign_item rows whose joined campaign is currently active and
 * targets this dealer. Quantity is intentionally NOT checked
 * (min_order_quantity is ignored per design decision D2).
 */
export function filterEligibleCampaignItems(
  rows: CampaignItemRow[],
  dealerId: string,
  now: Date = new Date(),
): CampaignItemRow[] {
  return rows.filter((r) => {
    const c = r.campaign;
    if (!c) return false;
    if (c.status !== "active") return false;
    if (c.start_date && new Date(c.start_date) > now) return false;
    if (c.end_date && new Date(c.end_date) < now) return false;
    const ids = c.target_dealer_ids ?? [];
    return c.target_audience === "all" || ids.includes(dealerId);
  });
}

/**
 * From a list of candidate rules for ONE part, pick the rule yielding the
 * lowest discounted unit price. Returns null if no candidate discounts.
 */
export function pickWinningRule(
  candidates: CampaignItemRow[] | null | undefined,
  unitPrice: number,
): CampaignRule | null {
  if (!candidates || candidates.length === 0 || unitPrice <= 0) return null;
  let best: CampaignRule | null = null;
  let bestDiscounted = unitPrice;
  for (const row of candidates) {
    const rule: CampaignRule = {
      campaignId: row.campaign_id,
      discountType: row.discount_type,
      discountValue: Number(row.discount_value),
    };
    const applied = applyDiscount(unitPrice, rule);
    if (applied && applied.discountedUnitPrice < bestDiscounted) {
      bestDiscounted = applied.discountedUnitPrice;
      best = rule;
    }
  }
  return best;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- campaign-discount`
Expected: PASS — all `applyDiscount`/`filterEligibleCampaignItems`/`pickWinningRule` tests green.

- [ ] **Step 5: Commit**

```
git add src/lib/rules/campaign-discount.ts tests/unit/campaign-discount.test.ts
git commit -m "refactor(rules): add pure discount helpers (applyDiscount, eligibility, pickWinningRule)"
```

---

## Task 2: Add the batched `getCampaignDiscounts` query

Add the one async function that queries `campaign_items` using the correct snake_case schema confirmed against the live DB.

**Files:**
- Modify: `src/lib/rules/campaign-discount.ts`

- [ ] **Step 1: Append `getCampaignDiscounts` to `campaign-discount.ts`**

Add this at the bottom of the file (after `pickWinningRule`):

```ts
import { supabaseAdmin } from "@/lib/supabase/admin";

/**
 * Batched campaign-discount lookup. ONE query for all part numbers.
 *
 * Returns `Map<part_number, eligible CampaignItemRow[]>`. The caller picks
 * the winning rule via `pickWinningRule(candidates, unitPrice)` once the
 * part's actual unit price is known.
 *
 * Schema is snake_case per the live `campaign_items` / `campaigns` tables.
 * Without a dealer (admin or unauthenticated context) the map is empty.
 * A query failure logs and returns empty — never throws into the price path.
 */
export async function getCampaignDiscounts(
  dealerId: string | null,
  partNumbers: string[],
): Promise<Map<string, CampaignItemRow[]>> {
  const result = new Map<string, CampaignItemRow[]>();
  if (!dealerId || partNumbers.length === 0) return result;

  const { data, error } = await supabaseAdmin
    .from("campaign_items")
    .select(
      `
      part_number,
      campaign_id,
      discount_type,
      discount_value,
      campaign:campaigns!inner (
        status,
        start_date,
        end_date,
        target_audience,
        target_dealer_ids
      )
      `,
    )
    .in("part_number", partNumbers);

  if (error) {
    console.error("getCampaignDiscounts query failed:", error.message);
    return result;
  }

  const now = new Date();
  type RawRow = CampaignItemRow & { part_number: string };
  for (const raw of (data ?? []) as unknown as RawRow[]) {
    const eligible = filterEligibleCampaignItems([raw], dealerId, now);
    if (eligible.length === 0) continue;
    const arr = result.get(raw.part_number);
    if (arr) arr.push(raw);
    else result.set(raw.part_number, [raw]);
  }
  return result;
}
```

Note: if `supabaseAdmin` is already imported elsewhere in the file, do not re-import. (Current file imports it on line 1; keep the single import.)

- [ ] **Step 2: Move the existing `supabaseAdmin` import to the top deduplicate**

If the import added above duplicates the existing one on line 1, delete the duplicate. The file should have exactly one `import { supabaseAdmin } from "@/lib/supabase/admin";` at the top.

- [ ] **Step 3: Type-check the file**

Run: `npx tsc --noEmit 2>&1 | Select-String "campaign-discount"`
Expected: no output (no errors in this file). Pre-existing errors elsewhere are not in scope.

- [ ] **Step 4: Commit**

```
git add src/lib/rules/campaign-discount.ts
git commit -m "feat(rules): add batched getCampaignDiscounts resolver (snake_case schema)"
```

---

## Task 3: Extend `PartSearchResult` to carry discount

Add discount fields to the part result type and let the builder pick the winning rule and apply it through the no-price rule.

**Files:**
- Modify: `src/lib/rules/parts-availability.ts`
- Modify: `tests/unit/price-resolution.test.ts` (only if it references `buildPartSearchResult` — it doesn't, so likely no change)

- [ ] **Step 1: Add discount fields to the type and builder**

In `src/lib/rules/parts-availability.ts`:

a) Add imports at the top (alongside existing imports):

```ts
import {
  pickWinningRule,
  applyDiscount,
  type CampaignItemRow,
} from "@/lib/rules/campaign-discount";
```

b) Extend `PartSearchResult` — find the type and add the four new fields **after** the existing `currency` field:

```ts
export type PartSearchResult = {
  part_number: string;
  name: string;
  name_ar: string;
  category: string;
  category_ar: string;
  model: string;
  oem?: string | null;
  image?: string | null;
  availability_state: AvailabilityState;
  availability_label_en: string;
  availability_label_ar: string;
  quantity_available: number;
  replenishment_eta: string | null;
  unit_price: number | null;
  currency: string | null;
  // ── Discount fields (null when no displayable price or no eligible campaign) ──
  campaign_id: string | null;
  discount_pct: number;
  original_unit_price: number | null;
  discounted_unit_price: number | null;
  // ── (unchanged) ──
  stock_last_synced_at: string | null;
};
```

c) Extend `buildPartSearchResult`'s input signature and body. Replace the entire function with:

```ts
export function buildPartSearchResult(input: {
  catalog: {
    partNumber: string;
    name: string;
    nameAr: string;
    category: string;
    categoryAr: string;
    model: string;
    oem?: string | null;
    image?: string | null;
  };
  stock: StockSnapshot | null | undefined;
  price: PriceSnapshot | null | undefined;
  requestedQty?: number;
  /** Eligible campaign_items rows for this part. The builder picks the winner. */
  discountCandidates?: CampaignItemRow[] | null;
}): PartSearchResult {
  const state = resolveAvailabilityState(input.stock, input.requestedQty ?? 1);
  const displayable = getDisplayablePrice(state, input.price);

  // No-price rule wins: if price is withheld, withhold the discount too.
  let campaign_id: string | null = null;
  let discount_pct = 0;
  let original_unit_price: number | null = null;
  let discounted_unit_price: number | null = null;

  if (displayable) {
    const rule = pickWinningRule(input.discountCandidates, displayable.unit_price);
    const applied = applyDiscount(displayable.unit_price, rule);
    if (rule && applied) {
      campaign_id = rule.campaignId;
      discount_pct = applied.discountPct;
      original_unit_price = displayable.unit_price;
      discounted_unit_price = applied.discountedUnitPrice;
    }
  }

  return {
    part_number: input.catalog.partNumber,
    name: input.catalog.name,
    name_ar: input.catalog.nameAr,
    category: input.catalog.category,
    category_ar: input.catalog.categoryAr,
    model: input.catalog.model,
    oem: input.catalog.oem ?? null,
    image: input.catalog.image ?? null,
    availability_state: state,
    availability_label_en: stateLabel(state, "en"),
    availability_label_ar: stateLabel(state, "ar"),
    quantity_available: Math.max(0, input.stock?.quantity_available ?? 0),
    replenishment_eta: input.stock?.replenishment_eta ?? null,
    unit_price: displayable?.unit_price ?? null,
    currency: displayable?.currency ?? null,
    campaign_id,
    discount_pct,
    original_unit_price,
    discounted_unit_price,
    stock_last_synced_at: input.stock?.last_synced_at ?? null,
  };
}
```

- [ ] **Step 2: Write tests for the discount-aware builder**

Append to `tests/unit/price-resolution.test.ts`:

```ts
import { buildPartSearchResult } from "@/lib/rules/parts-availability";
import type { CampaignItemRow } from "@/lib/rules/campaign-discount";

const catalog = {
  partNumber: "P1",
  name: "Brake Pad",
  nameAr: "تيل فرامل",
  category: "brakes",
  categoryAr: "الفرامل",
  model: "Peugeot 3008",
  oem: null,
  image: null,
};

const stockAvailable = {
  part_number: "P1",
  quantity_available: 10,
  quantity_atp: 10,
  replenishment_eta: null,
  last_synced_at: "2026-05-30T00:00:00Z",
};

const priceRow = {
  part_number: "P1",
  unit_price: 1000,
  currency: "EGP",
  price_list_id: "STANDARD",
};

const eligibleCandidate = (over: Partial<CampaignItemRow> = {}): CampaignItemRow => ({
  campaign_id: "c1",
  discount_type: "percentage",
  discount_value: 10,
  campaign: {
    status: "active",
    start_date: null,
    end_date: null,
    target_audience: "all",
    target_dealer_ids: null,
  },
  ...over,
});

describe("buildPartSearchResult — discount fields", () => {
  it("returns null discount fields when no candidates given", () => {
    const r = buildPartSearchResult({ catalog, stock: stockAvailable, price: priceRow });
    expect(r.unit_price).toBe(1000);
    expect(r.campaign_id).toBeNull();
    expect(r.discount_pct).toBe(0);
    expect(r.original_unit_price).toBeNull();
    expect(r.discounted_unit_price).toBeNull();
  });

  it("applies a percentage discount when a candidate matches", () => {
    const r = buildPartSearchResult({
      catalog,
      stock: stockAvailable,
      price: priceRow,
      discountCandidates: [eligibleCandidate()],
    });
    expect(r.unit_price).toBe(1000);
    expect(r.original_unit_price).toBe(1000);
    expect(r.discounted_unit_price).toBe(900);
    expect(r.discount_pct).toBe(10);
    expect(r.campaign_id).toBe("c1");
  });

  it("withholds discount when price is withheld (no-price rule)", () => {
    const oos = { ...stockAvailable, quantity_available: 0, quantity_atp: 0, replenishment_eta: null };
    const r = buildPartSearchResult({
      catalog,
      stock: oos,
      price: priceRow,
      discountCandidates: [eligibleCandidate({ discount_value: 50 })],
    });
    expect(r.unit_price).toBeNull();
    expect(r.discounted_unit_price).toBeNull();
    expect(r.campaign_id).toBeNull();
  });
});
```

- [ ] **Step 3: Run tests**

Run: `npm test -- price-resolution`
Expected: existing 9 tests still pass + 3 new tests pass = 12 total.

- [ ] **Step 4: Commit**

```
git add src/lib/rules/parts-availability.ts tests/unit/price-resolution.test.ts
git commit -m "feat(rules): thread campaign discount through PartSearchResult (no-price rule preserved)"
```

---

## Task 4: Thread discount through `/api/parts` (search list)

Resolve the dealer optionally, batch-fetch discount candidates, pass per-part candidates into the builder.

**Files:**
- Modify: `src/app/api/parts/route.ts`

- [ ] **Step 1: Add the import and dealer-resolver helper**

At the top of `src/app/api/parts/route.ts`, add to the existing imports:

```ts
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getCampaignDiscounts } from "@/lib/rules/campaign-discount";
```

Then, just above `export async function GET(...)`, add the optional resolver:

```ts
/**
 * Best-effort dealer lookup. Returns null for admins or unauthenticated callers.
 * The catalog must still render for them — they just won't see dealer-specific
 * discounts.
 */
async function resolveOptionalDealerId(): Promise<string | null> {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    const role = user.user_metadata?.role;
    if (role !== "dealer" && role !== "sub_dealer") return null;
    const { data: dealer } = await supabase
      .from("dealers")
      .select("id")
      .eq("supabase_uid", user.id)
      .maybeSingle();
    return dealer?.id ?? null;
  } catch {
    return null;
  }
}
```

- [ ] **Step 2: Call resolver and thread candidates into builder**

In the `GET` handler, **after** the existing block that builds `priceMap` (step 3, around line 97 — ends with `// 4. Build search results applying the no-price rule`), insert a new block fetching discounts, and update the `.map(...)` to pass `discountCandidates`.

Replace this existing snippet:

```ts
    // 4. Build search results applying the no-price rule
    let results: PartSearchResult[] = catalogRows.map((part) =>
      buildPartSearchResult({
        catalog: part,
        stock: stockMap.get(part.partNumber) ?? null,
        price: priceMap.get(part.partNumber) ?? null,
      })
    );
```

With:

```ts
    // 3b. Discount candidates — best-effort (no dealer = no discounts)
    const dealerId = await resolveOptionalDealerId();
    const partNumbers = catalogRows.map((c) => c.partNumber);
    const discountMap = await getCampaignDiscounts(dealerId, partNumbers);

    // 4. Build search results applying the no-price rule
    let results: PartSearchResult[] = catalogRows.map((part) =>
      buildPartSearchResult({
        catalog: part,
        stock: stockMap.get(part.partNumber) ?? null,
        price: priceMap.get(part.partNumber) ?? null,
        discountCandidates: discountMap.get(part.partNumber) ?? null,
      })
    );
```

- [ ] **Step 3: Type-check the touched file**

Run: `npx tsc --noEmit 2>&1 | Select-String "app/api/parts/route"`
Expected: no output.

- [ ] **Step 4: Commit**

```
git add src/app/api/parts/route.ts
git commit -m "feat(parts-api): thread campaign discount through GET /api/parts"
```

---

## Task 5: Thread discount through `/api/parts/bulk-lookup`

Same pattern: best-effort dealer lookup + batched discount query, threaded per-part.

**Files:**
- Modify: `src/app/api/parts/bulk-lookup/route.ts`

- [ ] **Step 1: Add imports and resolver**

At the top, add:

```ts
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getCampaignDiscounts } from "@/lib/rules/campaign-discount";
```

Above `export async function POST(...)`, add:

```ts
async function resolveOptionalDealerId(): Promise<string | null> {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    const role = user.user_metadata?.role;
    if (role !== "dealer" && role !== "sub_dealer") return null;
    const { data: dealer } = await supabase
      .from("dealers")
      .select("id")
      .eq("supabase_uid", user.id)
      .maybeSingle();
    return dealer?.id ?? null;
  } catch {
    return null;
  }
}
```

- [ ] **Step 2: Thread candidates into the builder call**

Find the block where `priceMap` is built (best-effort `from("price_list_items")` block, around line 100-115). **After** that block but **before** the `items.map(...)` that builds results, insert:

```ts
    // Discount candidates — best-effort (no dealer = no discounts)
    const dealerId = await resolveOptionalDealerId();
    const discountMap = await getCampaignDiscounts(dealerId, partNumbers);
```

Then in the existing call to `buildPartSearchResult`, add the new `discountCandidates` argument. The call currently looks like:

```ts
      const result = buildPartSearchResult({
        catalog,
        stock: stockMap.get(partNum!) ?? null,
        price: priceMap.get(partNum!) ?? null,
        requestedQty: Math.max(1, Number(item.quantity) || 1),
      });
```

Change it to:

```ts
      const result = buildPartSearchResult({
        catalog,
        stock: stockMap.get(partNum!) ?? null,
        price: priceMap.get(partNum!) ?? null,
        requestedQty: Math.max(1, Number(item.quantity) || 1),
        discountCandidates: discountMap.get(partNum!) ?? null,
      });
```

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit 2>&1 | Select-String "bulk-lookup"`
Expected: no output.

- [ ] **Step 4: Commit**

```
git add src/app/api/parts/bulk-lookup/route.ts
git commit -m "feat(parts-api): thread campaign discount through POST /api/parts/bulk-lookup"
```

---

## Task 6: Thread discount through `/api/parts/[partNumber]`

Single-part variant. Same resolver, only one part number to look up.

**Files:**
- Modify: `src/app/api/parts/[partNumber]/route.ts`

- [ ] **Step 1: Add imports and resolver**

At the top, add:

```ts
import { getCampaignDiscounts } from "@/lib/rules/campaign-discount";
```

(`createServerSupabaseClient` is already imported in this file via `@/lib/supabase/server` patterns — verify with a quick read. If not present, add it.)

Above `export async function GET(...)`, add the same `resolveOptionalDealerId` helper from Task 4 Step 1.

- [ ] **Step 2: Call resolver and pass candidates to builder**

Locate the `buildPartSearchResult({...})` call in the GET handler. **Before** that call, add:

```ts
    const dealerId = await resolveOptionalDealerId();
    const discountMap = await getCampaignDiscounts(dealerId, [partNumber]);
```

Then update the builder call to include:

```ts
    const result = buildPartSearchResult({
      catalog: catalogRow,
      stock,
      price,
      requestedQty: qty,
      discountCandidates: discountMap.get(partNumber) ?? null,
    });
```

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit 2>&1 | Select-String "partNumber"`
Expected: no output for `app/api/parts/[partNumber]/route.ts`.

- [ ] **Step 4: Commit**

```
git add "src/app/api/parts/[partNumber]/route.ts"
git commit -m "feat(parts-api): thread campaign discount through GET /api/parts/[partNumber]"
```

---

## Task 7: Thread discount through `/api/parts/inquiry`

This route already requires a dealer session, so no optional resolver is needed — pass `authenticatedDealerIdOrError` (which is the dealer UUID after the guard).

**Files:**
- Modify: `src/app/api/parts/inquiry/route.ts`

- [ ] **Step 1: Add import**

At the top, add:

```ts
import { getCampaignDiscounts } from "@/lib/rules/campaign-discount";
```

- [ ] **Step 2: Resolve discount candidates before the builder call**

Find the call to `buildPartSearchResult({...})` in the POST handler. **Before** that call, add:

```ts
    const discountMap = await getCampaignDiscounts(
      authenticatedDealerIdOrError as string,
      [part_number],
    );
```

Then update the builder call to include:

```ts
      discountCandidates: discountMap.get(part_number) ?? null,
```

(as a new property alongside `catalog`, `stock`, `price`, `requestedQty`).

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit 2>&1 | Select-String "inquiry/route"`
Expected: no output.

- [ ] **Step 4: Commit**

```
git add src/app/api/parts/inquiry/route.ts
git commit -m "feat(parts-api): thread campaign discount through POST /api/parts/inquiry"
```

---

## Task 8: Cart store — discount fields + new selectors (TDD)

Extend the cart snapshot, add pure selectors for total discount and after-discount subtotal, and shift VAT/total math to use the after-discount value.

**Files:**
- Modify: `src/lib/cart/cart-store.ts`
- Create: `tests/unit/cart-discount.test.ts`

- [ ] **Step 1: Write failing tests**

Create `tests/unit/cart-discount.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import {
  cartReducer,
  INITIAL_CART_STATE,
  cartSubtotal,
  cartTotalDiscount,
  cartSubtotalAfterDiscount,
  cartVat,
  cartTotal,
  type CartPartSnapshot,
} from "@/lib/cart/cart-store";

const snap = (over: Partial<CartPartSnapshot> = {}): CartPartSnapshot => ({
  part_number: "P1",
  name: "Brake Pad",
  name_ar: "تيل",
  category: "brakes",
  model: "3008",
  oem: null,
  image: null,
  availability_state: "AVAILABLE",
  availability_label_en: "Available",
  quantity_available: 100,
  replenishment_eta: null,
  unit_price: 1000,
  currency: "EGP",
  ...over,
});

const addLine = (state = INITIAL_CART_STATE, snapshot: CartPartSnapshot, qty = 1) =>
  cartReducer(state, { type: "ADD_ITEM", part: snapshot, qty });

describe("cart discount selectors", () => {
  it("returns zero discount when no line has a discounted price", () => {
    const s = addLine(undefined, snap(), 5);
    expect(cartSubtotal(s)).toBe(5000);
    expect(cartTotalDiscount(s)).toBe(0);
    expect(cartSubtotalAfterDiscount(s)).toBe(5000);
  });

  it("sums per-line discount based on (original - discounted) * qty", () => {
    const discounted = snap({
      campaign_id: "c1",
      discount_pct: 10,
      original_unit_price: 1000,
      discounted_unit_price: 900,
    });
    const s = addLine(undefined, discounted, 12);
    expect(cartSubtotal(s)).toBe(12000); // 1000 * 12
    expect(cartTotalDiscount(s)).toBe(1200); // 100 * 12
    expect(cartSubtotalAfterDiscount(s)).toBe(10800);
  });

  it("computes VAT on the after-discount subtotal", () => {
    const discounted = snap({
      campaign_id: "c1",
      discount_pct: 10,
      original_unit_price: 1000,
      discounted_unit_price: 900,
    });
    const s = addLine(undefined, discounted, 10);
    expect(cartSubtotalAfterDiscount(s)).toBe(9000);
    // VAT = 14% of 9000 = 1260
    expect(cartVat(s)).toBe(1260);
    // Total = 9000 + 1260
    expect(cartTotal(s)).toBe(10260);
  });

  it("mixes discounted and non-discounted lines correctly", () => {
    let s = addLine(undefined, snap({
      campaign_id: "c1",
      discount_pct: 20,
      original_unit_price: 100,
      discounted_unit_price: 80,
    }), 5);
    s = addLine(s, snap({ part_number: "P2", unit_price: 200 }), 3);
    // Subtotal (original): 100*5 + 200*3 = 1100
    expect(cartSubtotal(s)).toBe(1100);
    // Discount: 20*5 + 0 = 100
    expect(cartTotalDiscount(s)).toBe(100);
    // After-discount: 1000
    expect(cartSubtotalAfterDiscount(s)).toBe(1000);
  });

  it("treats missing discount fields as no discount (back-compat)", () => {
    const s = addLine(undefined, snap({ unit_price: 500 }), 2);
    expect(cartTotalDiscount(s)).toBe(0);
    expect(cartSubtotalAfterDiscount(s)).toBe(cartSubtotal(s));
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- cart-discount`
Expected: FAIL — `cartTotalDiscount` / `cartSubtotalAfterDiscount` not exported, and `CartPartSnapshot` does not have discount fields.

- [ ] **Step 3: Extend `CartPartSnapshot` and add selectors**

In `src/lib/cart/cart-store.ts`:

a) Extend the snapshot type (find the existing definition and add three new optional fields at the end):

```ts
export type CartPartSnapshot = {
  part_number: string;
  name: string;
  name_ar: string;
  category: string;
  model: string;
  oem?: string | null;
  image?: string | null;
  availability_state: string;
  availability_label_en: string;
  quantity_available: number;
  replenishment_eta: string | null;
  unit_price: number;
  currency: string;
  // ── Optional discount fields (populated by lookup APIs) ──
  campaign_id?: string | null;
  discount_pct?: number;
  original_unit_price?: number | null;
  discounted_unit_price?: number | null;
};
```

b) Add new selectors, and **modify** `cartVat` and `cartTotal` to use the after-discount subtotal. Replace the existing `cartSubtotal`, `cartVat`, `cartTotal` block with:

```ts
export function cartSubtotal(state: CartState): number {
  // ORIGINAL subtotal (sum of unit_price * qty, ignoring discount).
  return state.lines.reduce((sum, l) => sum + l.part.unit_price * l.qty, 0);
}

export function cartTotalDiscount(state: CartState): number {
  return state.lines.reduce((sum, l) => {
    const orig = l.part.original_unit_price ?? l.part.unit_price;
    const disc = l.part.discounted_unit_price ?? l.part.unit_price;
    return sum + Math.max(0, orig - disc) * l.qty;
  }, 0);
}

export function cartSubtotalAfterDiscount(state: CartState): number {
  return cartSubtotal(state) - cartTotalDiscount(state);
}

export function cartVat(state: CartState, rate = 0.14): number {
  return Math.round(cartSubtotalAfterDiscount(state) * rate);
}

export function cartTotal(state: CartState, vatRate = 0.14): number {
  return cartSubtotalAfterDiscount(state) + cartVat(state, vatRate);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- cart-discount`
Expected: PASS — all 5 tests green.

- [ ] **Step 5: Make sure the existing 238-test suite still passes**

Run: `npm test`
Expected: all tests pass except the pre-existing `shipments.test.ts` import failure (carried over from before this plan; not caused by this work).

- [ ] **Step 6: Commit**

```
git add src/lib/cart/cart-store.ts tests/unit/cart-discount.test.ts
git commit -m "feat(cart): discount fields on snapshot + cartTotalDiscount/AfterDiscount selectors"
```

---

## Task 9: Cart context — expose discount selectors

Surface the new selectors on the React context so the New Order review page's existing `cart.totalDiscount` reference actually resolves.

**Files:**
- Modify: `src/lib/cart/cart-context.tsx`

- [ ] **Step 1: Extend imports and `CartContextValue`, and provide values**

a) Extend the imports from `./cart-store`. Find the existing import block and add `cartTotalDiscount` and `cartSubtotalAfterDiscount`:

```ts
import {
  cartReducer,
  INITIAL_CART_STATE,
  describeAction,
  cartLineCount,
  cartTotalQty,
  cartSubtotal,
  cartTotalDiscount,
  cartSubtotalAfterDiscount,
  cartVat,
  cartTotal,
  cartIsEmpty,
  cartHasItem,
  cartItemQty,
  cartToOrderPayload,
  type CartState,
  type CartAction,
  type CartPartSnapshot,
  type OrderType,
} from "./cart-store";
```

b) Extend `CartContextValue`. Find the interface and add two new fields under the other selector fields (after `subtotal: number;`):

```ts
  subtotal: number;
  totalDiscount: number;
  subtotalAfterDiscount: number;
  vat: number;
  total: number;
```

c) Add the values inside the `value` object inside the `CartProvider` (after `subtotal: cartSubtotal(state),`):

```ts
    subtotal: cartSubtotal(state),
    totalDiscount: cartTotalDiscount(state),
    subtotalAfterDiscount: cartSubtotalAfterDiscount(state),
    vat: cartVat(state),
    total: cartTotal(state),
```

- [ ] **Step 2: Type-check the touched file (and verify New Order page now resolves)**

Run: `npx tsc --noEmit 2>&1 | Select-String "cart-context|orders/new/page"`
Expected: no output for either path. The 3 pre-existing `TS2339` errors on `cart.totalDiscount` in `orders/new/page.tsx` should be gone.

- [ ] **Step 3: Commit**

```
git add src/lib/cart/cart-context.tsx
git commit -m "feat(cart): expose totalDiscount and subtotalAfterDiscount on context"
```

---

## Task 10: Bulk-upload preview — show discount

Carry discount through the preview row state and into the cart snapshot, render struck-through original + discounted line total, and reflect the discount in the green "Subtotal" banner.

**Files:**
- Modify: `src/components/dealer/order-bulk-upload.tsx`

- [ ] **Step 1: Carry discount fields on the row + snapshot**

a) Find the `EnrichedRow` type and add four optional discount fields after the existing `unitPrice` line:

```ts
type EnrichedRow = ValidatedOrderRow & {
  lookupStatus: "pending" | "valid" | "structural" | "not_found" | "no_price";
  lookupError?: string;
  partName?: string;
  unitPrice?: number | null;
  // ── Discount snapshot from lookup ──
  campaignId?: string | null;
  discountPct?: number;
  originalUnitPrice?: number | null;
  discountedUnitPrice?: number | null;
  availabilityLabel?: string;
  cartSnapshot?: CartPartSnapshot;
};
```

b) In the `enrichWithCatalog` function, find the `return base.map(...)` block where each row's snapshot is built. In the `case "valid"` return (the last return inside the `.map`), update the `snapshot` and the row return to include discount fields. Replace the snapshot creation:

```ts
      const snapshot: CartPartSnapshot = {
        part_number: result.part_number,
        name: result.name,
        name_ar: result.name_ar,
        category: result.category,
        model: result.model,
        oem: result.oem ?? null,
        image: result.image ?? null,
        availability_state: result.availability_state,
        availability_label_en: result.availability_label_en,
        quantity_available: result.quantity_available,
        replenishment_eta: result.replenishment_eta,
        unit_price: result.unit_price,
        currency: result.currency ?? "EGP",
        campaign_id: result.campaign_id ?? null,
        discount_pct: result.discount_pct ?? 0,
        original_unit_price: result.original_unit_price ?? null,
        discounted_unit_price: result.discounted_unit_price ?? null,
      };

      return {
        ...r,
        lookupStatus: "valid" as const,
        partName: result.name,
        unitPrice: result.unit_price,
        campaignId: result.campaign_id ?? null,
        discountPct: result.discount_pct ?? 0,
        originalUnitPrice: result.original_unit_price ?? null,
        discountedUnitPrice: result.discounted_unit_price ?? null,
        availabilityLabel: result.availability_label_en,
        cartSnapshot: snapshot,
      };
```

- [ ] **Step 2: Use discounted unit price for line total + subtotal**

Find the `subtotal` calculation block (`const subtotal = rows.filter(...)`) and change it to use the discounted unit price when present:

```ts
  const subtotal = rows
    .filter((r) => r.lookupStatus === "valid")
    .reduce(
      (s, r) =>
        s + (r.discountedUnitPrice ?? r.unitPrice ?? 0) * Number(r.data["Quantity"] || 0),
      0,
    );
```

- [ ] **Step 3: Render struck-through original + discounted in the preview table**

Find the per-row rendering block (`rows.map((row, idx) => {`). Update the `Unit Price` and `Line Total` cells. Replace the existing:

```tsx
                        <td className="px-3 py-3 text-xs text-white">
                          {row.lookupStatus === "valid" && row.unitPrice !== undefined
                            ? formatEGP(row.unitPrice ?? 0)
                            : "—"}
                        </td>
                        <td className="px-3 py-3 text-xs text-white font-semibold">
                          {row.lookupStatus === "valid" ? formatEGP(lineTotal) : "—"}
                        </td>
```

With (note: also update the `lineTotal` calculation a few lines above):

```tsx
                        <td className="px-3 py-3 text-xs text-white">
                          {row.lookupStatus === "valid" && row.unitPrice !== undefined ? (
                            row.campaignId && row.discountedUnitPrice !== null && row.discountedUnitPrice !== undefined ? (
                              <span className="flex flex-col">
                                <span className="text-white/40 line-through text-[10px]">
                                  {formatEGP(row.originalUnitPrice ?? row.unitPrice ?? 0)}
                                </span>
                                <span className="text-emerald-400 font-semibold">
                                  {formatEGP(row.discountedUnitPrice)}
                                </span>
                                <span className="text-[10px] text-emerald-400/70">
                                  Campaign −{row.discountPct}%
                                </span>
                              </span>
                            ) : (
                              formatEGP(row.unitPrice ?? 0)
                            )
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="px-3 py-3 text-xs text-white font-semibold">
                          {row.lookupStatus === "valid" ? formatEGP(lineTotal) : "—"}
                        </td>
```

And update the `lineTotal` computation just above the row return so it uses the discounted price:

```tsx
                {rows.map((row, idx) => {
                  const qty = Number(row.data["Quantity"]) || 0;
                  const effectiveUnit = row.discountedUnitPrice ?? row.unitPrice ?? 0;
                  const lineTotal = effectiveUnit * qty;
                  return (
```

- [ ] **Step 4: Type-check the file**

Run: `npx tsc --noEmit 2>&1 | Select-String "order-bulk-upload"`
Expected: no output.

- [ ] **Step 5: Commit**

```
git add src/components/dealer/order-bulk-upload.tsx
git commit -m "feat(dealer): show campaign discount in bulk-upload preview"
```

---

## Task 11: Switch `/api/orders` to the shared resolver — and delete the old broken functions

Replace the per-item `checkCampaignDiscount` + `calculateLineDiscount` loop with one batched call + the shared helpers, then delete the now-unused old exports.

**Files:**
- Modify: `src/app/api/orders/route.ts`
- Modify: `src/lib/rules/campaign-discount.ts`

- [ ] **Step 1: Rewrite the discount section of `POST /api/orders`**

In `src/app/api/orders/route.ts`:

a) Update the imports from `campaign-discount`. Replace:

```ts
import {
  checkCampaignDiscount,
  calculateLineDiscount,
} from "@/lib/rules/campaign-discount";
```

With:

```ts
import {
  getCampaignDiscounts,
  pickWinningRule,
  applyDiscount,
} from "@/lib/rules/campaign-discount";
```

b) Replace the per-item discount loop (currently lines ~165-203, starting with `// Calculate totals with discounts` and ending after `subtotal += lineDiscountInfo.lineTotal; totalDiscount += lineDiscountInfo.totalDiscount;`) with:

```ts
    // Calculate totals with campaign discounts
    let subtotal = 0;
    let totalDiscount = 0;

    const partNumbers = items.map((it: { part_number: string }) => it.part_number);
    const discountMap = await getCampaignDiscounts(dealer_id, partNumbers);

    const itemsWithDiscounts: Array<{
      quantity: number;
      unit_price: number;
      campaignId?: string;
      discountPct: number;
      discountedUnitPrice: number;
      totalDiscount: number;
      originalLineTotal: number;
      lineTotal: number;
    }> = [];

    for (const item of items) {
      const unitPrice = Number(item.unit_price);
      const candidates = discountMap.get(item.part_number) ?? null;
      const rule = pickWinningRule(candidates, unitPrice);
      const applied = applyDiscount(unitPrice, rule);

      const discountedUnitPrice = applied?.discountedUnitPrice ?? unitPrice;
      const discountPct = applied?.discountPct ?? 0;
      const originalLineTotal = Math.round(unitPrice * item.quantity * 100) / 100;
      const lineTotal = Math.round(discountedUnitPrice * item.quantity * 100) / 100;
      const lineDiscount = Math.round((originalLineTotal - lineTotal) * 100) / 100;

      itemsWithDiscounts.push({
        quantity: item.quantity,
        unit_price: unitPrice,
        campaignId: rule?.campaignId,
        discountPct,
        discountedUnitPrice,
        totalDiscount: lineDiscount,
        originalLineTotal,
        lineTotal,
      });

      subtotal += lineTotal;
      totalDiscount += lineDiscount;
    }
```

(`subtotal` keeps the **post-discount** semantic the existing INSERT relies on. `vatAmount` and `totalAmount` calculations below it stay unchanged.)

- [ ] **Step 2: Delete the now-unused old functions**

In `src/lib/rules/campaign-discount.ts`, **delete** the two old exports (no longer imported anywhere):

- `export interface DiscountEligibility { ... }`
- `export async function checkCampaignDiscount(...) { ... }`
- `export function calculateLineDiscount(...) { ... }`
- Any old leftover imports like `import type { Decimal } from "@prisma/client/runtime/library";`

The file now exports only the new helpers (`applyDiscount`, `filterEligibleCampaignItems`, `pickWinningRule`, `getCampaignDiscounts`, and their related types).

- [ ] **Step 3: Type-check the touched files**

Run: `npx tsc --noEmit 2>&1 | Select-String "api/orders/route|campaign-discount"`
Expected: no output. (Pre-existing errors elsewhere are not in scope.)

- [ ] **Step 4: Run all tests**

Run: `npm test`
Expected: previous green count + Task 1 (campaign-discount, ~17 tests) + Task 3 (3 new) + Task 8 (5 new) all green. The pre-existing shipments-suite import failure stays — it predates this plan and is unrelated.

- [ ] **Step 5: Commit**

```
git add src/app/api/orders/route.ts src/lib/rules/campaign-discount.ts
git commit -m "feat(orders): use shared discount resolver at submission; remove broken camelCase functions"
```

---

## Task 12: End-to-end smoke verification

Bring up the dev server, log in as a dealer, look up a part covered by an active campaign, and confirm the discount renders in the bulk-upload preview and the order review — and that submitting the order yields a stored discount on the order detail page.

**Files:** none modified; verification only.

- [ ] **Step 1: Confirm an active campaign exists covering a real part**

If `Brake Pads Special` is still `status = "completed"` (as found during design), either:

(a) flip it to `active` directly via the Supabase SQL editor — fastest:

```sql
update public.campaigns set status = 'active' where name = 'Brake Pads Special';
update public.campaign_items set part_number = '<EXISTING_CATALOG_PART_NUMBER>'
  where campaign_id = (select id from public.campaigns where name = 'Brake Pads Special');
```

Replace `<EXISTING_CATALOG_PART_NUMBER>` with a real part number present in `parts_catalog` (e.g., one your test CSV uses).

(b) Or create a new active campaign via the admin UI — but be aware the admin CRUD may have its own camelCase/snake_case bug (flagged as a follow-up in the spec).

- [ ] **Step 2: Start the dev server**

Run: `npm run dev`
Wait until "Ready in" message, server bound to `http://localhost:3000`.

- [ ] **Step 3: Log in as a dealer with role `dealer` whose UUID matches the campaign's targeting (or who is covered by `target_audience = 'all'`)**

Navigate to `http://localhost:3000/login`, sign in.

- [ ] **Step 4: Browse to bulk upload and confirm discount appears**

Navigate: Dashboard → Orders → New Order → Bulk Upload (CSV / Excel). Upload a CSV including the campaigned part. Confirm in the preview row:

- "Unit Price" column shows the original struck-through and the discounted price below
- A small "Campaign −X%" tag appears under the discounted price
- The green "All N item are valid. Subtotal:" banner reflects the discounted total

- [ ] **Step 5: Add to cart and review order**

Click "Add N Valid Item to Cart". Navigate to the order review/summary. Confirm:

- "Original Subtotal" row shows the pre-discount value (struck-through)
- "Campaign Discount" row shows the negative discount amount
- "Subtotal" shows the after-discount value
- VAT is 14% of the after-discount subtotal
- Total = after-discount + VAT

- [ ] **Step 6: Submit and verify the order detail page**

Submit the order. Navigate to the order detail page. Confirm:

- Per-line discount badge ("Campaign") + struck unit price + discounted unit price + "−X%" appear on the campaigned line
- Footer shows "Original Subtotal" (struck), "Campaign Discount" (negative emerald), "Subtotal After Discount", VAT, Total — all internally consistent

- [ ] **Step 7: If anything is off, file follow-ups (do NOT silently fix)**

If discounts don't appear or totals don't reconcile, debug systematically per `superpowers:systematic-debugging`. Common pitfalls:

- Dealer's UUID not in `target_dealer_ids` AND `target_audience` is not `'all'` → no discount (by design)
- Campaign `status` is still anything but `'active'` → no discount
- Part number in CSV does not exist in `parts_catalog` → row shows "not found" before discount can apply
- Stale Turbopack cache → `Remove-Item .next -Recurse -Force; npm run dev`

- [ ] **Step 8: Final commit (only if any follow-up fixes were made above)**

If Step 7 produced fixes, commit them individually with `fix(...)` messages.

---

## Self-Review Notes

- **Spec coverage:** §5.1 → Tasks 1-2 + Task 11; §5.2 → Task 3; §5.3 → Tasks 4-7; §5.4 → Tasks 8-9; §5.5 (bulk-upload) → Task 10; §5.5 (New Order review) → falls out of Task 9 (cart context exposes `totalDiscount`); §5.5 (order detail) → no-op per retracted Defect B; §5.6 → Task 11; §8 testing → TDD throughout; §10 follow-ups → documented, not implemented.
- **No placeholders:** all steps include exact code, exact paths, exact commands.
- **Type consistency:** `applyDiscount`, `pickWinningRule`, `getCampaignDiscounts`, `buildPartSearchResult`, `CartPartSnapshot`, cart selectors use the same shapes throughout.
