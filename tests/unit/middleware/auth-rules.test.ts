/**
 * Test Suite: Auth Middleware Route-Protection Logic
 *
 * We extract the pure decision logic from middleware.ts into testable functions
 * and verify every RBAC rule in isolation — no HTTP server or Supabase needed.
 */

import { describe, it, expect } from "vitest";

// ─── Pure middleware decision functions (mirror the logic in src/middleware.ts) ─

type UserMeta = {
  role?: string;
  registration_status?: string;
};

/**
 * Determines the redirect target for a given path + user state.
 * Returns null if the request should pass through.
 */
function resolveAccess(
  path: string,
  user: { user_metadata: UserMeta } | null,
  isDemoAdmin: boolean
): { redirect: string } | null {
  const PUBLIC_ROUTES = [
    "/",
    "/register",
    "/verify-email",
    "/api/auth/callback",
    "/api/registration",
  ];

  // Public routes — always pass
  const isPublic = PUBLIC_ROUTES.some(
    (r) => path === r || path.startsWith(r + "/")
  );
  if (isPublic) return null;

  // Demo-admin bypass for admin UI and all API routes
  if (isDemoAdmin && (path.startsWith("/dashboard/admin") || path.startsWith("/api/"))) {
    return null;
  }

  // Pending approval is accessible for authenticated but un-approved users
  if (path === "/pending-approval") {
    if (!user) return { redirect: "/" };
    return null;
  }

  // All other protected routes require a session
  if (!user) return { redirect: "/" };

  const { role, registration_status } = user.user_metadata;

  // Admin-only routes
  if (path.startsWith("/dashboard/admin")) {
    if (role !== "admin" && role !== "super_admin") {
      return { redirect: "/dashboard" };
    }
    return null;
  }

  // Dealer portal routes require approved status
  if (
    path.startsWith("/dashboard") ||
    path.startsWith("/parts") ||
    path.startsWith("/orders")
  ) {
    if (registration_status !== "approved") {
      return { redirect: "/pending-approval" };
    }
  }

  return null;
}

// ─── Tests ────────────────────────────────────────────────────────────────────

const pendingUser = { user_metadata: { role: "dealer", registration_status: "pending" } };
const approvedUser = { user_metadata: { role: "dealer", registration_status: "approved" } };
const rejectedUser = { user_metadata: { role: "dealer", registration_status: "rejected" } };
const adminUser = { user_metadata: { role: "admin", registration_status: "approved" } };
const superAdminUser = { user_metadata: { role: "super_admin", registration_status: "approved" } };

describe("Middleware — public routes", () => {
  it("allows unauthenticated access to /", () => {
    expect(resolveAccess("/", null, false)).toBeNull();
  });

  it("allows unauthenticated access to /register", () => {
    expect(resolveAccess("/register", null, false)).toBeNull();
  });

  it("allows access to /api/registration/list (public prefix match)", () => {
    expect(resolveAccess("/api/registration/list", null, false)).toBeNull();
  });

  it("allows access to /api/auth/callback", () => {
    expect(resolveAccess("/api/auth/callback", null, false)).toBeNull();
  });
});

describe("Middleware — unauthenticated access to protected routes", () => {
  it("redirects unauthenticated user from /dashboard to /", () => {
    const result = resolveAccess("/dashboard", null, false);
    expect(result).toEqual({ redirect: "/" });
  });

  it("redirects unauthenticated user from /dashboard/admin to /", () => {
    const result = resolveAccess("/dashboard/admin", null, false);
    expect(result).toEqual({ redirect: "/" });
  });

  it("redirects unauthenticated user from /pending-approval to /", () => {
    const result = resolveAccess("/pending-approval", null, false);
    expect(result).toEqual({ redirect: "/" });
  });
});

describe("Middleware — dealer with pending registration", () => {
  it("blocks pending dealer from /dashboard, redirects to /pending-approval", () => {
    const result = resolveAccess("/dashboard", pendingUser, false);
    expect(result).toEqual({ redirect: "/pending-approval" });
  });

  it("blocks pending dealer from /parts", () => {
    const result = resolveAccess("/parts", pendingUser, false);
    expect(result).toEqual({ redirect: "/pending-approval" });
  });

  it("blocks pending dealer from /orders", () => {
    const result = resolveAccess("/orders/new", pendingUser, false);
    expect(result).toEqual({ redirect: "/pending-approval" });
  });

  it("allows pending dealer to stay on /pending-approval", () => {
    expect(resolveAccess("/pending-approval", pendingUser, false)).toBeNull();
  });
});

describe("Middleware — dealer with rejected registration", () => {
  it("blocks rejected dealer from /dashboard", () => {
    const result = resolveAccess("/dashboard", rejectedUser, false);
    expect(result).toEqual({ redirect: "/pending-approval" });
  });

  it("allows rejected dealer to access /pending-approval (to see rejection reason)", () => {
    expect(resolveAccess("/pending-approval", rejectedUser, false)).toBeNull();
  });
});

describe("Middleware — approved dealer", () => {
  it("allows approved dealer to access /dashboard", () => {
    expect(resolveAccess("/dashboard", approvedUser, false)).toBeNull();
  });

  it("allows approved dealer to access /parts", () => {
    expect(resolveAccess("/parts", approvedUser, false)).toBeNull();
  });

  it("allows approved dealer to access /orders/new", () => {
    expect(resolveAccess("/orders/new", approvedUser, false)).toBeNull();
  });

  it("blocks approved dealer from /dashboard/admin (no admin role)", () => {
    const result = resolveAccess("/dashboard/admin", approvedUser, false);
    expect(result).toEqual({ redirect: "/dashboard" });
  });
});

describe("Middleware — admin role", () => {
  it("allows admin to access /dashboard/admin", () => {
    expect(resolveAccess("/dashboard/admin", adminUser, false)).toBeNull();
  });

  it("allows super_admin to access /dashboard/admin", () => {
    expect(resolveAccess("/dashboard/admin", superAdminUser, false)).toBeNull();
  });

  it("allows admin to access /dashboard/admin/registrations", () => {
    expect(resolveAccess("/dashboard/admin/registrations", adminUser, false)).toBeNull();
  });

  it("blocks a regular approved dealer from /dashboard/admin/dealers", () => {
    const result = resolveAccess("/dashboard/admin/dealers", approvedUser, false);
    expect(result).toEqual({ redirect: "/dashboard" });
  });
});

describe("Middleware — demo-admin bypass", () => {
  it("allows demo-admin cookie to bypass /dashboard/admin without real session", () => {
    expect(resolveAccess("/dashboard/admin", null, true)).toBeNull();
  });

  it("allows demo-admin cookie to bypass /api/dealers", () => {
    expect(resolveAccess("/api/dealers", null, true)).toBeNull();
  });

  it("allows demo-admin cookie to bypass /api/campaigns", () => {
    expect(resolveAccess("/api/campaigns", null, true)).toBeNull();
  });

  it("does NOT grant demo-admin bypass to /dashboard (non-admin path)", () => {
    // demo-admin bypass only covers /dashboard/admin and /api/ paths
    const result = resolveAccess("/dashboard", null, true);
    // no session → should redirect
    expect(result).toEqual({ redirect: "/" });
  });
});
