/**
 * Authorization guard tests (audit item 13).
 *
 * These verify the security fixes: previously-unauthenticated admin endpoints
 * now reject anonymous and non-admin callers, and identity is derived from the
 * session rather than the request body.
 *
 * Strategy: mock the Supabase server/admin clients so we can drive
 * `auth.getUser()` per test and assert the HTTP status the route returns.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Controllable mock of the Supabase session ────────────────────────────────
let mockUser: { id: string; user_metadata: Record<string, unknown> } | null = null;

vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: async () => ({
    auth: {
      getUser: async () => ({ data: { user: mockUser }, error: null }),
    },
    // Used by requireDealerSession (not exercised here, but kept safe)
    from: () => ({
      select: () => ({ eq: () => ({ single: async () => ({ data: null, error: true }) }) }),
    }),
  }),
}));

// Minimal admin-client mock: chainable query builder + storage.
const adminNoop = {
  from: () => {
    const chain: Record<string, unknown> = {};
    const ret = () => chain;
    Object.assign(chain, {
      select: ret,
      insert: ret,
      update: ret,
      delete: ret,
      eq: ret,
      order: ret,
      range: ret,
      ilike: ret,
      maybeSingle: async () => ({ data: null, error: null }),
      single: async () => ({ data: null, error: null }),
      then: undefined,
    });
    return chain;
  },
  storage: { from: () => ({ createSignedUrl: async () => ({ data: null, error: true }) }) },
};
vi.mock("@/lib/supabase/admin", () => ({ supabaseAdmin: adminNoop }));

beforeEach(() => {
  mockUser = null;
});

const ANON = null;
const DEALER = { id: "dealer-uid", user_metadata: { role: "dealer" } };
const ADMIN = { id: "admin-uid", user_metadata: { role: "admin" } };

// ─── auth-guards primitives ───────────────────────────────────────────────────

describe("getAdminUser / requireAdmin", () => {
  it("returns 401 for anonymous callers", async () => {
    const { getAdminUser } = await import("@/lib/auth-guards");
    mockUser = ANON;
    const res = await getAdminUser();
    expect(res).toBeInstanceOf(Response);
    expect((res as Response).status).toBe(401);
  });

  it("returns 403 for non-admin (dealer) callers", async () => {
    const { getAdminUser } = await import("@/lib/auth-guards");
    mockUser = DEALER;
    const res = await getAdminUser();
    expect(res).toBeInstanceOf(Response);
    expect((res as Response).status).toBe(403);
  });

  it("returns the user object for admins", async () => {
    const { getAdminUser } = await import("@/lib/auth-guards");
    mockUser = ADMIN;
    const res = await getAdminUser();
    expect(res).not.toBeInstanceOf(Response);
    expect((res as { id: string }).id).toBe("admin-uid");
  });

  it("requireAdmin returns null (allow) for admins", async () => {
    const { requireAdmin } = await import("@/lib/auth-guards");
    mockUser = ADMIN;
    expect(await requireAdmin()).toBeNull();
  });
});

// ─── Route-level enforcement ──────────────────────────────────────────────────

describe("GET /api/registration/list — admin only", () => {
  it("401 for anonymous", async () => {
    const { GET } = await import("@/app/api/registration/list/route");
    mockUser = ANON;
    const req = new Request("http://localhost/api/registration/list");
    const res = await GET(req as never);
    expect(res.status).toBe(401);
  });

  it("403 for dealer", async () => {
    const { GET } = await import("@/app/api/registration/list/route");
    mockUser = DEALER;
    const req = new Request("http://localhost/api/registration/list");
    const res = await GET(req as never);
    expect(res.status).toBe(403);
  });
});

describe("GET /api/registration/documents — admin only + path allow-list", () => {
  it("401 for anonymous", async () => {
    const { GET } = await import("@/app/api/registration/documents/route");
    mockUser = ANON;
    const req = new Request("http://localhost/api/registration/documents?path=registrations/x/y");
    const res = await GET(req as never);
    expect(res.status).toBe(401);
  });

  it("400 INVALID_PATH for traversal attempts (admin)", async () => {
    const { GET } = await import("@/app/api/registration/documents/route");
    mockUser = ADMIN;
    const req = new Request("http://localhost/api/registration/documents?path=../../secrets/key");
    const res = await GET(req as never);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe("INVALID_PATH");
  });
});

describe("POST /api/orders/[id]/review — admin only, session identity", () => {
  it("401 for anonymous even when body supplies a reviewer_id", async () => {
    const { POST } = await import("@/app/api/orders/[id]/review/route");
    mockUser = ANON;
    const req = new Request("http://localhost/api/orders/o1/review", {
      method: "POST",
      body: JSON.stringify({ action: "approve", reviewer_id: "spoofed-admin" }),
    });
    const res = await POST(req as never, { params: Promise.resolve({ id: "o1" }) });
    expect(res.status).toBe(401);
  });

  it("403 for dealer callers", async () => {
    const { POST } = await import("@/app/api/orders/[id]/review/route");
    mockUser = DEALER;
    const req = new Request("http://localhost/api/orders/o1/review", {
      method: "POST",
      body: JSON.stringify({ action: "approve" }),
    });
    const res = await POST(req as never, { params: Promise.resolve({ id: "o1" }) });
    expect(res.status).toBe(403);
  });
});

describe("POST /api/campaigns — admin only", () => {
  it("401 for anonymous", async () => {
    const { POST } = await import("@/app/api/campaigns/route");
    mockUser = ANON;
    const req = new Request("http://localhost/api/campaigns", {
      method: "POST",
      body: JSON.stringify({ name: "x", start_date: "2026-01-01", end_date: "2026-02-01" }),
    });
    const res = await POST(req as never);
    expect(res.status).toBe(401);
  });

  it("403 for dealer", async () => {
    const { POST } = await import("@/app/api/campaigns/route");
    mockUser = DEALER;
    const req = new Request("http://localhost/api/campaigns", {
      method: "POST",
      body: JSON.stringify({ name: "x", start_date: "2026-01-01", end_date: "2026-02-01" }),
    });
    const res = await POST(req as never);
    expect(res.status).toBe(403);
  });
});
