import { NextRequest, NextResponse } from "next/server";
import { resolveDealerScope } from "@/lib/auth-guards";
import { getInvoice } from "@/lib/invoices/service";
import { serverError } from "@/lib/api-errors";

/**
 * GET /api/invoices/[id] — invoice detail with lines. Dealers may only read
 * their own invoices.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const scoped = await resolveDealerScope();
  if (scoped instanceof NextResponse) return scoped;

  const { id } = await params;

  try {
    const invoice = await getInvoice(id);
    if (!invoice) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Invoice not found" } },
        { status: 404 }
      );
    }

    if (!scoped.isAdmin && !(scoped.scope ?? []).includes(invoice.dealer_id)) {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Access denied" } },
        { status: 403 }
      );
    }

    return NextResponse.json({ data: invoice });
  } catch (e) {
    return serverError(e, "invoices/[id]");
  }
}
