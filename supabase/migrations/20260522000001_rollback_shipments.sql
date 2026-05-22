-- supabase/migrations/20260522000001_rollback_shipments.sql
--
-- EMERGENCY ROLLBACK MIGRATION
-- This migration removes the entire shipments tracking feature.
-- Use this ONLY if the shipments feature needs to be completely rolled back.
-- This is a destructive migration and cannot be undone without data recovery.
--

-- Drop trigger first (depends on tables)
DROP TRIGGER IF EXISTS shipments_update_audit ON shipments;

-- Drop trigger function
DROP FUNCTION IF EXISTS update_shipments_audit();

-- Drop all RLS policies on shipments table
DROP POLICY IF EXISTS "dealers_view_own_shipments" ON shipments;
DROP POLICY IF EXISTS "users_create_shipments" ON shipments;
DROP POLICY IF EXISTS "users_update_shipments" ON shipments;

-- Drop all RLS policies on shipment_lines table
DROP POLICY IF EXISTS "view_shipment_lines" ON shipment_lines;
DROP POLICY IF EXISTS "create_shipment_lines" ON shipment_lines;

-- Disable RLS on both tables
ALTER TABLE shipments DISABLE ROW LEVEL SECURITY;
ALTER TABLE shipment_lines DISABLE ROW LEVEL SECURITY;

-- Drop all performance indexes
DROP INDEX IF EXISTS idx_shipments_order_id;
DROP INDEX IF EXISTS idx_shipments_created_at;
DROP INDEX IF EXISTS idx_shipments_status;
DROP INDEX IF EXISTS idx_shipments_carrier;
DROP INDEX IF EXISTS idx_shipment_lines_shipment_id;
DROP INDEX IF EXISTS idx_shipment_lines_order_line_id;

-- Drop tables in correct order (shipment_lines first due to foreign key dependency)
DROP TABLE IF EXISTS shipment_lines;
DROP TABLE IF EXISTS shipments;
