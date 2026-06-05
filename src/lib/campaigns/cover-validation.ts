/** Allowed cover image MIME types. */
export const ALLOWED_COVER_MIME = new Set(["image/jpeg", "image/png", "image/webp"]);

/** Maximum cover image size: 5 MB. */
export const MAX_COVER_BYTES = 5 * 1024 * 1024;

export type CoverValidation =
  | { ok: true }
  | {
      ok: false;
      code: "MISSING_FILE" | "INVALID_FILE_TYPE" | "FILE_TOO_LARGE";
      message: string;
    };

/** Validate a cover file's MIME type and size. Pure — safe to use on client and server. */
export function validateCoverFile(
  file: { type: string; size: number } | null | undefined
): CoverValidation {
  if (!file || file.size === 0) {
    return { ok: false, code: "MISSING_FILE", message: "A cover image file is required" };
  }
  if (!ALLOWED_COVER_MIME.has(file.type)) {
    return { ok: false, code: "INVALID_FILE_TYPE", message: "Only JPG, PNG, or WEBP images are allowed" };
  }
  if (file.size > MAX_COVER_BYTES) {
    return { ok: false, code: "FILE_TOO_LARGE", message: "Cover image exceeds the 5 MB limit" };
  }
  return { ok: true };
}

/** File extension for a validated cover MIME type. */
export function coverExtension(type: string): string {
  if (type === "image/png") return "png";
  if (type === "image/webp") return "webp";
  return "jpg";
}

/** Derive the in-bucket object path from a public campaign-covers URL (for cleanup). */
export function coverObjectPathFromUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  const marker = "/campaign-covers/";
  const i = url.indexOf(marker);
  return i === -1 ? null : url.slice(i + marker.length);
}
