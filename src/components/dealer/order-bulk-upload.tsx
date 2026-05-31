"use client";

import { useState, useRef, Fragment } from "react";
import { Upload, Download, AlertCircle, CheckCircle2, Loader2, ShoppingCart } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { parseCSVFile } from "@/lib/csv/parser";
import {
  validateOrderRows,
  type ValidatedOrderRow,
} from "@/lib/csv/order-validator";
import { generateOrderTemplate } from "@/lib/csv/order-template-generator";
import { downloadCSV } from "@/utils/csv-download";
import { useCart, type CartPartSnapshot } from "@/lib/cart";

/**
 * Per-row state after both structural validation AND server-side catalog lookup.
 * `lookupStatus`:
 *   - "valid"        — found, available, has price → ready to add to cart
 *   - "structural"   — failed Zod (bad Part Number / Quantity)
 *   - "not_found"    — Part Number not in catalog
 *   - "no_price"     — found but unavailable (no-price-on-unavailable rule)
 */
type EnrichedRow = ValidatedOrderRow & {
  lookupStatus: "pending" | "valid" | "structural" | "not_found" | "no_price";
  lookupError?: string;
  partName?: string;
  unitPrice?: number | null;
  // ── Discount snapshot from lookup ──
  campaignId?: string | null;
  discountPct?: number;
  originalUnitPrice?: number | null;
  discountedUnitPrice?: number | null;
  availabilityLabel?: string;
  cartSnapshot?: CartPartSnapshot;
};

function formatEGP(value: number): string {
  return new Intl.NumberFormat("en-EG", {
    style: "currency",
    currency: "EGP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

interface OrderBulkUploadProps {
  onItemsAdded?: (count: number) => void;
}

export default function OrderBulkUpload({ onItemsAdded }: OrderBulkUploadProps) {
  const cart = useCart();
  const [fileError, setFileError] = useState("");
  const [rows, setRows] = useState<EnrichedRow[]>([]);
  const [editingRowIndex, setEditingRowIndex] = useState<number | null>(null);
  const [editingValues, setEditingValues] = useState<Record<string, string>>({});
  const [lookingUp, setLookingUp] = useState(false);
  const [addedCount, setAddedCount] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDownloadTemplate = () => {
    downloadCSV(generateOrderTemplate(), "order-template.csv");
  };

  const enrichWithCatalog = async (
    base: ValidatedOrderRow[],
  ): Promise<EnrichedRow[]> => {
    // Rows that failed structural validation never hit the server
    const lookupItems = base
      .filter((r) => r.valid)
      .map((r) => ({
        part_number: r.data["Part Number"],
        quantity: Number(r.data["Quantity"]),
      }));

    if (lookupItems.length === 0) {
      return base.map((r) => ({
        ...r,
        lookupStatus: "structural" as const,
      }));
    }

    let lookupByPart = new Map<string, any>();
    try {
      const res = await fetch("/api/parts/bulk-lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: lookupItems }),
      });
      const body = await res.json();
      if (res.ok && Array.isArray(body.data)) {
        lookupByPart = new Map(body.data.map((d: any) => [d.part_number, d]));
      }
    } catch {
      // tolerate — rows will show as not_found
    }

    return base.map((r) => {
      if (!r.valid) {
        return { ...r, lookupStatus: "structural" as const };
      }
      const partNum = r.data["Part Number"];
      const lookup = lookupByPart.get(partNum);

      if (!lookup || !lookup.found) {
        return {
          ...r,
          lookupStatus: "not_found" as const,
          lookupError: lookup?.error || `Part ${partNum} not found in catalog`,
        };
      }

      const result = lookup.result;
      if (result.unit_price === null) {
        // No-price-on-unavailable rule — can't order what we can't price
        return {
          ...r,
          lookupStatus: "no_price" as const,
          partName: result.name,
          availabilityLabel: result.availability_label_en,
          lookupError: `${result.availability_label_en} — cannot be added to cart`,
        };
      }

      const snapshot: CartPartSnapshot = {
        part_number: result.part_number,
        name: result.name,
        name_ar: result.name_ar,
        category: result.category,
        model: result.model,
        oem: result.oem ?? null,
        image: result.image ?? null,
        availability_state: result.availability_state,
        availability_label_en: result.availability_label_en,
        quantity_available: result.quantity_available,
        replenishment_eta: result.replenishment_eta,
        unit_price: result.unit_price,
        currency: result.currency ?? "EGP",
        campaign_id: result.campaign_id ?? null,
        discount_pct: result.discount_pct ?? 0,
        original_unit_price: result.original_unit_price ?? null,
        discounted_unit_price: result.discounted_unit_price ?? null,
      };

      return {
        ...r,
        lookupStatus: "valid" as const,
        partName: result.name,
        unitPrice: result.unit_price,
        campaignId: result.campaign_id ?? null,
        discountPct: result.discount_pct ?? 0,
        originalUnitPrice: result.original_unit_price ?? null,
        discountedUnitPrice: result.discounted_unit_price ?? null,
        availabilityLabel: result.availability_label_en,
        cartSnapshot: snapshot,
      };
    });
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileError("");
    setRows([]);
    setEditingRowIndex(null);
    setAddedCount(null);

    const parseResult = await parseCSVFile(file, ["Part Number", "Quantity"]);
    if (parseResult.errors.length > 0) {
      setFileError(parseResult.errors.join("; "));
      e.target.value = "";
      return;
    }

    // Structural validation first
    const validated = validateOrderRows(parseResult.rows);

    // Then enrich with catalog lookup
    setLookingUp(true);
    try {
      const enriched = await enrichWithCatalog(validated);
      setRows(enriched);
    } finally {
      setLookingUp(false);
      e.target.value = "";
    }
  };

  const handleReupload = () => {
    setFileError("");
    setRows([]);
    setEditingRowIndex(null);
    setAddedCount(null);
    fileInputRef.current?.click();
  };

  const handleStartEdit = (idx: number) => {
    setEditingRowIndex(idx);
    setEditingValues({ ...rows[idx].data });
  };

  const handleEditChange = (field: string, value: string) => {
    setEditingValues((prev) => ({ ...prev, [field]: value }));
  };

  const handleSaveEdit = async (idx: number) => {
    const updated = [...rows];
    const [revalidated] = validateOrderRows([editingValues]);
    if (revalidated.valid) {
      // Re-enrich just this row
      setLookingUp(true);
      const [enriched] = await enrichWithCatalog([revalidated]);
      updated[idx] = { ...enriched, index: idx + 1 };
      setLookingUp(false);
    } else {
      updated[idx] = {
        ...revalidated,
        index: idx + 1,
        lookupStatus: "structural",
      };
    }
    setRows(updated);
    setEditingRowIndex(null);
  };

  const handleCancelEdit = () => setEditingRowIndex(null);

  const handleRemoveRow = (idx: number) => {
    setRows(rows.filter((_, i) => i !== idx).map((r, i) => ({ ...r, index: i + 1 })));
  };

  const handleAddAllToCart = () => {
    const validRows = rows.filter((r) => r.lookupStatus === "valid");
    let added = 0;
    for (const r of validRows) {
      if (r.cartSnapshot) {
        cart.addItem(r.cartSnapshot, Number(r.data["Quantity"]) || 1);
        added++;
      }
    }
    setAddedCount(added);
    onItemsAdded?.(added);
    // Reset so dealer can do another upload without leftover preview
    setRows([]);
  };

  const validCount = rows.filter((r) => r.lookupStatus === "valid").length;
  const issueCount = rows.length - validCount;
  const allValid = rows.length > 0 && issueCount === 0;
  const subtotal = rows
    .filter((r) => r.lookupStatus === "valid")
    .reduce(
      (s, r) =>
        s + (r.discountedUnitPrice ?? r.unitPrice ?? 0) * Number(r.data["Quantity"] || 0),
      0,
    );

  const hiddenFileInput = (
    <input
      ref={fileInputRef}
      type="file"
      accept=".csv,.xlsx,.xls"
      onChange={handleFileSelect}
      className="hidden"
    />
  );

  // ── Confirmation banner after items added ──
  if (addedCount !== null) {
    return (
      <>
        {hiddenFileInput}
        <div className="space-y-3">
          <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4 flex gap-3">
            <CheckCircle2 className="h-5 w-5 text-emerald-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-emerald-400">
                {addedCount} item{addedCount !== 1 ? "s" : ""} added to your cart
              </p>
              <p className="mt-1 text-xs text-emerald-400/70">
                Review the cart below or upload another file.
              </p>
            </div>
          </div>
          <Button
            onClick={handleReupload}
            className="gap-2 bg-[#00BFA6] text-black hover:bg-[#00BFA6]/90"
          >
            <Upload className="h-4 w-4" />
            Upload Another File
          </Button>
        </div>
      </>
    );
  }

  // ── Empty state ──
  if (rows.length === 0 && !fileError && !lookingUp) {
    return (
      <>
        {hiddenFileInput}
        <div className="space-y-3">
          <div className="space-y-2">
            <p className="text-sm text-white/60">
              Save time by uploading a <strong>CSV</strong> or <strong>Excel (.xlsx)</strong> file with the parts you want to order.
            </p>
            <p className="text-xs text-white/40">
              <strong>Required columns:</strong> <code className="text-[#00BFA6]">Part Number</code> (exact catalog number) and <code className="text-[#00BFA6]">Quantity</code> (whole number).
            </p>
            <p className="text-xs text-white/40">
              ✓ Part names, prices, and availability are automatically looked up from the catalog.
            </p>
          </div>
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

  if (lookingUp && rows.length === 0) {
    return (
      <div className="flex items-center gap-3 text-sm text-white/60 py-4">
        <Loader2 className="h-4 w-4 animate-spin" />
        Looking up parts in catalog…
      </div>
    );
  }

  // ── File-level error ──
  if (fileError) {
    return (
      <>
        {hiddenFileInput}
        <div className="space-y-3">
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4 flex gap-3">
            <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-red-400">Upload Error</p>
              <p className="mt-1 text-xs text-red-400/70">{fileError}</p>
            </div>
          </div>
          <Button onClick={handleReupload} className="gap-2 bg-[#00BFA6] text-black hover:bg-[#00BFA6]/90">
            <Upload className="h-4 w-4" />
            Re-upload
          </Button>
        </div>
      </>
    );
  }

  // ── Preview table ──
  return (
    <>
      {hiddenFileInput}
      <div className="space-y-4">
        {allValid ? (
          <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 flex gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-400 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-emerald-400">
              All {rows.length} item{rows.length !== 1 ? "s" : ""} are valid. Subtotal: <strong>{formatEGP(subtotal)}</strong>
            </p>
          </div>
        ) : (
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 flex gap-2">
            <AlertCircle className="h-4 w-4 text-amber-400 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-amber-400">
              {validCount} valid · {issueCount} need attention. You can fix invalid rows inline or remove them and continue.
            </p>
          </div>
        )}

        <Card className="border-[#2A2A2A] bg-[#1A1A1A] overflow-x-auto">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#2A2A2A]">
                  {["Row", "Part #", "Name", "Qty", "Unit Price", "Line Total", "Status", ""].map((h) => (
                    <th key={h} className="text-left px-3 py-3 text-xs font-semibold uppercase text-white/40">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, idx) => {
                  const qty = Number(row.data["Quantity"]) || 0;
                  const effectiveUnit = row.discountedUnitPrice ?? row.unitPrice ?? 0;
                  const lineTotal = effectiveUnit * qty;
                  return (
                    <Fragment key={`${row.index}-${row.data["Part Number"]}`}>
                      <tr className={`border-b border-[#2A2A2A] ${row.lookupStatus === "valid" ? "bg-green-500/5" : "bg-amber-500/5"}`}>
                        <td className="px-3 py-3 text-xs text-white/60">{row.index}</td>
                        <td className="px-3 py-3 text-xs text-white font-mono">
                          {editingRowIndex === idx ? (
                            <input
                              type="text"
                              value={editingValues["Part Number"] || ""}
                              onChange={(e) => handleEditChange("Part Number", e.target.value)}
                              className="h-8 w-32 rounded border border-[#2A2A2A] bg-[#0D0D0D] px-2 text-xs text-white focus:border-[#00BFA6] focus:outline-none"
                            />
                          ) : (
                            row.data["Part Number"]
                          )}
                        </td>
                        <td className="px-3 py-3 text-xs text-white">{row.partName ?? "—"}</td>
                        <td className="px-3 py-3 text-xs text-white">
                          {editingRowIndex === idx ? (
                            <input
                              type="number"
                              min={1}
                              value={editingValues["Quantity"] || ""}
                              onChange={(e) => handleEditChange("Quantity", e.target.value)}
                              className="h-8 w-20 rounded border border-[#2A2A2A] bg-[#0D0D0D] px-2 text-xs text-white focus:border-[#00BFA6] focus:outline-none"
                            />
                          ) : (
                            row.data["Quantity"]
                          )}
                        </td>
                        <td className="px-3 py-3 text-xs text-white">
                          {row.lookupStatus === "valid" && row.unitPrice !== undefined ? (
                            row.campaignId && row.discountedUnitPrice !== null && row.discountedUnitPrice !== undefined ? (
                              <span className="flex flex-col">
                                <span className="text-white/40 line-through text-[10px]">
                                  {formatEGP(row.originalUnitPrice ?? row.unitPrice ?? 0)}
                                </span>
                                <span className="text-emerald-400 font-semibold">
                                  {formatEGP(row.discountedUnitPrice)}
                                </span>
                                <span className="text-[10px] text-emerald-400/70">
                                  Campaign −{row.discountPct}%
                                </span>
                              </span>
                            ) : (
                              formatEGP(row.unitPrice ?? 0)
                            )
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="px-3 py-3 text-xs text-white font-semibold">
                          {row.lookupStatus === "valid" ? formatEGP(lineTotal) : "—"}
                        </td>
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
                          ) : row.lookupStatus === "valid" ? (
                            <div className="flex items-center gap-2">
                              <span className="text-emerald-400 font-semibold">✓ Ready</span>
                              <button onClick={() => handleStartEdit(idx)} className="text-xs text-white/40 hover:text-[#00BFA6] hover:underline">
                                Edit
                              </button>
                            </div>
                          ) : (
                            <button onClick={() => handleStartEdit(idx)} className="text-amber-400 font-semibold hover:underline">
                              ✗ Fix
                            </button>
                          )}
                        </td>
                        <td className="px-3 py-3 text-xs">
                          <button
                            onClick={() => handleRemoveRow(idx)}
                            className="text-xs text-white/30 hover:text-red-400 hover:underline"
                            title="Remove row"
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                      {editingRowIndex !== idx && row.lookupStatus !== "valid" && (
                        <tr className="bg-amber-500/5">
                          <td colSpan={8} className="px-3 py-2">
                            <div className="text-xs text-amber-400 space-y-0.5">
                              {row.errors.length > 0 ? (
                                row.errors.map((err, i) => <div key={i}>• {err}</div>)
                              ) : row.lookupError ? (
                                <div>• {row.lookupError}</div>
                              ) : null}
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>

        <div className="flex flex-wrap gap-3">
          <Button
            onClick={handleAddAllToCart}
            disabled={validCount === 0 || lookingUp}
            className="gap-2 bg-[#00BFA6] text-black hover:bg-[#00BFA6]/90 disabled:opacity-40"
          >
            <ShoppingCart className="h-4 w-4" />
            Add {validCount} Valid Item{validCount !== 1 ? "s" : ""} to Cart
          </Button>
          <Button
            variant="outline"
            onClick={handleReupload}
            disabled={lookingUp}
            className="gap-2 border-[#2A2A2A] text-white/60 hover:text-white"
          >
            <Upload className="h-4 w-4" />
            Re-upload
          </Button>
        </div>

        <p className="text-[11px] text-white/40">
          Invalid rows (not found in catalog, out of stock, etc.) are skipped — only ✓ Ready items go into the cart.
        </p>
      </div>
    </>
  );
}
