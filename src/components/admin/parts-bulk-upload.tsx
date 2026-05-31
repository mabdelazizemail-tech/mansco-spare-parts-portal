"use client";

import { useState, useRef, Fragment } from "react";
import { Upload, Download, AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { parseCSVFile } from "@/lib/csv/parser";
import {
  validatePartRows,
  allPartRowsValid,
  type ValidatedPartRow,
} from "@/lib/csv/parts-validator";
import { generatePartsTemplate } from "@/lib/csv/parts-template-generator";
import { downloadCSV } from "@/utils/csv-download";

type UploadResult = {
  inserted: number;
  updated: number;
  failed: number;
  failures: { row: number; part_number: string; errors: string[] }[];
};

interface PartsBulkUploadProps {
  onComplete?: (result: UploadResult) => void;
}

export default function PartsBulkUpload({ onComplete }: PartsBulkUploadProps) {
  const [fileError, setFileError] = useState("");
  const [validatedRows, setValidatedRows] = useState<ValidatedPartRow[]>([]);
  const [editingRowIndex, setEditingRowIndex] = useState<number | null>(null);
  const [editingValues, setEditingValues] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState<UploadResult | null>(null);
  const [submitError, setSubmitError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDownloadTemplate = () => {
    downloadCSV(generatePartsTemplate(), "parts-catalog-template.csv");
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileError("");
    setValidatedRows([]);
    setEditingRowIndex(null);
    setSubmitResult(null);
    setSubmitError("");

    const parseResult = await parseCSVFile(file, ["Part Number", "Name (EN)"]);
    if (parseResult.errors.length > 0) {
      setFileError(parseResult.errors.join("; "));
      e.target.value = "";
      return;
    }

    setValidatedRows(validatePartRows(parseResult.rows));
    e.target.value = "";
  };

  const handleStartEdit = (idx: number) => {
    setEditingRowIndex(idx);
    setEditingValues({ ...validatedRows[idx].data });
  };

  const handleEditChange = (field: string, value: string) => {
    setEditingValues((prev) => ({ ...prev, [field]: value }));
  };

  const handleSaveEdit = (idx: number) => {
    const updated = [...validatedRows];
    const [revalidated] = validatePartRows([editingValues]);
    updated[idx] = { ...revalidated, index: idx + 1 };
    setValidatedRows(updated);
    setEditingRowIndex(null);
  };

  const handleCancelEdit = () => setEditingRowIndex(null);

  const handleReupload = () => {
    setFileError("");
    setValidatedRows([]);
    setEditingRowIndex(null);
    setSubmitResult(null);
    setSubmitError("");
    fileInputRef.current?.click();
  };

  const handleSubmit = async () => {
    if (!allPartRowsValid(validatedRows)) return;
    setSubmitting(true);
    setSubmitError("");
    try {
      const res = await fetch("/api/parts/bulk-upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: validatedRows.map((r) => r.data) }),
      });
      const body = await res.json();
      if (!res.ok) {
        throw new Error(body?.error?.message || "Upload failed");
      }
      setSubmitResult(body.data);
      onComplete?.(body.data);
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setSubmitting(false);
    }
  };

  const hiddenFileInput = (
    <input
      ref={fileInputRef}
      type="file"
      accept=".csv,.xlsx,.xls"
      onChange={handleFileSelect}
      className="hidden"
    />
  );

  // ── Empty state ───────────────────────────────────────────────
  if (validatedRows.length === 0 && !fileError && !submitResult) {
    return (
      <>
        {hiddenFileInput}
        <div className="space-y-4">
          <p className="text-sm text-white/60">
            Download the template, fill it with parts data, then upload it here. Supports both <strong>CSV</strong> and <strong>Excel (.xlsx)</strong> files. Existing parts (matched by Part Number) are updated; new parts are inserted.
          </p>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={handleDownloadTemplate}
              className="flex items-center gap-2 rounded-lg border border-[#2A2A2A] bg-[#0D0D0D] px-4 py-2.5 text-sm font-semibold text-white/60 transition hover:border-[#00BFA6]/40 hover:text-[#00BFA6]"
            >
              <Download className="h-4 w-4" />
              Download Template
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 rounded-lg bg-[#00BFA6] px-4 py-2.5 text-sm font-semibold text-black transition hover:bg-[#00BFA6]/90"
            >
              <Upload className="h-4 w-4" />
              Upload CSV / Excel
            </button>
          </div>
        </div>
      </>
    );
  }

  // ── File-level error ──────────────────────────────────────────
  if (fileError) {
    return (
      <>
        {hiddenFileInput}
        <div className="space-y-4">
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4 flex gap-3">
            <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-red-400">Upload Error</p>
              <p className="mt-1 text-xs text-red-400/70">{fileError}</p>
            </div>
          </div>
          <button
            onClick={handleReupload}
            className="flex items-center gap-2 rounded-lg bg-[#00BFA6] px-4 py-2.5 text-sm font-semibold text-black transition hover:bg-[#00BFA6]/90"
          >
            <Upload className="h-4 w-4" />
            Re-upload
          </button>
        </div>
      </>
    );
  }

  // ── Post-submit result ───────────────────────────────────────
  if (submitResult) {
    const hasFailures = submitResult.failed > 0;
    return (
      <>
        {hiddenFileInput}
        <div className="space-y-4">
          <div
            className={`rounded-lg border p-4 flex gap-3 ${
              hasFailures
                ? "border-amber-500/30 bg-amber-500/10"
                : "border-emerald-500/30 bg-emerald-500/10"
            }`}
          >
            <CheckCircle2 className={`h-5 w-5 flex-shrink-0 mt-0.5 ${hasFailures ? "text-amber-400" : "text-emerald-400"}`} />
            <div className="space-y-1">
              <p className={`text-sm font-semibold ${hasFailures ? "text-amber-400" : "text-emerald-400"}`}>
                Upload complete
              </p>
              <p className={`text-xs ${hasFailures ? "text-amber-400/70" : "text-emerald-400/70"}`}>
                {submitResult.inserted} inserted · {submitResult.updated} updated{hasFailures ? ` · ${submitResult.failed} failed` : ""}
              </p>
            </div>
          </div>

          {submitResult.failures.length > 0 && (
            <Card className="border-red-500/30 bg-red-500/5 p-4">
              <p className="text-xs font-semibold text-red-400 mb-2">Failed rows:</p>
              <ul className="space-y-1 text-xs text-red-400/80">
                {submitResult.failures.slice(0, 20).map((f) => (
                  <li key={`${f.row}-${f.part_number}`}>
                    Row {f.row} ({f.part_number}): {f.errors.join("; ")}
                  </li>
                ))}
                {submitResult.failures.length > 20 && (
                  <li>… and {submitResult.failures.length - 20} more</li>
                )}
              </ul>
            </Card>
          )}

          <button
            onClick={handleReupload}
            className="flex items-center gap-2 rounded-lg bg-[#00BFA6] px-4 py-2.5 text-sm font-semibold text-black transition hover:bg-[#00BFA6]/90"
          >
            <Upload className="h-4 w-4" />
            Upload Another File
          </button>
        </div>
      </>
    );
  }

  // ── Preview table ─────────────────────────────────────────────
  const isValid = allPartRowsValid(validatedRows);
  const invalidCount = validatedRows.filter((r) => !r.valid).length;

  return (
    <>
      {hiddenFileInput}
      <div className="space-y-4">
        {isValid ? (
          <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 flex gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-400 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-emerald-400">
              All {validatedRows.length} part{validatedRows.length !== 1 ? "s" : ""} are valid and ready to upload
            </p>
          </div>
        ) : (
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 flex gap-2">
            <AlertCircle className="h-4 w-4 text-red-400 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-red-400">
              {invalidCount} part{invalidCount !== 1 ? "s" : ""} need to be fixed
            </p>
          </div>
        )}

        {submitError && (
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-400">
            {submitError}
          </div>
        )}

        <Card className="border-[#2A2A2A] bg-[#1A1A1A] overflow-x-auto">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#2A2A2A]">
                  {["Row", "Part #", "Name (EN)", "Name (AR)", "Category", "Model", "Price", "Currency", "Status"].map((h) => (
                    <th key={h} className="text-left px-3 py-3 text-xs font-semibold uppercase text-white/40">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {validatedRows.map((row, idx) => (
                  <Fragment key={row.index}>
                    <tr className={`border-b border-[#2A2A2A] ${row.valid ? "bg-green-500/5" : "bg-red-500/5"}`}>
                      <td className="px-3 py-3 text-xs text-white/60">{row.index}</td>
                      {(["Part Number", "Name (EN)", "Name (AR)", "Category", "Model", "Price", "Currency"] as const).map((col) => (
                        <td key={col} className="px-3 py-3 text-xs text-white">
                          {editingRowIndex === idx ? (
                            <input
                              type={col === "Price" ? "number" : "text"}
                              value={editingValues[col] || ""}
                              onChange={(e) => handleEditChange(col, e.target.value)}
                              className="h-8 w-full min-w-[6rem] rounded border border-[#2A2A2A] bg-[#0D0D0D] px-2 text-xs text-white placeholder:text-white/30 focus:border-[#00BFA6] focus:outline-none"
                            />
                          ) : (
                            row.data[col] || "—"
                          )}
                        </td>
                      ))}
                      <td className="px-3 py-3 text-xs">
                        {editingRowIndex === idx ? (
                          <div className="flex gap-1">
                            <button onClick={() => handleSaveEdit(idx)} className="rounded px-2 py-1 bg-[#00BFA6] text-black text-xs font-semibold hover:bg-[#00BFA6]/90">
                              Save
                            </button>
                            <button onClick={handleCancelEdit} className="rounded px-2 py-1 bg-[#2A2A2A] text-white text-xs font-semibold hover:bg-[#3A3A3A]">
                              Cancel
                            </button>
                          </div>
                        ) : row.valid ? (
                          <div className="flex items-center gap-2">
                            <span className="text-emerald-400 font-semibold">✓ Valid</span>
                            <button onClick={() => handleStartEdit(idx)} className="text-xs text-white/40 hover:text-[#00BFA6] hover:underline">
                              Edit
                            </button>
                          </div>
                        ) : (
                          <button onClick={() => handleStartEdit(idx)} className="text-red-400 font-semibold hover:underline">
                            ✗ Fix
                          </button>
                        )}
                      </td>
                    </tr>
                    {editingRowIndex !== idx && !row.valid && row.errors.length > 0 && (
                      <tr className="bg-red-500/5">
                        <td colSpan={9} className="px-3 py-2">
                          <div className="text-xs text-red-400 space-y-0.5">
                            {row.errors.map((err, i) => (
                              <div key={`${row.index}-${i}`}>• {err}</div>
                            ))}
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <div className="flex gap-3">
          <button
            onClick={handleSubmit}
            disabled={!isValid || submitting}
            className="flex items-center gap-2 rounded-lg bg-[#00BFA6] px-5 py-2.5 text-sm font-semibold text-black transition hover:bg-[#00BFA6]/90 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
            {submitting ? "Uploading…" : "Confirm & Upload"}
          </button>
          <button
            onClick={handleReupload}
            disabled={submitting}
            className="flex items-center gap-2 rounded-lg border border-[#2A2A2A] bg-[#0D0D0D] px-5 py-2.5 text-sm font-semibold text-white/60 transition hover:border-[#00BFA6]/40 hover:text-[#00BFA6] disabled:opacity-40"
          >
            <Upload className="h-4 w-4" />
            Re-upload
          </button>
        </div>
      </div>
    </>
  );
}
