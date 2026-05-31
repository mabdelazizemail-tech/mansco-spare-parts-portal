# Campaign Discount System

## Overview

The MANSCO Spare Parts Portal automatically calculates and applies discounts to orders based on **campaign eligibility criteria**. Dealers do not manually select discounts — the system determines eligibility and applies the best available discount.

## How It Works

### Eligibility Criteria

A dealer receives a campaign discount on a part if **ALL** of the following are true:

1. **Campaign is Active**
   - Campaign status must be "active"
   - Current date must be within the campaign's start and end dates

2. **Part is in Campaign**
   - The part number must be listed in the campaign's items

3. **Dealer is Eligible**
   - Dealer is in the campaign's `targetDealerIds`, OR
   - Campaign's `targetAudience` is set to "all"

4. **Order Quantity Meets Minimum**
   - Order quantity ≥ `minOrderQuantity` defined for that part in the campaign

### Discount Calculation

When an order is submitted:

1. **Server-side Check** — System checks campaign eligibility for each part
2. **Discount Applied** — If eligible, the discount percentage is applied to each line
3. **Pricing Shown** — Order shows:
   - Original price (struck through)
   - Discount amount
   - Final price after discount
   - VAT calculated on final discounted price

### Example

Campaign: "Spring Promo 2026"
- Status: Active
- Target Audience: All dealers
- Parts: PSA-4249.34 (discount: 10%)

**Order Line:**
- Part: PSA-4249.34
- Quantity: 5
- Original Unit Price: 100 EGP
- **Original Line Total: 500 EGP** (struck through)
- **Campaign Discount: -50 EGP** (10%)
- **Final Line Total: 450 EGP**

## Order Submission Flow

### Before Submission (Order Review)
- Shows items with prices
- No discount information yet (not calculated)

### After Submission (Success Message)
- Shows order number and confirmation
- **Displays discount breakdown:**
  - Original Subtotal (before discount)
  - Campaign Discount (with amount)
  - Final Subtotal (after discount)
  - VAT (calculated on final amount)
  - Total Amount

### Order History / Details
- Shows each line with:
  - Part number and name
  - Quantity
  - Original unit price
  - Discounted unit price (if applicable)
  - Campaign badge (if discount applied)
  - Original line total (struck through)
  - Final line total

## For Dealers

### What Dealers See

✅ **Automatically Applied**
- Discounts are automatically calculated based on your eligibility
- No need to enter discount codes or percentages
- System finds all applicable campaigns for you

✅ **Price Clarity**
- Original price shown (struck through)
- Discount amount clearly labeled as "Campaign Discount"
- Final price highlighted
- VAT calculated on the discounted price

✅ **Examples**
- "Spring Campaign" campaign discount: -5% on eligible parts
- Quantity-based: Minimum 10 units for discount eligibility
- Dealer-specific: Only approved dealers in the campaign get discounts

### How to Get Discounts

1. **Be Approved** — Only approved dealers have access to orders
2. **Check Active Campaigns** — Campaigns must be active (within date range)
3. **Order Eligible Parts** — Parts must be included in the campaign
4. **Meet Minimum Quantity** — If campaign has a minimum, order that quantity

## For Admins

### Setting Up Campaigns

#### Campaign Structure
```json
{
  "name": "Spring Promo 2026",
  "status": "active",
  "startDate": "2026-03-01",
  "endDate": "2026-05-31",
  "targetAudience": "specific", // "all" or "specific"
  "targetDealerIds": ["dealer-1", "dealer-2"], // if targetAudience = "specific"
  "items": [
    {
      "partNumber": "PSA-4249.34",
      "discountType": "percentage", // currently supports "percentage"
      "discountValue": 10, // 10%
      "minOrderQuantity": 5
    }
  ]
}
```

#### Best Practices

1. **Date Range Validation** — Ensure end date is after start date
2. **Quantity Thresholds** — Set realistic minimums (bulk purchases)
3. **Dealer Targeting** — Use specific targeting for dealer-exclusive campaigns
4. **Performance** — Campaigns with fewer target dealers perform better

### Monitoring Discounts

Track campaign effectiveness:
- Total discounts given per campaign
- Discount adoption rate (% of eligible dealers using campaign)
- Average discount value per order
- Campaign ROI

## Technical Details

### Order Line Discount Fields

When an order line is created, it includes:
- `campaignId` — Which campaign the discount came from (null if no discount)
- `discountPct` — Percentage discount applied (0-100)
- `discountedUnitPrice` — Unit price after discount
- `totalDiscount` — Total discount amount for the line
- `originalLineTotal` — Line total before discount
- `lineTotal` — Final line total (already reflects discount)

### API Response

When submitting an order, the response includes:

```json
{
  "data": {
    "order_id": "...",
    "order_number": "ORD-2026-ABC123",
    "subtotal": 1000,           // Original subtotal before discount
    "total_discount": 100,       // Total discount applied
    "subtotal_after_discount": 900,  // Final subtotal
    "vat_amount": 126,           // VAT on discounted subtotal
    "total_amount": 1026         // Final total
  }
}
```

## Important Notes

⚠️ **No Manual Discounts**
- Dealers cannot manually enter discount codes
- Discounts are calculated entirely by the system
- Only campaign-based discounts are supported

⚠️ **VAT Calculation**
- VAT (14%) is calculated **AFTER** discount is applied
- Saves money for dealers on discounted purchases

⚠️ **One Discount Per Line**
- If a part is in multiple active campaigns targeting the same dealer, the highest discount is applied
- Multiple overlapping discounts do not stack

⚠️ **Discount Immutability**
- Once an order is submitted, its discount is locked in
- Campaign changes do not retroactively affect submitted orders

## Troubleshooting

### "I should qualify for a discount but didn't get one"

Check:
1. Is the campaign **active** (today's date within range)?
2. Is the part **in the campaign items**?
3. Is your dealer **in targetDealerIds** (if not all dealers)?
4. Is your order quantity **≥ minOrderQuantity**?

### "Why is my VAT higher than expected?"

- VAT is 14% of the **discounted** subtotal, not the original
- This is by design — you pay less VAT on discounted orders

### "The discount percentage seems wrong"

- Verify the campaign's `discountType` is "percentage"
- Check the campaign's `discountValue` field
- Confirm the campaign's date range is current
