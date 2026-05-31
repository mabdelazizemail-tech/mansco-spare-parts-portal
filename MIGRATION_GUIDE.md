# Campaign Discount System - Database Migration Guide

## Overview

The campaign discount feature requires database schema changes to the `order_lines` table. This guide provides instructions for applying the migration manually if the Prisma CLI migration encounters connection issues.

## Prerequisites

- Supabase project access
- Admin privileges to run SQL in the Supabase SQL editor
- Access to the project database

## Option 1: Supabase SQL Editor (Recommended)

### Steps

1. Go to your Supabase project dashboard: https://supabase.com/dashboard
2. Navigate to the SQL Editor section
3. Create a new query and paste the following SQL:

```sql
-- Add campaign discount fields to order_lines table
ALTER TABLE order_lines 
  ADD COLUMN IF NOT EXISTS campaign_id UUID,
  ADD COLUMN IF NOT EXISTS discount_pct NUMERIC(5, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS discounted_unit_price NUMERIC(12, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_discount NUMERIC(12, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS original_line_total NUMERIC(12, 2) NOT NULL DEFAULT 0;

-- Create index on campaign_id for efficient lookups
CREATE INDEX IF NOT EXISTS idx_order_lines_campaign_id ON order_lines(campaign_id);

-- Add comments explaining the fields
COMMENT ON COLUMN order_lines.campaign_id IS 'Campaign that this discount was applied from (null if no discount)';
COMMENT ON COLUMN order_lines.discount_pct IS 'Discount percentage applied (0-100)';
COMMENT ON COLUMN order_lines.discounted_unit_price IS 'Unit price after applying discount';
COMMENT ON COLUMN order_lines.total_discount IS 'Total discount amount for this line (originalLineTotal - lineTotal)';
COMMENT ON COLUMN order_lines.original_line_total IS 'Line total before discount (quantity * original unit_price)';
```

4. Click "Run" to execute the migration
5. You should see a success message: "Success. 0 rows affected"

### Verification

Run this query to verify the columns exist:

```sql
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'order_lines' 
  AND column_name IN ('campaign_id', 'discount_pct', 'discounted_unit_price', 'total_discount', 'original_line_total')
ORDER BY column_name;
```

All 5 columns should be returned.

## Option 2: Prisma CLI (When Connection is Stable)

If you need to run migrations using Prisma CLI, ensure the DATABASE_URL environment variable is properly set:

```bash
# In .env.local
DATABASE_URL="postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres?pgbouncer=true"

# Then run:
npx prisma migrate dev --name add_order_discount_fields
```

## Option 3: Direct psql Command

If you prefer using the PostgreSQL CLI directly:

```bash
psql "postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:5432/postgres" \
  -f prisma/migrations/add_order_discount_fields/migration.sql
```

Replace `[project-ref]` and `[password]` with your actual credentials from Supabase.

## After Migration

Once the migration is applied:

1. **Restart the development server** to regenerate the Prisma Client:
   ```bash
   npm run dev
   ```

2. **The campaign discount system is now active:**
   - Orders will automatically calculate discounts based on campaign eligibility
   - Order success messages will display discount breakdowns
   - Order lines will track which campaign discount was applied

## Schema Changes Summary

| Column | Type | Purpose |
|--------|------|---------|
| `campaign_id` | UUID | Links to the campaign that provided the discount |
| `discount_pct` | NUMERIC(5, 2) | Percentage discount applied (0-100) |
| `discounted_unit_price` | NUMERIC(12, 2) | Unit price after discount is applied |
| `total_discount` | NUMERIC(12, 2) | Total discount amount for this line |
| `original_line_total` | NUMERIC(12, 2) | Line total before discount |

## Troubleshooting

### "Column already exists" error
The columns may already exist from a previous migration attempt. This is safe to ignore.

### Connection timeout errors
- Check that your Supabase project is active (not paused)
- Verify your DATABASE_URL is correct in .env.local
- Try using the Supabase SQL Editor instead of the CLI

### "Permission denied" error
Ensure you're using a database user with sufficient privileges (typically the postgres superuser account).

## Related Files

- **Migration SQL:** `prisma/migrations/add_order_discount_fields/migration.sql`
- **Discount Engine:** `src/lib/rules/campaign-discount.ts`
- **Campaign Docs:** `docs/CAMPAIGN_DISCOUNTS.md`
- **Order API:** `src/app/api/orders/route.ts`
