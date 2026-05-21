import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { dealerRegistrationSchema } from "@/lib/validators/registration";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();

    // FIX (G2): Apply the Zod schema instead of manual field presence checks.
    // Build a plain object from formData for Zod (excluding File fields).
    const textFields = {
      email: formData.get("email"),
      password: formData.get("password"),
      confirm_password: formData.get("confirm_password"),
      company_name: formData.get("company_name"),
      contact_person: formData.get("contact_person"),
      phone: formData.get("phone"),
      tax_id: formData.get("tax_id"),
      commercial_register_number: formData.get("commercial_register_number"),
      branch_address: formData.get("branch_address"),
      dealer_type_requested: formData.get("dealer_type_requested"),
      parent_dealer_code: formData.get("parent_dealer_code") || undefined,
    };

    const parsed = dealerRegistrationSchema.safeParse(textFields);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "Validation failed",
            details: parsed.error.flatten(),
          },
        },
        { status: 400 }
      );
    }

    const {
      email,
      password,
      company_name,
      contact_person,
      phone,
      tax_id,
      commercial_register_number,
      branch_address,
      dealer_type_requested,
      parent_dealer_code,
    } = parsed.data;

    // Step 1: Create the user via admin API (accepts any email, no deliverability check)
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: false,
      user_metadata: {
        role: "dealer",
        registration_status: "pending",
        company_name,
        contact_person,
        dealer_type: dealer_type_requested,
      },
    });

    if (authError) {
      if (authError.message.includes("already registered")) {
        return NextResponse.json(
          { error: { code: "EMAIL_EXISTS", message: "This email is already registered" } },
          { status: 409 }
        );
      }
      return NextResponse.json(
        { error: { code: "AUTH_ERROR", message: authError.message } },
        { status: 500 }
      );
    }

    const userId = authData.user.id;

    // Step 2: Trigger verification email.
    // admin.createUser() does NOT send emails. We use the anon client's resend()
    // to trigger Supabase's built-in email service to send the confirmation email.
    const { createClient } = await import("@supabase/supabase-js");
    const anonClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );
    const { error: resendError } = await anonClient.auth.resend({
      type: "signup",
      email,
      options: {
        emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/api/auth/callback`,
      },
    });
    if (resendError) {
      console.warn("Email verification resend failed:", resendError.message);
    }

    const documentUrls: Record<string, string> = {};
    for (const docField of ["trade_license", "tax_card", "commercial_register_doc"]) {
      const file = formData.get(docField) as File | null;
      if (file && file.size > 0) {
        const filePath = `registrations/${userId}/${docField}_${Date.now()}`;
        const { error: uploadError } = await supabaseAdmin.storage
          .from("dealer-documents")
          .upload(filePath, file);
        if (!uploadError) documentUrls[docField] = filePath;
      }
    }

    const { error: insertError } = await supabaseAdmin
      .from("dealer_registrations")
      .insert({
        supabase_uid: userId,
        email,
        company_name,
        contact_person,
        phone,
        tax_id,
        commercial_register_number,
        branch_address,
        dealer_type_requested: dealer_type_requested,
        parent_dealer_code: parent_dealer_code || null,
        documents_uploaded: documentUrls,
        review_status: "pending",
        submitted_at: new Date().toISOString(),
      });

    if (insertError) {
      return NextResponse.json(
        { error: { code: "DB_ERROR", message: "Failed to save registration. Please try again." } },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { data: { message: "Registration submitted. Please verify your email." } },
      { status: 201 }
    );
  } catch {
    return NextResponse.json(
      { error: { code: "SERVER_ERROR", message: "An unexpected error occurred" } },
      { status: 500 }
    );
  }
}
