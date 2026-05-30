# Campaign Discount — Make It Work, Then Show It to the Dealer

- **Date:** 2026-05-29
- **Status:** Design — awaiting user review
- **Author:** Engineering (with mohamed.abdelaziz@capture-doc.com)
- **Related:** `src/lib/rules/campaign-discount.ts`, `src/app/api/orders/route.ts`, `src/lib/cart/*`, `src/app/api/parts/*`, `src/app/dashboard/orders/*`

## 1. Problem & Context

A dealer placing an order sees **full list price** with no indication of any campaign discount (e.g. bulk-upload preview shows 12 × EGP 1,250 = EGP 15,000, no markdown). Investigation found two distinct defects:

### Defect A — the discount engine never runs (critical)
`checkCampaignDiscount()` queries **camelCase** columns (`partNumber`, `campaignId`, `discountValue`, `discountType`, `minOrderQuantity`, `targetAudience`, `targetDealerIds`, `startDate`, `endDate`) but the live Supabase tables are **snake_case**. Verified against the live DB:

- Code's query → `HTTP 400: column campaigns_1.targetAudience does not exist`
- Corrected snake_case query → `200 OK`

The query error is swallowed by the function's `catch`, which returns `{ eligible: false, discountPct: 0 }`. **Result: no discount is ever applied — not in any UI, and not even at order submission. Every order is charged full price.** This is the same camelCase/snake_case schism as the earlier `price_lists` bug: Supabase-client code written in Prisma-style camelCase against snake_case SQL tables.

### Defect B — RETRACTED on closer reading: detail totals are correct
Initial analysis suspected the order detail page double-counted the discount. Re-reading the actual `orders` INSERT in `src/app/api/orders/route.ts` shows otherwise: `orders.subtotal` is stored **post-discount** (the loop accumulates discounted line totals), `vat_amount` = 14% of that, `total_amount` = subtotal + VAT, and each `order_lines.total_discount` is persisted. The detail page (`[id]/page.tsx`) sums the line discounts and derives the original as `order.subtotal + Σ line.total_discount` — which is **correct**. No detail-page change is required; it renders nothing today only because Defect A forces every `total_discount` to 0.

The lone real inconsistency is cosmetic: the POST `/api/orders` **response payload** labels its `subtotal` field as the pre-discount value while the DB column stores the post-discount value. No UI consumes it for totals — optional cleanup only.

### Defect C — display path doesn't carry discount at all
Even with A & B fixed, the parts-lookup APIs, the cart store/context, and the bulk-upload/review UI have no discount fields. The New Order review page references `cart.totalDiscount`, which does not exist on the cart context (`TS2339`, hidden by `ignoreBuildErrors`) — at runtime it is `undefined`, rendering `EGP NaN` for "Original Subtotal" and suppressing the discount row.

## 2. Goals

1. Campaign discounts are **correctly computed** (Defect A) for eligible dealer + part combinations.
2. The dealer **sees** the discount everywhere they build/review an order: parts search, bulk-upload preview, cart, and order review/summary (Defect C).
3. **What the dealer sees equals what submission charges** — guaranteed by a single shared resolver + math helper used by both the display and charge paths.
4. The order detail page (already correct — Defect B retracted, see §1) renders discounts automatically once they compute; optionally tidy the POST response payload's `subtotal` label.

## 3. Non-Goals / Out of Scope

- **Admin campaign CRUD** (`/api/campaigns/**`, campaign wizard) likely has the same camelCase/snake_case bug. Flagged as a **separate follow-up**, not fixed here. (Revisit if it blocks creating an active test campaign.)
- No changes to campaign data model or admin UI.
- No new standalone discount API endpoint — discount rides on existing parts-lookup responses.

## 4. Decisions (from brainstorming)

| # | Decision |
|---|----------|
| D1 | **Server-authoritative** discounts, surfaced via the **existing parts-lookup endpoints** (no separate `/api/discounts`). |
| D2 | **Ignore `min_order_quantity` everywhere** (display *and* submission). Discount becomes **quantity-independent** — a plain % (or fixed amount) off unit price. No re-evaluation on cart qty change. |
| D3 | Support **both** `discount_type = 'percentage'` and `'fixed'`. (Current engine silently zeroes `fixed`.) |
| D4 | One shared resolver + one shared pure math helper used by **both** display and charge → display == charge by construction. |

## 5. Architecture & Components

### 5.1 Resolver — `src/lib/rules/campaign-discount.ts` (rebuilt)
- **Fix schema** to snake_case throughout: `campaign_items.part_number/campaign_id/discount_type/discount_value`, joined `campaigns.status/target_audience/target_dealer_ids/start_date/end_date`.
- **Batched** lookup:
  ```ts
  getCampaignDiscounts(
    dealerId: string,
    partNumbers: string[]
  ): Promise<Map<string, { campaignId: string; discountType: "percentage" | "fixed"; discountValue: number }>>
  ```
  Single query for all part numbers (`part_number=in.(...)`), avoiding N+1 (the search page lists every part).
- **Eligibility** (no qty gate, per D2): campaign `status = 'active'`; `now` within `[start_date, end_date]` (null bounds = open); dealer in `target_dealer_ids` OR `target_audience = 'all'`. On ambiguity (a part in multiple active campaigns) pick the **highest effective discount** — i.e. the rule yielding the lowest discounted unit price.
- **Pure math helper** (shared by display + charge, per D4):
  ```ts
  applyDiscount(unitPrice: number, rule: { discountType; discountValue }):
    { discountedUnitPrice: number; discountPct: number; lineDiscountPerUnit: number }
  ```
  - `percentage`: `discountedUnitPrice = unitPrice * (1 - value/100)`
  - `fixed`: `discountedUnitPrice = max(0, unitPrice - value)`; derive `discountPct` from the pair.
  - Single rounding convention (2 dp), defined once here.
- Keep a thin single-part wrapper if convenient, but the orders route and lookups both go through `getCampaignDiscounts` + `applyDiscount`.

### 5.2 Availability/result types — `src/lib/rules/parts-availability.ts`
- Extend `PartSearchResult` with: `campaign_id: string | null`, `discount_pct: number`, `original_unit_price: number | null`, `discounted_unit_price: number | null`.
- `buildPartSearchResult(...)` takes an optional discount rule and computes the discounted fields **through `getDisplayablePrice`/the no-price rule**: if the part's price is withheld (NOT_AVAILABLE_*), the discount is withheld too (all discount fields null/0). This preserves the mandatory no-price-on-unavailable rule.

### 5.3 Lookup APIs — add dealer context + thread discount
Affected: `src/app/api/parts/route.ts`, `parts/bulk-lookup/route.ts`, `parts/[partNumber]/route.ts`, `parts/inquiry/route.ts`.
- `/api/parts` and `/api/parts/bulk-lookup` **currently perform no auth** — add `createServerSupabaseClient().auth.getUser()` to resolve `dealer_id` from `user_metadata`. (`inquiry` already uses `requireDealerSession`; reuse that pattern.)
- After building the price map, call `getCampaignDiscounts(dealerId, partNumbers)` and pass each rule into `buildPartSearchResult`.
- **No dealer / admin / unauthenticated context → no discount** (empty map). No errors; just full price.

### 5.4 Cart — `src/lib/cart/cart-store.ts` + `cart-context.tsx`
- `CartPartSnapshot` gains `campaign_id?: string | null` and `discount_pct?: number` (qty-independent per D2; no recompute on qty change).
- New pure selectors: `cartTotalDiscount(state)`, `cartSubtotalAfterDiscount(state)`. **VAT computed on the after-discount subtotal**; `cartTotal = subtotalAfterDiscount + vat`.
- `CartContextValue` exposes `totalDiscount` and `subtotalAfterDiscount` — this is the field the New Order review page already references (resolves the `TS2339` + `NaN`).
- `cartToOrderPayload` is unchanged in shape: it does **not** send discount; the server recomputes authoritatively (display vs charge stay consistent via the shared resolver, and the client cannot tamper with pricing).

### 5.5 UI surfaces
- **Bulk-upload preview** (`src/components/dealer/order-bulk-upload.tsx`): `EnrichedRow` carries discount from the lookup; render struck `original_unit_price` + `discounted_unit_price`, discounted line total, and a "Campaign −X%" tag; the "All N valid · Subtotal" banner reflects the discounted subtotal.
- **New Order review / Order Summary** (`src/app/dashboard/orders/new/page.tsx`): existing `Original Subtotal` (struck) and `Campaign Discount` rows light up via `cart.totalDiscount`; per-line rows show discounted unit price.
- **Order detail** (`src/app/dashboard/orders/[id]/page.tsx`): **no change needed** — it already derives original/after-discount correctly from the stored post-discount `orders.subtotal` + summed `order_lines.total_discount`, and lights up automatically once Defect A makes discounts non-zero.

### 5.6 Server submission — `src/app/api/orders/route.ts`
- Replace the per-item `checkCampaignDiscount` loop with the shared `getCampaignDiscounts` + `applyDiscount` (correct schema, no qty gate, same rounding).
- **Preserve the current (correct) totals convention — do NOT change storage semantics:**
  - `orders.subtotal` = **post-discount** subtotal (Σ discounted line totals)
  - `orders.vat_amount` = 14% × `orders.subtotal`
  - `orders.total_amount` = `orders.subtotal` + `vat_amount`
  - `order_lines` persist `discount_pct`, `discounted_unit_price`, `total_discount`, `original_line_total`, `line_total`, `campaign_id` (the detail page sums these).
- Only the resolver call changes (shared resolver + `applyDiscount`, correct schema, no qty gate). The stored numbers keep the same meaning, so the detail page stays correct.
- (Optional) make the POST response payload's `subtotal` field match the stored post-discount value.

## 6. Data Flow

```
DISPLAY path:  lookup API → getCampaignDiscounts(dealer, parts) → applyDiscount → PartSearchResult(discount) → cart snapshot → cart selectors → preview/summary UI
CHARGE path:   POST /api/orders → getCampaignDiscounts(dealer, parts) → applyDiscount → order_lines + canonical totals → order detail UI
```
Both paths call the **same** `getCampaignDiscounts` + `applyDiscount` with the same rounding ⇒ identical numbers.

## 7. Edge Cases & Error Handling

- Price withheld (out of stock) → discount withheld (no-price rule wins).
- `fixed` discount ≥ unit price → discounted unit price clamps at 0 (never negative).
- Part in multiple active campaigns → the rule yielding the lowest discounted unit price.
- Campaign inactive / outside date window / dealer not targeted → no discount.
- Resolver query failure → **log and return empty map (full price)**; never throw into the price path. (But the query is now correct, so this is a true fallback, not the normal path.)
- Admin/unauthenticated lookup → no dealer → no discount.

## 8. Testing

- **Unit (pure, TDD):** `applyDiscount` (percentage, fixed, 0-clamp, rounding); cart selectors (`cartTotalDiscount`, `cartSubtotalAfterDiscount`, VAT-on-after-discount, total); eligibility filter (active/date-window/dealer-target, multi-campaign pick-highest).
- **Integration:** corrected resolver query returns 200 against the real schema (manually verified during design); lookup APIs include discount fields only when price is shown.
- **Consistency test:** for a sample dealer+part+qty, the display computation and the submission computation produce identical line/total numbers.
- **Regression:** existing 238 unit tests stay green.

## 9. Prerequisites to Validate End-to-End

- The only existing campaign ("Brake Pads Special", part `2222`) is `status = "completed"`; the screenshot part `PSA-4249.34` is in no campaign. To see a discount after the fix, there must be an **active** campaign covering the tested part for the tested dealer. (Creating one may surface the out-of-scope admin-CRUD camelCase bug — handle as a follow-up if it blocks testing.)

## 10. Follow-ups (not in this scope)

- Audit & fix camelCase/snake_case in admin campaign CRUD (`/api/campaigns/**`, campaign wizard).
- Consider a broader sweep for other Supabase-client call sites using Prisma-style camelCase against snake_case tables (same bug class as `price_lists` and this).
