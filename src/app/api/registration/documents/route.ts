import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/auth-guards";
import { storageError } from "@/lib/api-errors";

/**
 * GET /api/registration/documents?path=registrations/<uid>/<file>
 *
 * Returns a short-lived signed URL for a registration document.
 *
 * Hardening:
 *  - Admin-only. Registration documents are reviewed by admins; previously this
 *    endpoint was unauthenticated AND accepted an arbitrary `path`, allowing any
 *    caller to read any object in the private bucket (IDOR / arbitrary file read).
 *  - The `path` is constrained to the `registrations/` prefix and may not
 *    contain path-traversal sequences.
 */
export async function GET(req: NextRequest) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  const path = new URL(req.url).searchParams.get("path");

  if (!path) {
    return NextResponse.json(
      { error: { code: "MISSING_PATH", message: "Document path is required" } },
      { status: 400 }
    );
  }

  // Path allow-listing: only registration documents, no traversal.
  const normalized = path.replace(/\\/g, "/");
  if (
    !normalized.startsWith("registrations/") ||
    normalized.includes("..") ||
    normalized.includes("//")
  ) {
    return NextResponse.json(
      { error: { code: "INVALID_PATH", message: "Path is not permitted" } },
      { status: 400 }
    );
  }

  const { data, error } = await supabaseAdmin.storage
    .from("dealer-documents")
    .createSignedUrl(normalized, 300);

  if (error || !data?.signedUrl) {
    return storageError(error, "createSignedUrl");
  }

  return NextResponse.json({ data: { url: data.signedUrl } });
}
