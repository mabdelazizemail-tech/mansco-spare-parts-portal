// Vitest global setup.
// Provide dummy Supabase env so modules that construct a client at import time
// (e.g. src/lib/supabase/admin.ts) don't throw during unit/integration tests.
process.env.NEXT_PUBLIC_SUPABASE_URL ||= "https://example.supabase.co";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||= "dummy-anon-key";
process.env.SUPABASE_SERVICE_ROLE_KEY ||= "dummy-service-role-key";
process.env.NEXT_PUBLIC_APP_URL ||= "http://localhost:3000";
