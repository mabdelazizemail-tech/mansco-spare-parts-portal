import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Service-role Supabase client.
 *
 * Lazily instantiated on first property access so that:
 *   - Module-load (e.g. `next build` page-data collection on a preview
 *     environment without env vars) does NOT throw "supabaseUrl is required".
 *   - Actual runtime calls (`supabaseAdmin.from(...)`) construct the client
 *     and fail with the original error only if env vars are missing at request
 *     time — when the failure is meaningful and observable.
 *
 * Existing call sites use this as a plain client (`supabaseAdmin.from(...)`).
 * The Proxy preserves that ergonomics with zero migration.
 */
let cached: SupabaseClient | null = null;

function getClient(): SupabaseClient {
  if (cached) return cached;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "Supabase env vars missing: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required at runtime.",
    );
  }
  cached = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  return cached;
}

export const supabaseAdmin: SupabaseClient = new Proxy({} as SupabaseClient, {
  get(_target, prop, receiver) {
    const client = getClient();
    const value = Reflect.get(client, prop, receiver);
    return typeof value === "function" ? value.bind(client) : value;
  },
});
