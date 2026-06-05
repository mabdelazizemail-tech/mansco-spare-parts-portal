import { describe, it, expect } from "vitest";
import {
  validateCoverFile,
  coverExtension,
  coverObjectPathFromUrl,
  MAX_COVER_BYTES,
} from "@/lib/campaigns/cover-validation";

describe("validateCoverFile", () => {
  it("accepts jpeg, png, webp under the size cap", () => {
    expect(validateCoverFile({ type: "image/jpeg", size: 1000 }).ok).toBe(true);
    expect(validateCoverFile({ type: "image/png", size: 1000 }).ok).toBe(true);
    expect(validateCoverFile({ type: "image/webp", size: 1000 }).ok).toBe(true);
  });

  it("rejects a missing/empty file", () => {
    expect(validateCoverFile(null)).toMatchObject({ ok: false, code: "MISSING_FILE" });
    expect(validateCoverFile({ type: "image/png", size: 0 })).toMatchObject({ ok: false, code: "MISSING_FILE" });
  });

  it("rejects disallowed MIME types", () => {
    expect(validateCoverFile({ type: "image/gif", size: 1000 })).toMatchObject({ ok: false, code: "INVALID_FILE_TYPE" });
    expect(validateCoverFile({ type: "application/pdf", size: 1000 })).toMatchObject({ ok: false, code: "INVALID_FILE_TYPE" });
  });

  it("rejects files over the size cap", () => {
    expect(validateCoverFile({ type: "image/png", size: MAX_COVER_BYTES + 1 })).toMatchObject({ ok: false, code: "FILE_TOO_LARGE" });
  });
});

describe("coverExtension", () => {
  it("maps MIME to a file extension", () => {
    expect(coverExtension("image/png")).toBe("png");
    expect(coverExtension("image/webp")).toBe("webp");
    expect(coverExtension("image/jpeg")).toBe("jpg");
  });
});

describe("coverObjectPathFromUrl", () => {
  it("extracts the in-bucket path from a public URL", () => {
    const url = "https://ref.supabase.co/storage/v1/object/public/campaign-covers/abc/cover_123.jpg";
    expect(coverObjectPathFromUrl(url)).toBe("abc/cover_123.jpg");
  });
  it("returns null for null or non-matching URLs", () => {
    expect(coverObjectPathFromUrl(null)).toBeNull();
    expect(coverObjectPathFromUrl("https://example.com/x.jpg")).toBeNull();
  });
});
