import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Public PAGE routes (prefix match is acceptable — these have no protected children).
const PUBLIC_PAGE_PREFIXES = ["/register", "/verify-email", "/forgot-password", "/reset-password"];

// Public routes that must match EXACTLY. Critically, "/api/registration" is the
// public dealer-signup POST only — its sub-paths (/list, /[id]/review,
// /documents) are NOT public and self-guard with requireAdmin.
const PUBLIC_EXACT = ["/", "/api/auth/callback", "/api/registration"];

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const path = request.nextUrl.pathname;

  const isPublic =
    PUBLIC_EXACT.includes(path) ||
    PUBLIC_PAGE_PREFIXES.some((route) => path === route || path.startsWith(route + "/"));
  if (isPublic) {
    return supabaseResponse;
  }

  const { data: { user } } = await supabase.auth.getUser();

  if (path === "/pending-approval" || path === "/suspended") {
    if (!user) {
      return NextResponse.redirect(new URL("/", request.url));
    }
    return supabaseResponse;
  }

  if (!user) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  const approvalStatus = user.user_metadata?.registration_status;
  const role = user.user_metadata?.role;

  const isAdmin = role === "admin" || role === "super_admin";

  if (path.startsWith("/dashboard/admin")) {
    if (!isAdmin) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
    return supabaseResponse;
  }

  // Admin landing on the dealer dashboard root → send to admin dashboard
  if (isAdmin && (path === "/dashboard" || path === "/dashboard/")) {
    return NextResponse.redirect(new URL("/dashboard/admin", request.url));
  }

  // Suspended users are blocked from everything
  if (approvalStatus === "suspended") {
    return NextResponse.redirect(new URL("/suspended", request.url));
  }

  // Dealers (non-admins) must be approved to access dealer routes
  if (!isAdmin && (path.startsWith("/dashboard") || path.startsWith("/parts") || path.startsWith("/orders"))) {
    if (approvalStatus !== "approved") {
      return NextResponse.redirect(new URL("/pending-approval", request.url));
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
