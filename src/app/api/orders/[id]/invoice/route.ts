import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";

/**
 * POST /api/orders/[id]/invoice — issue an invoice for an existing order.
 *
 * Only admin/super_admin may call this. The order must be in a status that
 * is eligible to be invoiced (approved, done, or partial). The endpoint
 * generates an INV-YYYY-NNNN number if one isn't supplied, stamps
 * invoice_date and invoiced_by, and transitions the order status to
 * "invoiced".
 *
 * Body (optional):
 *   { invoice_number?: string }   // admin can override the auto-generated number
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Admin gate (inline so we can capture the admin's UID for invoiced_by).
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json(
      { error: { code: "UNAUTHENTICATED", message: "Sign in required" } },
      { status: 401 }
    );
  }
  const role = user.user_metadata?.role;
  if (role !== "admin" && role !== "super_admin") {
    return NextResponse.json(
      { error: { code: "FORBIDDEN", message: "Admin access required" } },
      { status: 403 }
    );
  }

  const { id } = await params;

  let body: { invoice_number?: string } = {};
  try {
    body = await req.json();
  } catch {
    // empty body is fine — we'll auto-generate the invoice number
  }

  try {
    // 1. Load the order and verify it's invoiceable.
    const { data: order, error: fetchError } = await supabaseAdmin
      .from("orders")
      .select(
        "id, order_number, status, dealer_id, total_amount, invoice_number, invoice_date"
      )
      .eq("id", id)
      .single();

    if (fetchError || !order) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Order not found" } },
        { status: 404 }
      );
    }

    if (order.invoice_number) {
      return NextResponse.json(
        {
          error: {
            code: "ALREADY_INVOICED",
            message: `Order already invoiced as ${order.invoice_number}`,
          },
        },
        { status: 409 }
      );
    }

    const eligibleStatuses = ["approved", "done", "partial"];
    if (!eligibleStatuses.includes(order.status)) {
      return NextResponse.json(
        {
          error: {
            code: "INVALID_STATUS",
            message: `Cannot invoice order in status '${order.status}'. Order must be approved, done, or partial.`,
          },
        },
        { status: 400 }
      );
    }

    // 2. Generate an invoice number if none was supplied. Format:
    //    INV-{YEAR}-{sequence padded to 4 digits}. Sequence is derived from
    //    the count of existing invoices this year — good enough for Phase 1.
    let invoiceNumber = body.invoice_number?.trim();
    if (!invoiceNumber) {
      const year = new Date().getFullYear();
      const { count } = await supabaseAdmin
        .from("orders")
        .select("id", { count: "exact", head: true })
        .not("invoice_number", "is", null)
        .gte("invoice_date", `${year}-01-01`)
        .lt("invoice_date", `${year + 1}-01-01`);
      const seq = (count ?? 0) + 1;
      invoiceNumber = `INV-${year}-${String(seq).padStart(4, "0")}`;
    } else {
      // If admin supplied one, make sure it isn't already taken.
      const { data: existing } = await supabaseAdmin
        .from("orders")
        .select("id")
        .eq("invoice_number", invoiceNumber)
        .maybeSingle();
      if (existing) {
        return NextResponse.json(
          {
            error: {
              code: "DUPLICATE_INVOICE_NUMBER",
              message: `Invoice number ${invoiceNumber} is already in use`,
            },
          },
          { status: 409 }
        );
      }
    }

    // 3. Stamp the invoice fields and move order to "invoiced".
    const nowIso = new Date().toISOString();
    const { data: updated, error: updateError } = await supabaseAdmin
      .from("orders")
      .update({
        invoice_number: invoiceNumber,
        invoice_date: nowIso,
        invoiced_by: user.id,
        status: "invoiced",
        updated_at: nowIso,
      })
      .eq("id", id)
      .select("id, order_number, invoice_number, invoice_date, status")
      .single();

    if (updateError) {
      return NextResponse.json(
        { error: { code: "DB_ERROR", message: updateError.message } },
        { status: 500 }
      );
    }

    // 4. Best-effort timeline entry so the order detail page shows the event.
    try {
      await supabaseAdmin.from("order_timeline").insert({
        order_id: id,
        event: "Invoice issued",
        status: "invoiced",
        actor: user.id,
        notes: `Invoice ${invoiceNumber} issued`,
      });
    } catch {
      // non-fatal
    }

    return NextResponse.json({ data: updated });
  } catch (e) {
    return NextResponse.json(
      {
        error: {
          code: "SERVER_ERROR",
          message: e instanceof Error ? e.message : "Unexpected error",
        },
      },
      { status: 500 }
    );
  }
}
