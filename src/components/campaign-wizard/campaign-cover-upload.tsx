"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { ImagePlus, Loader2, Trash2, AlertCircle } from "lucide-react";
import { validateCoverFile } from "@/lib/campaigns/cover-validation";

interface CampaignCoverUploadProps {
  /** Current saved cover URL (edit mode) or null. */
  initialUrl?: string | null;
  /**
   * When set, the component uploads/removes immediately against
   * /api/campaigns/[id]/cover (edit mode). When omitted, it works in deferred
   * mode and reports the chosen File via onFileSelected (create/wizard mode).
   */
  campaignId?: string;
  /** Deferred mode only: receives the chosen File, or null when cleared. */
  onFileSelected?: (file: File | null) => void;
}

export default function CampaignCoverUpload({
  initialUrl = null,
  campaignId,
  onFileSelected,
}: CampaignCoverUploadProps) {
  const immediate = Boolean(campaignId);
  const inputRef = useRef<HTMLInputElement>(null);
  const [savedUrl, setSavedUrl] = useState<string | null>(initialUrl);
  const [localPreview, setLocalPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  // Revoke object URLs to avoid leaks.
  useEffect(() => {
    return () => {
      if (localPreview) URL.revokeObjectURL(localPreview);
    };
  }, [localPreview]);

  const preview = localPreview ?? savedUrl;

  const handleSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-selecting the same file
    if (!file) return;

    const check = validateCoverFile(file);
    if (!check.ok) {
      setErr(check.message);
      return;
    }
    setErr("");

    if (!immediate) {
      // Deferred: keep a local preview and hand the File to the parent.
      if (localPreview) URL.revokeObjectURL(localPreview);
      setLocalPreview(URL.createObjectURL(file));
      onFileSelected?.(file);
      return;
    }

    // Immediate: upload now.
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(`/api/campaigns/${campaignId}/cover`, { method: "POST", body: fd });
      const body = await res.json();
      if (!res.ok) throw new Error(body?.error?.message || "Upload failed");
      setSavedUrl(body.data.cover_image_url ?? null);
      if (localPreview) {
        URL.revokeObjectURL(localPreview);
        setLocalPreview(null);
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  };

  const handleRemove = async () => {
    setErr("");
    if (!immediate) {
      if (localPreview) URL.revokeObjectURL(localPreview);
      setLocalPreview(null);
      setSavedUrl(null);
      onFileSelected?.(null);
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(`/api/campaigns/${campaignId}/cover`, { method: "DELETE" });
      const body = await res.json();
      if (!res.ok) throw new Error(body?.error?.message || "Remove failed");
      setSavedUrl(null);
      if (localPreview) {
        URL.revokeObjectURL(localPreview);
        setLocalPreview(null);
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Remove failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-2">
      <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={handleSelect} className="hidden" />

      {preview ? (
        <div className="relative h-40 w-full overflow-hidden rounded-lg border border-[#2A2A2A] bg-[#0D0D0D]">
          <Image src={preview} alt="Campaign cover" fill sizes="(max-width: 1024px) 100vw, 640px" className="object-cover" unoptimized={Boolean(localPreview)} />
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
          <div className="absolute bottom-2 right-2 flex gap-2">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={busy}
              className="flex items-center gap-1.5 rounded-md bg-black/60 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur transition hover:bg-black/80 disabled:opacity-50"
            >
              {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ImagePlus className="h-3.5 w-3.5" />}
              Replace
            </button>
            <button
              type="button"
              onClick={handleRemove}
              disabled={busy}
              className="flex items-center gap-1.5 rounded-md bg-black/60 px-3 py-1.5 text-xs font-semibold text-red-300 backdrop-blur transition hover:bg-black/80 disabled:opacity-50"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Remove
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          className="flex h-40 w-full flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-[#2A2A2A] bg-[#0D0D0D] text-white/40 transition hover:border-[#00BFA6]/40 hover:text-[#00BFA6] disabled:opacity-50"
        >
          {busy ? <Loader2 className="h-6 w-6 animate-spin" /> : <ImagePlus className="h-6 w-6" />}
          <span className="text-sm font-semibold">Add cover image</span>
          <span className="text-[11px] text-white/30">JPG, PNG, or WEBP · ≤ 5 MB · 16:9 recommended</span>
        </button>
      )}

      {err && (
        <p className="flex items-center gap-1.5 text-xs text-red-400">
          <AlertCircle className="h-3.5 w-3.5" /> {err}
        </p>
      )}
    </div>
  );
}
