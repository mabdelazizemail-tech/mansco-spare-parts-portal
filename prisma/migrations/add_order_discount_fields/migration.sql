-- Add campaign discount fields to order_lines
ALTER TABLE order_lines ADD COLUMN campaign_id UUID,
ADD COLUMN discount_pct NUMERIC(5, 2) NOT NULL DEFAULT 0,
ADD COLUMN discounted_unit_price NUMERIC(12, 2) NOT NULL DEFAULT 0,
ADD COLUMN total_discount NUMERIC(12, 2) NOT NULL DEFAULT 0,
ADD COLUMN original_line_total NUMERIC(12, 2) NOT NULL DEFAULT 0;

-- Create index on campaign_id for efficient lookups
CREATE INDEX idx_order_lines_campaign_id ON order_lines(campaign_id);

-- Add comment explaining the fields
COMMENT ON COLUMN order_lines.campaign_id IS 'Campaign that this discount was applied from (null if no discount)';
COMMENT ON COLUMN order_lines.discount_pct IS 'Discount percentage applied (0-100)';
COMMENT ON COLUMN order_lines.discounted_unit_price IS 'Unit price after applying discount';
COMMENT ON COLUMN order_lines.total_discount IS 'Total discount amount for this line (originalLineTotal - lineTotal)';
COMMENT ON COLUMN order_lines.original_line_total IS 'Line total before discount (quantity * original unit_price)';
