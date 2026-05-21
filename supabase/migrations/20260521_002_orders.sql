-- ============================================================
-- Module 5: Order Management Tables
-- ============================================================

-- ── Orders ──
CREATE TABLE IF NOT EXISTS orders (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number  text UNIQUE NOT NULL,
  dealer_id     text NOT NULL,                -- dealer code / id
  order_type    text NOT NULL CHECK (order_type IN ('daily', 'air_dhl', 'stock')),
  status        text NOT NULL DEFAULT 'submitted'
                CHECK (status IN (
                  'submitted','under_review','approved','rejected',
                  'partial','back_ordered','done',
                  'invoiced','shipped','delivered','cancelled'
                )),
  submitted_at  timestamptz NOT NULL DEFAULT now(),
  approved_at   timestamptz,
  approved_by   text,
  rejected_at   timestamptz,
  rejected_by   text,
  rejection_reason text,
  subtotal      numeric(12,2) NOT NULL DEFAULT 0,
  vat_amount    numeric(12,2) NOT NULL DEFAULT 0,
  total_amount  numeric(12,2) NOT NULL DEFAULT 0,
  currency      text NOT NULL DEFAULT 'EGP',
  notes         text,
  -- Financial snapshot at submission time
  credit_limit_at_order   numeric(12,2),
  overdue_balance_at_order numeric(12,2),
  financial_block         boolean NOT NULL DEFAULT false,
  financial_block_reason  text,
  -- ETA
  eta_calculated  date,
  eta_actual      date,
  -- Tracking
  invoice_number  text,
  tracking_number text,
  carrier         text,
  -- Audit
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_orders_dealer    ON orders(dealer_id);
CREATE INDEX idx_orders_status    ON orders(status);
CREATE INDEX idx_orders_submitted ON orders(submitted_at DESC);
CREATE INDEX idx_orders_number    ON orders(order_number);

-- ── Order Lines ──
CREATE TABLE IF NOT EXISTS order_lines (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id            uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  part_number         text NOT NULL,
  part_name           text NOT NULL,
  part_name_ar        text,
  quantity_requested  integer NOT NULL CHECK (quantity_requested > 0),
  quantity_confirmed  integer NOT NULL DEFAULT 0,
  quantity_backordered integer NOT NULL DEFAULT 0,
  unit_price          numeric(12,2) NOT NULL,
  line_total          numeric(12,2) NOT NULL,
  currency            text NOT NULL DEFAULT 'EGP',
  line_status         text NOT NULL DEFAULT 'pending'
                      CHECK (line_status IN ('pending','confirmed','backordered','rejected','shipped','delivered')),
  backorder_eta       date,
  availability_at_order text,  -- snapshot of availability state
  created_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_order_lines_order ON order_lines(order_id);
CREATE INDEX idx_order_lines_part  ON order_lines(part_number);

-- ── Order Approvals / Review Actions ──
CREATE TABLE IF NOT EXISTS order_approvals (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id    uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  reviewer_id text NOT NULL,
  action      text NOT NULL CHECK (action IN ('approve','reject','partial_approve','request_info')),
  notes       text,
  decided_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_order_approvals_order ON order_approvals(order_id);

-- ── Order Timeline Events ──
CREATE TABLE IF NOT EXISTS order_timeline (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id    uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  event       text NOT NULL,
  status      text,
  actor       text,
  notes       text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_order_timeline_order ON order_timeline(order_id);

-- ── Updated-at triggers ──
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_orders_updated_at'
  ) THEN
    CREATE TRIGGER trg_orders_updated_at
      BEFORE UPDATE ON orders
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END;
$$;

-- ── RLS ──
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_timeline ENABLE ROW LEVEL SECURITY;

-- Service-role (admin) bypasses RLS automatically.
-- Anon/authenticated policies: dealers see own orders only.
CREATE POLICY "Dealers see own orders"
  ON orders FOR SELECT
  USING (auth.uid()::text = dealer_id OR auth.jwt() ->> 'role' IN ('admin','super_admin'));

CREATE POLICY "Service role full access orders"
  ON orders FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Order lines follow order access"
  ON order_lines FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM orders o
      WHERE o.id = order_lines.order_id
        AND (o.dealer_id = auth.uid()::text OR auth.jwt() ->> 'role' IN ('admin','super_admin'))
    )
  );

CREATE POLICY "Service role full access order_lines"
  ON order_lines FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role full access order_approvals"
  ON order_approvals FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role full access order_timeline"
  ON order_timeline FOR ALL
  USING (true)
  WITH CHECK (true);
