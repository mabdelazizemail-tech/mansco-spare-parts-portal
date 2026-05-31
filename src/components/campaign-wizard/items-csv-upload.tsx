"use client";

import { useState, useRef, useEffect, Fragment } from "react";
import { Upload, Download, AlertCircle, CheckCircle2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { parseCSVFile } from "@/lib/csv/parser";
import { validateCSVRows, allRowsValid, type ValidatedRow } from "@/lib/csv/validator";
import { generateCampaignItemsTemplate } from "@/lib/csv/template-generator";
import { downloadCSV } from "@/utils/csv-download";
import type { DiscountType } from "@/lib/csv/schemas";

export type CampaignItemDraft = {
  key: string;
  part_number: string;
  part_description: string;
  discount_type: DiscountType;
  discount_value: number;
  min_order_quantity: number;
};

interface ItemsCSVUploadProps {
  discountType: DiscountType;
  onItemsConfirmed: (items: CampaignItemDraft[]) => void;
  onCancel?: () => void;
}

let keyCounter = 0;
function newKey() {
  return `item-${++keyCounter}`;
}

export default function ItemsCSVUpload({
  discountType,
  onItemsConfirmed,
  onCancel,
}: ItemsCSVUploadProps) {
  const [fileError, setFileError] = useState<string>("");
  const [validatedRows, setValidatedRows] = useState<ValidatedRow[]>([]);
  const [editingRowIndex, setEditingRowIndex] = useState<number | null>(null);
  const [editingValues, setEditingValues] = useState<Record<string, string>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Re-validate when the campaign-level discount type changes (e.g. user
  // toggles from Percentage → Fixed in the wizard after uploading)
  useEffect(() => {
    if (validatedRows.length === 0) return;
    setValidatedRows((prev) =>
      validateCSVRows(
        prev.map((r) => r.data),
        discountType,
      ),
    );
    // intentionally exclude validatedRows from deps to avoid an infinite loop
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [discountType]);

  // ── Download Template ──────────────────────────────────────────────
  const handleDownloadTemplate = () => {
    const content = generateCampaignItemsTemplate();
    downloadCSV(content, "campaign-items-template.csv");
  };

  // ── Handle File Upload ─────────────────────────────────────────────
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileError("");
    setValidatedRows([]);
    setEditingRowIndex(null);

    const parseResult = await parseCSVFile(file, [
      "Part Number",
      "Description",
      "Discount Value",
      "Min Order Quantity",
    ]);
    if (parseResult.errors.length > 0) {
      setFileError(parseResult.errors.join("; "));
      // Reset the input so re-selecting the same file fires onChange again
      e.target.value = "";
      return;
    }

    const validated = validateCSVRows(parseResult.rows, discountType);
    setValidatedRows(validated);
    e.target.value = "";
  };

  // ── Handle Row Edit ────────────────────────────────────────────────
  const handleStartEdit = (rowIndex: number) => {
    const row = validatedRows[rowIndex];
    setEditingRowIndex(rowIndex);
    setEditingValues({ ...row.data });
  };

  const handleEditChange = (field: string, value: string) => {
    setEditingValues((prev) => ({ ...prev, [field]: value }));
  };

  const handleSaveEdit = (rowIndex: number) => {
    const updatedRows = [...validatedRows];
    const [revalidated] = validateCSVRows([editingValues], discountType);
    updatedRows[rowIndex] = {
      ...revalidated,
      index: rowIndex + 1,
    };
    setValidatedRows(updatedRows);
    setEditingRowIndex(null);
  };

  const handleCancelEdit = () => {
    setEditingRowIndex(null);
  };

  // ── Handle Confirm ────────────────────────────────────────────────
  const handleConfirm = () => {
    if (!allRowsValid(validatedRows)) return;

    const items: CampaignItemDraft[] = validatedRows.map((row) => ({
      key: newKey(),
      part_number: row.data["Part Number"].trim(),
      part_description: row.data["Description"]?.trim() || "",
      discount_type: discountType,
      discount_value: Number(row.data["Discount Value"]),
      min_order_quantity: Number(row.data["Min Order Quantity"]),
    }));

    onItemsConfirmed(items);
  };

  // ── Handle Re-upload ──────────────────────────────────────────────
  const handleReupload = () => {
    setFileError("");
    setValidatedRows([]);
    setEditingRowIndex(null);
    fileInputRef.current?.click();
  };

  // ── Always-mounted hidden file input ──
  const hiddenFileInput = (
    <input
      ref={fileInputRef}
      type="file"
      accept=".csv,.xlsx,.xls"
      onChange={handleFileSelect}
      className="hidden"
    />
  );

  const valueColumnHeader = discountType === "percentage" ? "Discount %" : "Fixed Amount (EGP)";

  // ── Render empty state ────────────────────────────────────────────
  if (validatedRows.length === 0 && !fileError) {
    return (
      <>
        {hiddenFileInput}
        <div className="space-y-4">
          <p className="text-sm text-white/60">
            Download the template, fill it with your items, then upload it here. Supports both <strong>CSV</strong> and <strong>Excel (.xlsx)</strong> files.
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

  // ── Render file error ─────────────────────────────────────────────
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
          <div className="flex gap-3">
            <button
              onClick={handleReupload}
              className="flex items-center gap-2 rounded-lg bg-[#00BFA6] px-4 py-2.5 text-sm font-semibold text-black transition hover:bg-[#00BFA6]/90"
            >
              <Upload className="h-4 w-4" />
              Re-upload
            </button>
            {onCancel && (
              <button
                onClick={onCancel}
                className="rounded-lg px-4 py-2.5 text-sm font-semibold text-white/40 transition hover:text-white"
              >
                Cancel
              </button>
            )}
          </div>
        </div>
      </>
    );
  }

  // ── Render preview table ──────────────────────────────────────────
  const isValid = allRowsValid(validatedRows);
  const invalidCount = validatedRows.filter((r) => !r.valid).length;

  return (
    <>
      {hiddenFileInput}
      <div className="space-y-4">
      {/* Status banner */}
      {isValid ? (
        <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 flex gap-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-400 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-emerald-400">
            All {validatedRows.length} item{validatedRows.length !== 1 ? "s" : ""} are valid and ready to add
          </p>
        </div>
      ) : (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 flex gap-2">
          <AlertCircle className="h-4 w-4 text-red-400 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-red-400">
            {invalidCount} item{invalidCount !== 1 ? "s" : ""} need to be fixed
          </p>
        </div>
      )}

      {/* Preview table */}
      <Card className="border-[#2A2A2A] bg-[#1A1A1A] overflow-x-auto">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#2A2A2A]">
                <th className="text-left px-3 py-3 text-xs font-semibold uppercase text-white/40">Row</th>
                <th className="text-left px-3 py-3 text-xs font-semibold uppercase text-white/40">Part Number</th>
                <th className="text-left px-3 py-3 text-xs font-semibold uppercase text-white/40">Description</th>
                <th className="text-left px-3 py-3 text-xs font-semibold uppercase text-white/40">{valueColumnHeader}</th>
                <th className="text-left px-3 py-3 text-xs font-semibold uppercase text-white/40">Min Qty</th>
                <th className="text-left px-3 py-3 text-xs font-semibold uppercase text-white/40">Status</th>
              </tr>
            </thead>
            <tbody>
              {validatedRows.map((row, idx) => (
                <Fragment key={row.index}>
                  <tr className={`border-b border-[#2A2A2A] ${row.valid ? "bg-green-500/5" : "bg-red-500/5"}`}>
                    <td className="px-3 py-3 text-xs text-white/60">{row.index}</td>
                    <td className="px-3 py-3 text-xs text-white">
                      {editingRowIndex === idx ? (
                        <input
                          type="text"
                          value={editingValues["Part Number"] || ""}
                          onChange={(e) => handleEditChange("Part Number", e.target.value)}
                          className="h-8 w-full rounded border border-[#2A2A2A] bg-[#0D0D0D] px-2 text-xs text-white placeholder:text-white/30 focus:border-[#00BFA6] focus:outline-none"
                        />
                      ) : (
                        row.data["Part Number"]
                      )}
                    </td>
                    <td className="px-3 py-3 text-xs text-white">
                      {editingRowIndex === idx ? (
                        <input
                          type="text"
                          value={editingValues["Description"] || ""}
                          onChange={(e) => handleEditChange("Description", e.target.value)}
                          className="h-8 w-full rounded border border-[#2A2A2A] bg-[#0D0D0D] px-2 text-xs text-white placeholder:text-white/30 focus:border-[#00BFA6] focus:outline-none"
                        />
                      ) : (
                        row.data["Description"] || "—"
                      )}
                    </td>
                    <td className="px-3 py-3 text-xs text-white">
                      {editingRowIndex === idx ? (
                        <input
                          type="number"
                          value={editingValues["Discount Value"] || ""}
                          onChange={(e) => handleEditChange("Discount Value", e.target.value)}
                          className="h-8 w-20 rounded border border-[#2A2A2A] bg-[#0D0D0D] px-2 text-xs text-white placeholder:text-white/30 focus:border-[#00BFA6] focus:outline-none"
                        />
                      ) : (
                        <>
                          {row.data["Discount Value"]}
                          <span className="ml-1 text-white/40">{discountType === "percentage" ? "%" : "EGP"}</span>
                        </>
                      )}
                    </td>
                    <td className="px-3 py-3 text-xs text-white">
                      {editingRowIndex === idx ? (
                        <input
                          type="number"
                          value={editingValues["Min Order Quantity"] || ""}
                          onChange={(e) => handleEditChange("Min Order Quantity", e.target.value)}
                          className="h-8 w-16 rounded border border-[#2A2A2A] bg-[#0D0D0D] px-2 text-xs text-white placeholder:text-white/30 focus:border-[#00BFA6] focus:outline-none"
                        />
                      ) : (
                        row.data["Min Order Quantity"]
                      )}
                    </td>
                    <td className="px-3 py-3 text-xs">
                      {editingRowIndex === idx ? (
                        <div className="flex gap-1">
                          <button
                            onClick={() => handleSaveEdit(idx)}
                            className="rounded px-2 py-1 bg-[#00BFA6] text-black text-xs font-semibold hover:bg-[#00BFA6]/90"
                          >
                            Save
                          </button>
                          <button
                            onClick={handleCancelEdit}
                            className="rounded px-2 py-1 bg-[#2A2A2A] text-white text-xs font-semibold hover:bg-[#3A3A3A]"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : row.valid ? (
                        <div className="flex items-center gap-2">
                          <span className="text-emerald-400 font-semibold">✓ Valid</span>
                          <button
                            onClick={() => handleStartEdit(idx)}
                            className="text-xs text-white/40 hover:text-[#00BFA6] hover:underline"
                          >
                            Edit
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleStartEdit(idx)}
                          className="text-red-400 font-semibold hover:underline"
                        >
                          ✗ Fix
                        </button>
                      )}
                    </td>
                  </tr>
                  {editingRowIndex !== idx && !row.valid && row.errors.length > 0 && (
                    <tr className="bg-red-500/5">
                      <td colSpan={6} className="px-3 py-2">
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

      {/* Action buttons */}
      <div className="flex gap-3">
        <button
          onClick={handleConfirm}
          disabled={!isValid}
          className="flex items-center gap-2 rounded-lg bg-[#00BFA6] px-5 py-2.5 text-sm font-semibold text-black transition hover:bg-[#00BFA6]/90 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <CheckCircle2 className="h-4 w-4" />
          Confirm
        </button>
        <button
          onClick={handleReupload}
          className="flex items-center gap-2 rounded-lg border border-[#2A2A2A] bg-[#0D0D0D] px-5 py-2.5 text-sm font-semibold text-white/60 transition hover:border-[#00BFA6]/40 hover:text-[#00BFA6]"
        >
          <Upload className="h-4 w-4" />
          Re-upload
        </button>
        {onCancel && (
          <button
            onClick={onCancel}
            className="rounded-lg px-4 py-2.5 text-sm font-semibold text-white/40 transition hover:text-white"
          >
            Cancel
          </button>
        )}
      </div>

      </div>
    </>
  );
}
