import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function GET(req: NextRequest) {
  const path = req.nextUrl.searchParams.get("path");

  if (!path) {
    return NextResponse.json(
      { error: { code: "MISSING_PATH", message: "Document path is required" } },
      { status: 400 }
    );
  }

  const { data, error } = await supabaseAdmin.storage
    .from("dealer-documents")
    .createSignedUrl(path, 300);

  if (error || !data?.signedUrl) {
    return NextResponse.json(
      { error: { code: "STORAGE_ERROR", message: error?.message || "Failed to generate URL" } },
      { status: 500 }
    );
  }

  return NextResponse.json({ data: { url: data.signedUrl } });
}
