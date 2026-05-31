-- ============================================================
-- Module 6 — Phase 2 & 3: Fulfillment (Back-Orders + Invoices)
-- ============================================================
-- Phase 2: real invoices table (replaces the orders.invoice_number stopgap
--          from 20260522_003 — that column is retained for backward compat).
-- Phase 3: back-orders with ETA-change history and at-risk flagging, fed by
--          the partial-fulfillment split engine at order approval.
--
-- Pattern: raw Supabase SQL + RLS, consistent with orders/shipments. The app
-- reads/writes through the service-role client (supabaseAdmin), which bypasses
-- RLS; the dealer SELECT policies mirror the orders table so a future
-- anon/authenticated read path stays scoped.
--
-- Convention note: orders.dealer_id stores the dealer CODE (text). back_orders
-- and invoices mirror that value so they join cleanly to orders.dealer_id.

-- ── Back Orders ──
CREATE TABLE IF NOT EXISTS back_orders (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_line_id  uuid NOT NULL REFERENCES order_lines(id) ON DELETE CASCADE,
  order_id       uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  dealer_id      text NOT NULL,
  part_number    text NOT NULL,
  part_name      text NOT NULL,
  quantity       integer NOT NULL CHECK (quantity > 0),
  original_eta   date,
  current_eta    date,
  status         text NOT NULL DEFAULT 'awaiting'
                 CHECK (status IN ('awaiting', 'in_transit', 'fulfilled', 'cancelled')),
  is_at_risk     boolean NOT NULL DEFAULT false,
  risk_flagged_at timestamptz,
  slippage_days  integer NOT NULL DEFAULT 0,
  resolved_at    timestamptz,
  resolved_via   text,   -- fulfilled | cancelled
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),

  -- One open back-order row per order line. The split engine upserts on this.
  UNIQUE (order_line_id)
);

CREATE INDEX IF NOT EXISTS idx_back_orders_order   ON back_orders(order_id);
CREATE INDEX IF NOT EXISTS idx_back_orders_dealer  ON back_orders(dealer_id);
CREATE INDEX IF NOT EXISTS idx_back_orders_status  ON back_orders(status);
CREATE INDEX IF NOT EXISTS idx_back_orders_at_risk ON back_orders(is_at_risk) WHERE is_at_risk = true;

-- ── Back-Order ETA change history ──
CREATE TABLE IF NOT EXISTS back_order_eta_changes (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  back_order_id uuid NOT NULL REFERENCES back_orders(id) ON DELETE CASCADE,
  previous_eta  date,
  new_eta       date,
  reason        text,
  source        text NOT NULL DEFAULT 'manual',  -- manual | sap_sync | split
  changed_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_boec_back_order ON back_order_eta_changes(back_order_id, changed_at DESC);

-- ── Invoices ──
CREATE TABLE IF NOT EXISTS invoices (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number text UNIQUE NOT NULL,
  order_id       uuid NOT NULL REFERENCES orders(id) ON DELETE RESTRICT,
  dealer_id      text NOT NULL,
  invoice_date   timestamptz NOT NULL DEFAULT now(),
  due_date       timestamptz NOT NULL,
  subtotal       numeric(12,2) NOT NULL DEFAULT 0,
  vat_amount     numeric(12,2) NOT NULL DEFAULT 0,
  total_amount   numeric(12,2) NOT NULL DEFAULT 0,
  currency       text NOT NULL DEFAULT 'EGP',
  status         text NOT NULL DEFAULT 'pending'
                 CHECK (status IN ('pending', 'paid', 'overdue', 'cancelled')),
  delivery_note  text,
  issued_by      uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_invoices_order   ON invoices(order_id);
CREATE INDEX IF NOT EXISTS idx_invoices_dealer  ON invoices(dealer_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status  ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_date    ON invoices(invoice_date DESC);

-- ── Invoice Lines ──
CREATE TABLE IF NOT EXISTS invoice_lines (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id    uuid NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  order_line_id uuid REFERENCES order_lines(id) ON DELETE SET NULL,
  part_number   text NOT NULL,
  part_name     text NOT NULL,
  quantity      integer NOT NULL CHECK (quantity > 0),
  unit_price    numeric(12,2) NOT NULL,
  line_total    numeric(12,2) NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_invoice_lines_invoice ON invoice_lines(invoice_id);

-- ── updated_at triggers (reuse update_updated_at_column from orders migration) ──
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_back_orders_updated_at') THEN
    CREATE TRIGGER trg_back_orders_updated_at
      BEFORE UPDATE ON back_orders
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_invoices_updated_at') THEN
    CREATE TRIGGER trg_invoices_updated_at
      BEFORE UPDATE ON invoices
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END;
$$;

-- ── RLS ──
ALTER TABLE back_orders            ENABLE ROW LEVEL SECURITY;
ALTER TABLE back_order_eta_changes ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices               ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_lines          ENABLE ROW LEVEL SECURITY;

-- Dealers see their own; admins see all. (App reads via service role, which
-- bypasses RLS — these mirror orders for any direct client read path.)
CREATE POLICY "Dealers see own back_orders"
  ON back_orders FOR SELECT
  USING (auth.uid()::text = dealer_id OR auth.jwt() ->> 'role' IN ('admin','super_admin'));

CREATE POLICY "Service role full access back_orders"
  ON back_orders FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "ETA changes follow back_order access"
  ON back_order_eta_changes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM back_orders b
      WHERE b.id = back_order_eta_changes.back_order_id
        AND (b.dealer_id = auth.uid()::text OR auth.jwt() ->> 'role' IN ('admin','super_admin'))
    )
  );

CREATE POLICY "Service role full access back_order_eta_changes"
  ON back_order_eta_changes FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Dealers see own invoices"
  ON invoices FOR SELECT
  USING (auth.uid()::text = dealer_id OR auth.jwt() ->> 'role' IN ('admin','super_admin'));

CREATE POLICY "Service role full access invoices"
  ON invoices FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Invoice lines follow invoice access"
  ON invoice_lines FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM invoices i
      WHERE i.id = invoice_lines.invoice_id
        AND (i.dealer_id = auth.uid()::text OR auth.jwt() ->> 'role' IN ('admin','super_admin'))
    )
  );

CREATE POLICY "Service role full access invoice_lines"
  ON invoice_lines FOR ALL USING (true) WITH CHECK (true);

COMMENT ON TABLE back_orders IS
  'Back-order lines created by the partial-fulfillment split engine. One open row per order_line.';
COMMENT ON TABLE invoices IS
  'Phase 2 invoice headers generated when an admin issues an invoice for an order. Replaces the orders.invoice_number stopgap.';
