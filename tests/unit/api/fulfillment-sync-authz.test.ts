/**
 * Authorization + validation tests for the Module 6/9 API surface
 * (fulfillment + SAP sync). Mirrors tests/unit/api/authz-guards.test.ts:
 * mock the Supabase clients, drive auth.getUser() per test, assert HTTP status.
 *
 * Focus = the security-critical gating (anon/dealer rejected on admin routes,
 * anon rejected on dealer-scoped routes) plus request validation that fires
 * before any DB work. Full data-path behavior is covered by live integration
 * tests separately.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

let mockUser: { id: string; user_metadata: Record<string, unknown> } | null = null;

// Server client: controllable session + a dealer lookup that resolves a row
// (so resolveDealerScope produces a scope for dealer-role callers).
vi.mock("@/lib/supabase/server", () => {
  const makeChain = () => {
    const chain: Record<string, unknown> = {};
    const ret = () => chain;
    Object.assign(chain, {
      select: ret, eq: ret, order: ret, range: ret, limit: ret,
      maybeSingle: async () => ({ data: { id: "dealer-uuid", code: "DLR-001" }, error: null }),
      single: async () => ({ data: { id: "dealer-uuid", code: "DLR-001" }, error: null }),
    });
    return chain;
  };
  return {
    createServerSupabaseClient: async () => ({
      auth: { getUser: async () => ({ data: { user: mockUser }, error: null }) },
      from: makeChain,
    }),
  };
});

// Admin (service-role) client: every query is chainable and awaitable, resolving
// to an empty result so admin code paths don't throw.
vi.mock("@/lib/supabase/admin", () => {
  const result = { data: [], count: 0, error: null };
  const makeChain = (): unknown =>
    new Proxy(
      {},
      {
        get(_t, prop) {
          if (prop === "then") return (resolve: (v: unknown) => void) => resolve(result);
          if (prop === "maybeSingle" || prop === "single") return async () => ({ data: null, error: null });
          return () => makeChain();
        },
      }
    );
  return { supabaseAdmin: { from: () => makeChain(), storage: { from: () => ({}) } } };
});

beforeEach(() => {
  mockUser = null;
});

const ANON = null;
const DEALER = { id: "dealer-uid", user_metadata: { role: "dealer" } };
const ADMIN = { id: "admin-uid", user_metadata: { role: "admin" } };

const params = (id: string) => ({ params: Promise.resolve({ id }) });

// ─── Admin-only SAP sync routes ───────────────────────────────────────────────

describe("POST /api/sync/invoices — admin only", () => {
  it("401 for anonymous", async () => {
    const { POST } = await import("@/app/api/sync/invoices/route");
    mockUser = ANON;
    const req = new Request("http://localhost/api/sync/invoices", { method: "POST", body: "{}" });
    expect((await POST(req as never)).status).toBe(401);
  });
  it("403 for dealer", async () => {
    const { POST } = await import("@/app/api/sync/invoices/route");
    mockUser = DEALER;
    const req = new Request("http://localhost/api/sync/invoices", { method: "POST", body: "{}" });
    expect((await POST(req as never)).status).toBe(403);
  });
  it("400 for admin with missing file_name/csv_content", async () => {
    const { POST } = await import("@/app/api/sync/invoices/route");
    mockUser = ADMIN;
    const req = new Request("http://localhost/api/sync/invoices", { method: "POST", body: JSON.stringify({}) });
    const res = await POST(req as never);
    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe("VALIDATION_ERROR");
  });
});

describe("POST /api/sync/orders-export — admin only", () => {
  it("401 for anonymous", async () => {
    const { POST } = await import("@/app/api/sync/orders-export/route");
    mockUser = ANON;
    const req = new Request("http://localhost/api/sync/orders-export", { method: "POST", body: "{}" });
    expect((await POST(req as never)).status).toBe(401);
  });
  it("403 for dealer", async () => {
    const { POST } = await import("@/app/api/sync/orders-export/route");
    mockUser = DEALER;
    const req = new Request("http://localhost/api/sync/orders-export", { method: "POST", body: "{}" });
    expect((await POST(req as never)).status).toBe(403);
  });
});

describe("GET /api/sync/status — admin only", () => {
  it("401 for anonymous", async () => {
    const { GET } = await import("@/app/api/sync/status/route");
    mockUser = ANON;
    expect((await GET()).status).toBe(401);
  });
  it("403 for dealer", async () => {
    const { GET } = await import("@/app/api/sync/status/route");
    mockUser = DEALER;
    expect((await GET()).status).toBe(403);
  });
});

// ─── Admin-only back-order mutations + queues ─────────────────────────────────

describe("PUT /api/backorders/[id]/eta — admin only", () => {
  it("401 for anonymous", async () => {
    const { PUT } = await import("@/app/api/backorders/[id]/eta/route");
    mockUser = ANON;
    const req = new Request("http://localhost/api/backorders/b1/eta", { method: "PUT", body: JSON.stringify({ current_eta: "2026-07-01" }) });
    expect((await PUT(req as never, params("b1"))).status).toBe(401);
  });
  it("403 for dealer", async () => {
    const { PUT } = await import("@/app/api/backorders/[id]/eta/route");
    mockUser = DEALER;
    const req = new Request("http://localhost/api/backorders/b1/eta", { method: "PUT", body: JSON.stringify({ current_eta: "2026-07-01" }) });
    expect((await PUT(req as never, params("b1"))).status).toBe(403);
  });
  it("400 for admin with an invalid date", async () => {
    const { PUT } = await import("@/app/api/backorders/[id]/eta/route");
    mockUser = ADMIN;
    const req = new Request("http://localhost/api/backorders/b1/eta", { method: "PUT", body: JSON.stringify({ current_eta: "not-a-date" }) });
    const res = await PUT(req as never, params("b1"));
    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe("VALIDATION_ERROR");
  });
});

describe("POST /api/backorders/[id]/cancel — admin only", () => {
  it("401 for anonymous", async () => {
    const { POST } = await import("@/app/api/backorders/[id]/cancel/route");
    mockUser = ANON;
    expect((await POST(new Request("http://localhost/x", { method: "POST" }) as never, params("b1"))).status).toBe(401);
  });
  it("403 for dealer", async () => {
    const { POST } = await import("@/app/api/backorders/[id]/cancel/route");
    mockUser = DEALER;
    expect((await POST(new Request("http://localhost/x", { method: "POST" }) as never, params("b1"))).status).toBe(403);
  });
});

describe("GET /api/backorders/at-risk — admin only", () => {
  it("401 for anonymous", async () => {
    const { GET } = await import("@/app/api/backorders/at-risk/route");
    mockUser = ANON;
    expect((await GET(new Request("http://localhost/x") as never)).status).toBe(401);
  });
  it("403 for dealer", async () => {
    const { GET } = await import("@/app/api/backorders/at-risk/route");
    mockUser = DEALER;
    expect((await GET(new Request("http://localhost/x") as never)).status).toBe(403);
  });
});

describe("GET /api/admin/fulfillment/overview — admin only", () => {
  it("401 for anonymous", async () => {
    const { GET } = await import("@/app/api/admin/fulfillment/overview/route");
    mockUser = ANON;
    expect((await GET()).status).toBe(401);
  });
  it("403 for dealer", async () => {
    const { GET } = await import("@/app/api/admin/fulfillment/overview/route");
    mockUser = DEALER;
    expect((await GET()).status).toBe(403);
  });
  it("200 for admin", async () => {
    const { GET } = await import("@/app/api/admin/fulfillment/overview/route");
    mockUser = ADMIN;
    expect((await GET()).status).toBe(200);
  });
});

// ─── Dealer-scoped list routes ────────────────────────────────────────────────

describe("dealer-scoped GET routes reject anonymous, allow admin", () => {
  it("GET /api/backorders → 401 anon, 200 admin", async () => {
    const { GET } = await import("@/app/api/backorders/route");
    mockUser = ANON;
    expect((await GET(new NextRequest("http://localhost/api/backorders"))).status).toBe(401);
    mockUser = ADMIN;
    expect((await GET(new NextRequest("http://localhost/api/backorders"))).status).toBe(200);
  });

  it("GET /api/invoices → 401 anon, 200 admin", async () => {
    const { GET } = await import("@/app/api/invoices/route");
    mockUser = ANON;
    expect((await GET(new NextRequest("http://localhost/api/invoices"))).status).toBe(401);
    mockUser = ADMIN;
    expect((await GET(new NextRequest("http://localhost/api/invoices"))).status).toBe(200);
  });

  it("GET /api/inquiries → 401 anon, 200 admin", async () => {
    const { GET } = await import("@/app/api/inquiries/route");
    mockUser = ANON;
    expect((await GET(new NextRequest("http://localhost/api/inquiries"))).status).toBe(401);
    mockUser = ADMIN;
    expect((await GET(new NextRequest("http://localhost/api/inquiries"))).status).toBe(200);
  });
});
