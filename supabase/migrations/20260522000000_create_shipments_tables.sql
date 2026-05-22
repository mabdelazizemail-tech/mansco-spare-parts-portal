-- supabase/migrations/20260522000000_create_shipments_tables.sql

-- Create shipments table
CREATE TABLE shipments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE RESTRICT,
  shipment_number TEXT NOT NULL UNIQUE,
  carrier_code TEXT NOT NULL CHECK (carrier_code IN ('dhl', 'fedex', 'mansco', 'other')),
  carrier_name TEXT,
  tracking_number TEXT,
  awb_number TEXT,
  dhl_reference TEXT,
  shipment_status TEXT NOT NULL DEFAULT 'pending' CHECK (
    shipment_status IN ('pending', 'packed', 'shipped', 'in_transit', 'delivered', 'exception', 'returned', 'cancelled')
  ),
  ship_date DATE,
  eta_delivery DATE,
  actual_delivery_date DATE,
  shipment_type TEXT NOT NULL DEFAULT 'manual' CHECK (shipment_type IN ('manual', 'auto_invoice')),
  notes TEXT,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_by UUID NOT NULL REFERENCES auth.users(id),

  CONSTRAINT tracking_ref_required CHECK (
    tracking_number IS NOT NULL OR awb_number IS NOT NULL OR dhl_reference IS NOT NULL
  )
);

-- Create shipment_lines table
CREATE TABLE shipment_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id UUID NOT NULL REFERENCES shipments(id) ON DELETE CASCADE,
  order_line_id UUID NOT NULL,
  shipped_qty INTEGER NOT NULL CHECK (shipped_qty > 0),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

  UNIQUE(shipment_id, order_line_id)
);

-- Create indexes for performance
CREATE INDEX idx_shipments_order_id ON shipments(order_id);
CREATE INDEX idx_shipments_created_at ON shipments(created_at DESC);
CREATE INDEX idx_shipments_status ON shipments(shipment_status);
CREATE INDEX idx_shipments_carrier ON shipments(carrier_code);
CREATE INDEX idx_shipment_lines_shipment_id ON shipment_lines(shipment_id);
CREATE INDEX idx_shipment_lines_order_line_id ON shipment_lines(order_line_id);

-- Enable RLS (Row Level Security)
ALTER TABLE shipments ENABLE ROW LEVEL SECURITY;
ALTER TABLE shipment_lines ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Dealers see own orders' shipments; admins see all
CREATE POLICY "dealers_view_own_shipments" ON shipments
  FOR SELECT USING (
    (auth.jwt() ->> 'role' = 'admin') OR
    (auth.jwt() ->> 'role' = 'super_admin') OR
    (order_id IN (SELECT id FROM orders WHERE dealer_id = (
      SELECT dealer_id FROM dealers WHERE supabase_uid = auth.uid()
    )))
  );

CREATE POLICY "admins_view_all_shipments" ON shipments
  FOR SELECT USING (
    (auth.jwt() ->> 'role' = 'admin') OR
    (auth.jwt() ->> 'role' = 'super_admin')
  );

CREATE POLICY "users_create_shipments" ON shipments
  FOR INSERT WITH CHECK (created_by = auth.uid());

CREATE POLICY "users_update_shipments" ON shipments
  FOR UPDATE USING (
    (auth.jwt() ->> 'role' = 'admin') OR
    (auth.jwt() ->> 'role' = 'super_admin') OR
    (order_id IN (SELECT id FROM orders WHERE dealer_id = (
      SELECT dealer_id FROM dealers WHERE supabase_uid = auth.uid()
    )))
  );

-- RLS for shipment_lines: inherit from shipments
CREATE POLICY "view_shipment_lines" ON shipment_lines
  FOR SELECT USING (shipment_id IN (SELECT id FROM shipments));

CREATE POLICY "create_shipment_lines" ON shipment_lines
  FOR INSERT WITH CHECK (shipment_id IN (SELECT id FROM shipments));
