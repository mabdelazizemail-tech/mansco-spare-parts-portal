import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/auth-guards";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  const { id } = await params;
  try {
    const { data, error } = await supabaseAdmin
      .from("dealers")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Dealer not found" } },
        { status: 404 }
      );
    }

    return NextResponse.json({ data });
  } catch {
    return NextResponse.json(
      { error: { code: "SERVER_ERROR", message: "An unexpected error occurred" } },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  const { id } = await params;
  try {
    const body = await req.json();

    // Only allow updating specific fields
    const allowedFields: Record<string, unknown> = {};
    const editable = [
      "company_name",
      "contact_person",
      "phone",
      "tax_id",
      "branch_address",
      "dealer_type",
      "parent_dealer_code",
      "credit_limit",
      "overdue_balance",
      "financial_status",
      "is_active",
    ];

    for (const key of editable) {
      if (body[key] !== undefined) {
        allowedFields[key] = body[key];
      }
    }

    if (Object.keys(allowedFields).length === 0) {
      return NextResponse.json(
        { error: { code: "NO_FIELDS", message: "No valid fields to update" } },
        { status: 400 }
      );
    }

    allowedFields.updated_at = new Date().toISOString();

    const { data, error } = await supabaseAdmin
      .from("dealers")
      .update(allowedFields)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { error: { code: "DB_ERROR", message: error.message } },
        { status: 500 }
      );
    }

    return NextResponse.json({ data });
  } catch {
    return NextResponse.json(
      { error: { code: "SERVER_ERROR", message: "An unexpected error occurred" } },
      { status: 500 }
    );
  }
}
