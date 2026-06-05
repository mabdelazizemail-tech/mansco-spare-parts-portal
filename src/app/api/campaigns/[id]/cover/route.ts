import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getAdminUser } from "@/lib/auth-guards";
import { dbError, storageError } from "@/lib/api-errors";
import {
  validateCoverFile,
  coverExtension,
  coverObjectPathFromUrl,
} from "@/lib/campaigns/cover-validation";

const BUCKET = "campaign-covers";

// POST /api/campaigns/[id]/cover — upload or replace the cover (admin only)
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await getAdminUser();
  if (admin instanceof NextResponse) return admin;
  const { id } = await params;

  try {
    const formData = await req.formData();
    const file = formData.get("file");

    if (!(file instanceof File) || file.size === 0) {
      return NextResponse.json(
        { error: { code: "MISSING_FILE", message: "A cover image file is required" } },
        { status: 400 }
      );
    }
    const check = validateCoverFile(file);
    if (!check.ok) {
      return NextResponse.json({ error: { code: check.code, message: check.message } }, { status: 400 });
    }

    // Confirm the campaign exists and grab the old cover for cleanup.
    const { data: campaign, error: fetchErr } = await supabaseAdmin
      .from("campaigns")
      .select("id, cover_image_url")
      .eq("id", id)
      .single();
    if (fetchErr || !campaign) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Campaign not found" } },
        { status: 404 }
      );
    }

    const path = `${id}/cover_${Date.now()}.${coverExtension(file.type)}`;
    const { error: uploadError } = await supabaseAdmin.storage
      .from(BUCKET)
      .upload(path, file, { contentType: file.type, upsert: false });
    if (uploadError) return storageError(uploadError, "campaign-cover.upload");

    const { data: pub } = supabaseAdmin.storage.from(BUCKET).getPublicUrl(path);
    const publicUrl = pub.publicUrl;

    const { data: updated, error: updateError } = await supabaseAdmin
      .from("campaigns")
      .update({ cover_image_url: publicUrl, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();
    if (updateError) return dbError(updateError, "campaign-cover.update");

    // Best-effort cleanup of the previous object.
    const oldPath = coverObjectPathFromUrl(campaign.cover_image_url);
    if (oldPath && oldPath !== path) {
      await supabaseAdmin.storage.from(BUCKET).remove([oldPath]);
    }

    await supabaseAdmin.from("campaign_audit_log").insert({
      campaign_id: id,
      action: "cover_updated",
      details: { cover_image_url: publicUrl },
      performed_by: admin.id,
    });

    return NextResponse.json({ data: updated });
  } catch {
    return NextResponse.json(
      { error: { code: "SERVER_ERROR", message: "An unexpected error occurred" } },
      { status: 500 }
    );
  }
}

// DELETE /api/campaigns/[id]/cover — remove the cover (admin only)
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await getAdminUser();
  if (admin instanceof NextResponse) return admin;
  const { id } = await params;

  try {
    const { data: campaign, error: fetchErr } = await supabaseAdmin
      .from("campaigns")
      .select("id, cover_image_url")
      .eq("id", id)
      .single();
    if (fetchErr || !campaign) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Campaign not found" } },
        { status: 404 }
      );
    }

    const path = coverObjectPathFromUrl(campaign.cover_image_url);
    if (path) await supabaseAdmin.storage.from(BUCKET).remove([path]);

    const { data: updated, error: updateError } = await supabaseAdmin
      .from("campaigns")
      .update({ cover_image_url: null, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();
    if (updateError) return dbError(updateError, "campaign-cover.delete");

    await supabaseAdmin.from("campaign_audit_log").insert({
      campaign_id: id,
      action: "cover_removed",
      details: {},
      performed_by: admin.id,
    });

    return NextResponse.json({ data: updated });
  } catch {
    return NextResponse.json(
      { error: { code: "SERVER_ERROR", message: "An unexpected error occurred" } },
      { status: 500 }
    );
  }
}
