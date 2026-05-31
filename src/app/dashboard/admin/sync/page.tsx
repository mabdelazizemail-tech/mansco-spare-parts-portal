"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  Upload,
  FileText,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  RefreshCw,
  Database,
  DollarSign,
  Package,
  X,
  Clock,
  Download,
  Eye,
  AlertCircle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type SyncLog = {
  id: string;
  sync_type: string;
  file_type: string;
  file_name: string;
  status: string;
  records_processed: number;
  records_failed: number;
  error_details: { row: number; reason: string; data?: Record<string, unknown> }[] | null;
  started_at: string;
  completed_at: string | null;
};

type SyncResult = {
  sync_log_id: string;
  file_type: string;
  records_processed: number;
  records_failed: number;
  error_details: { row: number; reason: string; data?: Record<string, unknown> }[];
  duration_ms: number;
};

type FileType = "stock" | "pricing" | "parts_catalog" | "invoices";

const FILE_TYPE_META: Record<FileType, { label: string; description: string; icon: React.ElementType; color: string; expectedColumns: string[] }> = {
  stock: {
    label: "Stock Availability",
    description: "Part quantities, ATP levels, locations, and replenishment ETAs",
    icon: Database,
    color: "emerald",
    expectedColumns: ["part_number", "quantity_available", "quantity_atp", "source_location", "replenishment_eta"],
  },
  pricing: {
    label: "Pricing",
    description: "Unit prices, currencies, discount conditions, effective dates",
    icon: DollarSign,
    color: "amber",
    expectedColumns: ["part_number", "unit_price", "currency", "price_list_id", "effective_from", "effective_to", "discount_pct"],
  },
  parts_catalog: {
    label: "Parts Catalog",
    description: "Master catalog: names (EN/AR), category, model, OEM, image URL",
    icon: Package,
    color: "violet",
    expectedColumns: ["part_number", "name_en", "name_ar", "category_id", "model", "oem", "image_url"],
  },
  invoices: {
    label: "Invoices",
    description: "SAP-issued invoices linked to orders (one row per line)",
    icon: FileText,
    color: "cyan",
    expectedColumns: [
      "invoice_number", "order_number", "invoice_date", "due_date", "currency",
      "subtotal", "vat_amount", "total_amount", "delivery_note",
      "part_number", "part_name", "quantity", "unit_price", "line_total",
    ],
  },
};

function formatDateTime(d: string | null): string {
  if (!d) return "—";
  return new Date(d).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${(ms / 60000).toFixed(1)}min`;
}

// Parse a small preview (first N rows) for display
function parseCsvPreview(content: string, maxRows = 5): { headers: string[]; rows: string[][]; totalRows: number } {
  const lines = content.split(/\r?\n/).filter((l) => l.trim() !== "");
  if (lines.length === 0) return { headers: [], rows: [], totalRows: 0 };
  const splitCsvLine = (line: string): string[] => {
    const cells: string[] = [];
    let cur = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (inQuotes) {
        if (ch === '"' && line[i + 1] === '"') {
          cur += '"';
          i++;
        } else if (ch === '"') {
          inQuotes = false;
        } else {
          cur += ch;
        }
      } else {
        if (ch === '"') inQuotes = true;
        else if (ch === ",") {
          cells.push(cur);
          cur = "";
        } else cur += ch;
      }
    }
    cells.push(cur);
    return cells.map((c) => c.trim());
  };
  const headers = splitCsvLine(lines[0]).map((h) => h.toLowerCase());
  const rows = lines.slice(1, 1 + maxRows).map(splitCsvLine);
  return { headers, rows, totalRows: lines.length - 1 };
}

export default function SyncUploadPage() {
  const [fileType, setFileType] = useState<FileType>("stock");
  const [file, setFile] = useState<File | null>(null);
  const [csvContent, setCsvContent] = useState<string>("");
  const [preview, setPreview] = useState<{ headers: string[]; rows: string[][]; totalRows: number } | null>(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<SyncResult | null>(null);
  const [error, setError] = useState("");
  const [logs, setLogs] = useState<SyncLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(true);
  const [logsUnavailable, setLogsUnavailable] = useState(false);
  const [showAllErrors, setShowAllErrors] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  type SyncStatus = {
    any_stale: boolean;
    threshold_minutes: number;
    feeds: { feed: string; last_synced_at: string | null; age_minutes: number | null; stale: boolean }[];
  };
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);
  const [exporting, setExporting] = useState(false);
  const [exportMsg, setExportMsg] = useState("");

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/sync/status");
      if (res.ok) setSyncStatus((await res.json()).data ?? null);
    } catch {
      /* non-fatal — badge just won't show */
    }
  }, []);

  const exportOrders = async () => {
    setExporting(true);
    setExportMsg("");
    try {
      const res = await fetch("/api/sync/orders-export", { method: "POST" });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error?.message || "Export failed");
      const { csv, file_name, orders_exported, lines_exported } = body.data;
      if (orders_exported > 0) {
        const blob = new Blob(["﻿", csv], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = file_name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        setExportMsg(`Exported ${orders_exported} order(s), ${lines_exported} line(s) → ${file_name}`);
      } else {
        setExportMsg("No approved/partial orders are pending export.");
      }
      await fetchLogs();
    } catch (e) {
      setExportMsg(e instanceof Error ? e.message : "Export failed");
    } finally {
      setExporting(false);
    }
  };

  const fetchLogs = useCallback(async () => {
    setLogsLoading(true);
    try {
      const res = await fetch("/api/sync/logs?limit=15");
      const body = await res.json();
      setLogs(body.data ?? []);
      setLogsUnavailable(Boolean(body.meta?.unavailable));
    } catch {
      setLogsUnavailable(true);
    } finally {
      setLogsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLogs();
    fetchStatus();
  }, [fetchLogs, fetchStatus]);

  const handleFile = async (f: File) => {
    setError("");
    setResult(null);

    if (!f.name.toLowerCase().endsWith(".csv")) {
      setError("Only .csv files are accepted");
      return;
    }
    const MAX_MB = 10;
    if (f.size > MAX_MB * 1024 * 1024) {
      setError(`File is too large (${(f.size / 1024 / 1024).toFixed(1)} MB). Max ${MAX_MB} MB.`);
      return;
    }

    setFile(f);
    const text = await f.text();
    setCsvContent(text);
    setPreview(parseCsvPreview(text));
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files?.[0];
    if (f) handleFile(f);
  };

  const onSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) handleFile(f);
  };

  const clearFile = () => {
    setFile(null);
    setCsvContent("");
    setPreview(null);
    setResult(null);
    setError("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const upload = async () => {
    if (!file || !csvContent) return;
    setUploading(true);
    setError("");
    setResult(null);
    try {
      // Invoices go to the dedicated invoice importer; the parts feeds share
      // /api/sync/parts and pass file_type.
      const isInvoices = fileType === "invoices";
      const res = await fetch(isInvoices ? "/api/sync/invoices" : "/api/sync/parts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          isInvoices
            ? { file_name: file.name, csv_content: csvContent }
            : { file_type: fileType, file_name: file.name, csv_content: csvContent }
        ),
      });
      const body = await res.json();
      if (!res.ok && res.status !== 207) {
        throw new Error(body.error?.message || "Upload failed");
      }
      setResult(body.data);
      await fetchLogs();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  // Compute column mismatch warnings for preview
  const expectedCols = FILE_TYPE_META[fileType].expectedColumns;
  const previewMissingCols = preview
    ? expectedCols.filter((c) => !preview.headers.includes(c))
    : [];
  const previewExtraCols = preview
    ? preview.headers.filter((h) => !expectedCols.includes(h))
    : [];

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">SAP CSV Sync</h1>
          <p className="mt-1 text-sm text-white/40">
            Import SAP exports (stock, pricing, catalog, invoices) and export new orders back to SAP.
          </p>
        </div>
        <div className="flex flex-col items-stretch gap-2 sm:items-end">
          <button
            onClick={exportOrders}
            disabled={exporting}
            className="flex items-center justify-center gap-2 rounded-lg border border-[#2A2A2A] bg-[#0D0D0D] px-4 py-2 text-xs font-semibold text-white/70 transition hover:text-white disabled:opacity-50"
          >
            {exporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
            Export Orders → SAP
          </button>
          {exportMsg && <p className="text-[11px] text-white/50 sm:text-right max-w-xs">{exportMsg}</p>}
        </div>
      </div>

      {/* Stale-data warning */}
      {syncStatus?.any_stale && (
        <div className="flex items-start gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3">
          <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-400" />
          <div className="text-xs text-amber-400/90">
            <p className="font-semibold">SAP data may be stale</p>
            <p className="mt-0.5 text-amber-400/70">
              {syncStatus.feeds
                .filter((f) => f.stale)
                .map((f) =>
                  f.last_synced_at
                    ? `${f.feed.replace("_", " ")} (${f.age_minutes}m ago)`
                    : `${f.feed.replace("_", " ")} (never synced)`
                )
                .join(" · ")}{" "}
              — older than the {syncStatus.threshold_minutes}-minute threshold. Re-import the latest SAP export.
            </p>
          </div>
        </div>
      )}

      {/* File type selector */}
      <Card className="border-[#2A2A2A] bg-[#1A1A1A]">
        <CardHeader>
          <CardTitle className="text-base text-white">1. Select File Type</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {(Object.entries(FILE_TYPE_META) as [FileType, typeof FILE_TYPE_META[FileType]][]).map(([key, meta]) => {
              const Icon = meta.icon;
              const isActive = fileType === key;
              const colorClasses: Record<string, { border: string; bg: string; text: string }> = {
                emerald: { border: "border-emerald-500", bg: "bg-emerald-500/10", text: "text-emerald-400" },
                amber: { border: "border-amber-500", bg: "bg-amber-500/10", text: "text-amber-400" },
                violet: { border: "border-violet-500", bg: "bg-violet-500/10", text: "text-violet-400" },
                cyan: { border: "border-cyan-500", bg: "bg-cyan-500/10", text: "text-cyan-400" },
              };
              const c = colorClasses[meta.color];
              return (
                <button
                  key={key}
                  onClick={() => {
                    setFileType(key);
                    setResult(null);
                  }}
                  className={`flex items-start gap-3 rounded-lg border p-4 text-left transition ${
                    isActive
                      ? `${c.border} ${c.bg}`
                      : "border-[#2A2A2A] bg-[#0D0D0D] hover:border-[#3A3A3A]"
                  }`}
                >
                  <div className={`rounded-lg p-2 ${c.bg}`}>
                    <Icon className={`h-5 w-5 ${c.text}`} />
                  </div>
                  <div className="flex-1">
                    <p className={`text-sm font-semibold ${isActive ? c.text : "text-white"}`}>
                      {meta.label}
                    </p>
                    <p className="mt-1 text-[11px] text-white/40 leading-tight">{meta.description}</p>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Expected columns reference */}
          <div className="mt-4 rounded-lg border border-[#2A2A2A] bg-[#0D0D0D] p-3">
            <p className="text-[10px] uppercase tracking-wider font-semibold text-white/40 mb-2">
              Expected columns for {FILE_TYPE_META[fileType].label}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {expectedCols.map((col) => (
                <code key={col} className="rounded bg-[#1A1A1A] px-2 py-1 text-[10px] font-mono text-white/60">
                  {col}
                </code>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Upload zone */}
      <Card className="border-[#2A2A2A] bg-[#1A1A1A]">
        <CardHeader>
          <CardTitle className="text-base text-white">2. Upload CSV File</CardTitle>
        </CardHeader>
        <CardContent>
          {!file ? (
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={onDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed p-12 text-center cursor-pointer transition ${
                dragging
                  ? "border-[#00BFA6] bg-[#00BFA6]/5"
                  : "border-[#2A2A2A] bg-[#0D0D0D] hover:border-[#3A3A3A]"
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={onSelect}
                className="hidden"
              />
              <div className="rounded-full bg-[#00BFA6]/10 p-3">
                <Upload className="h-6 w-6 text-[#00BFA6]" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">
                  Drop your {FILE_TYPE_META[fileType].label} CSV here
                </p>
                <p className="mt-1 text-xs text-white/40">or click to browse · Max 10 MB</p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* File summary */}
              <div className="flex items-center justify-between rounded-lg border border-[#2A2A2A] bg-[#0D0D0D] p-3">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-[#00BFA6]/10 p-2">
                    <FileText className="h-5 w-5 text-[#00BFA6]" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">{file.name}</p>
                    <p className="text-[10px] text-white/40">
                      {(file.size / 1024).toFixed(1)} KB · {preview?.totalRows ?? 0} data rows
                    </p>
                  </div>
                </div>
                <button
                  onClick={clearFile}
                  disabled={uploading}
                  className="rounded-lg p-1.5 text-white/40 hover:bg-white/5 hover:text-white disabled:opacity-50"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Column validation */}
              {preview && (previewMissingCols.length > 0 || previewExtraCols.length > 0) && (
                <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 space-y-2">
                  <div className="flex items-center gap-2 text-amber-400">
                    <AlertTriangle className="h-4 w-4" />
                    <p className="text-xs font-semibold">Column mismatch detected</p>
                  </div>
                  {previewMissingCols.length > 0 && (
                    <p className="text-[11px] text-amber-400/80">
                      <span className="font-semibold">Missing required:</span>{" "}
                      {previewMissingCols.map((c) => (
                        <code key={c} className="mx-0.5 rounded bg-amber-500/20 px-1.5 py-0.5 font-mono">
                          {c}
                        </code>
                      ))}
                    </p>
                  )}
                  {previewExtraCols.length > 0 && (
                    <p className="text-[11px] text-amber-400/80">
                      <span className="font-semibold">Unexpected columns (will be ignored):</span>{" "}
                      {previewExtraCols.map((c) => (
                        <code key={c} className="mx-0.5 rounded bg-amber-500/20 px-1.5 py-0.5 font-mono">
                          {c}
                        </code>
                      ))}
                    </p>
                  )}
                </div>
              )}

              {/* Preview table */}
              {preview && preview.rows.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-[10px] uppercase tracking-wider font-semibold text-white/40 flex items-center gap-1.5">
                      <Eye className="h-3 w-3" />
                      Preview · First {preview.rows.length} rows of {preview.totalRows}
                    </p>
                  </div>
                  <div className="overflow-x-auto rounded-lg border border-[#2A2A2A]">
                    <table className="w-full text-xs">
                      <thead className="bg-[#0D0D0D]">
                        <tr className="border-b border-[#2A2A2A]">
                          {preview.headers.map((h) => (
                            <th
                              key={h}
                              className={`px-3 py-2 text-left font-mono ${
                                expectedCols.includes(h) ? "text-white/60" : "text-amber-400/70"
                              }`}
                            >
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {preview.rows.map((row, i) => (
                          <tr key={i} className="border-b border-[#2A2A2A]/50">
                            {row.map((cell, j) => (
                              <td key={j} className="px-3 py-2 text-white/80 font-mono">
                                {cell || <span className="text-white/20">—</span>}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {error && (
                <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-400 flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              {/* Upload button */}
              <div className="flex justify-end gap-3">
                <button
                  onClick={clearFile}
                  disabled={uploading}
                  className="rounded-lg border border-[#2A2A2A] bg-[#0D0D0D] px-4 py-2 text-xs font-semibold text-white/60 hover:text-white disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={upload}
                  disabled={uploading || previewMissingCols.length > 0}
                  className="flex items-center gap-2 rounded-lg bg-[#00BFA6] px-5 py-2 text-xs font-semibold text-black transition hover:bg-[#00BFA6]/90 disabled:opacity-40 disabled:cursor-not-allowed"
                  title={
                    previewMissingCols.length > 0
                      ? "Fix missing required columns first"
                      : "Upload to SAP sync engine"
                  }
                >
                  {uploading ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Upload className="h-3.5 w-3.5" />
                  )}
                  {uploading ? "Importing..." : "Import to Portal"}
                </button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Result panel */}
      {result && (
        <Card
          className={`border ${
            result.records_failed === 0
              ? "border-emerald-500/30 bg-emerald-500/5"
              : "border-amber-500/30 bg-amber-500/5"
          }`}
        >
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base text-white">
              {result.records_failed === 0 ? (
                <>
                  <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                  Import Successful
                </>
              ) : (
                <>
                  <AlertTriangle className="h-5 w-5 text-amber-400" />
                  Import Completed with Errors
                </>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div>
                <p className="text-[10px] uppercase tracking-wider font-semibold text-white/40">Processed</p>
                <p className="mt-1 text-2xl font-bold text-emerald-400">{result.records_processed}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider font-semibold text-white/40">Failed</p>
                <p className={`mt-1 text-2xl font-bold ${result.records_failed > 0 ? "text-red-400" : "text-white/40"}`}>
                  {result.records_failed}
                </p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider font-semibold text-white/40">Duration</p>
                <p className="mt-1 text-2xl font-bold text-white">{formatDuration(result.duration_ms)}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider font-semibold text-white/40">Sync Log</p>
                <p className="mt-1 text-xs font-mono text-white/60 truncate" title={result.sync_log_id}>
                  {result.sync_log_id.slice(0, 8)}...
                </p>
              </div>
            </div>

            {/* Error details */}
            {result.error_details && result.error_details.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-semibold text-red-400">
                    {result.error_details.length} row{result.error_details.length !== 1 ? "s" : ""} rejected
                  </p>
                  <button
                    onClick={() => setShowAllErrors(!showAllErrors)}
                    className="text-[10px] text-white/40 hover:text-white underline"
                  >
                    {showAllErrors ? "Show less" : "Show all"}
                  </button>
                </div>
                <div className="max-h-64 overflow-y-auto rounded-lg border border-red-500/20 bg-red-500/5">
                  <table className="w-full text-xs">
                    <thead className="sticky top-0 bg-red-500/10">
                      <tr>
                        <th className="px-3 py-2 text-left text-red-400 font-semibold">Row</th>
                        <th className="px-3 py-2 text-left text-red-400 font-semibold">Reason</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(showAllErrors ? result.error_details : result.error_details.slice(0, 10)).map((err, i) => (
                        <tr key={i} className="border-t border-red-500/10">
                          <td className="px-3 py-1.5 font-mono text-red-400/80">{err.row}</td>
                          <td className="px-3 py-1.5 text-red-400/80">{err.reason}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {!showAllErrors && result.error_details.length > 10 && (
                  <p className="mt-2 text-center text-[10px] text-white/40">
                    +{result.error_details.length - 10} more · Click "Show all" above
                  </p>
                )}
              </div>
            )}

            <div className="flex justify-end gap-3 pt-2 border-t border-white/5">
              <button
                onClick={clearFile}
                className="rounded-lg border border-[#2A2A2A] bg-[#0D0D0D] px-4 py-2 text-xs font-semibold text-white/60 hover:text-white"
              >
                Upload Another
              </button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent sync history */}
      <Card className="border-[#2A2A2A] bg-[#1A1A1A]">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base text-white">
            <Clock className="h-4 w-4 text-[#00BFA6]" />
            Recent Sync History
          </CardTitle>
          <button
            onClick={fetchLogs}
            disabled={logsLoading}
            className="flex items-center gap-1.5 rounded-lg border border-[#2A2A2A] bg-[#0D0D0D] px-3 py-1.5 text-xs font-semibold text-white/60 hover:text-white disabled:opacity-50"
          >
            <RefreshCw className={`h-3 w-3 ${logsLoading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </CardHeader>
        <CardContent>
          {logsUnavailable ? (
            <div className="rounded-lg border border-blue-500/30 bg-blue-500/10 p-3 text-xs text-blue-400 flex items-start gap-2">
              <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
              <span>
                Sync log table is not yet provisioned in Supabase. After running the next migration, history will appear here automatically.
              </span>
            </div>
          ) : logsLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-5 w-5 animate-spin text-white/30" />
            </div>
          ) : logs.length === 0 ? (
            <div className="py-12 text-center">
              <Database className="mx-auto h-8 w-8 text-white/20" />
              <p className="mt-2 text-sm text-white/40">No sync history yet</p>
              <p className="text-xs text-white/30">Upload a CSV above to record your first sync</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#2A2A2A]">
                    <th className="px-3 py-2 text-left text-[10px] uppercase tracking-wider font-semibold text-white/40">Status</th>
                    <th className="px-3 py-2 text-left text-[10px] uppercase tracking-wider font-semibold text-white/40">Type</th>
                    <th className="px-3 py-2 text-left text-[10px] uppercase tracking-wider font-semibold text-white/40">File</th>
                    <th className="px-3 py-2 text-center text-[10px] uppercase tracking-wider font-semibold text-white/40">Processed</th>
                    <th className="px-3 py-2 text-center text-[10px] uppercase tracking-wider font-semibold text-white/40">Failed</th>
                    <th className="px-3 py-2 text-left text-[10px] uppercase tracking-wider font-semibold text-white/40">Started</th>
                    <th className="px-3 py-2 text-left text-[10px] uppercase tracking-wider font-semibold text-white/40">Duration</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => {
                    const duration =
                      log.started_at && log.completed_at
                        ? new Date(log.completed_at).getTime() - new Date(log.started_at).getTime()
                        : null;
                    const statusBadgeClass =
                      log.status === "completed" && log.records_failed === 0
                        ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                        : log.status === "completed"
                        ? "border-amber-500/30 bg-amber-500/10 text-amber-400"
                        : log.status === "failed"
                        ? "border-red-500/30 bg-red-500/10 text-red-400"
                        : "border-blue-500/30 bg-blue-500/10 text-blue-400";
                    const statusLabel =
                      log.status === "completed" && log.records_failed === 0
                        ? "✓ Success"
                        : log.status === "completed"
                        ? "⚠ Partial"
                        : log.status === "failed"
                        ? "✕ Failed"
                        : log.status === "running"
                        ? "● Running"
                        : log.status;
                    return (
                      <tr key={log.id} className="border-b border-[#2A2A2A]/50 hover:bg-white/[0.02]">
                        <td className="px-3 py-2">
                          <Badge variant="outline" className={`${statusBadgeClass} text-[10px] uppercase font-semibold`}>
                            {statusLabel}
                          </Badge>
                        </td>
                        <td className="px-3 py-2">
                          <span className="text-xs text-white/60 capitalize">
                            {log.file_type.replace("_", " ")}
                          </span>
                        </td>
                        <td className="px-3 py-2 max-w-xs">
                          <span className="text-xs font-mono text-white/80 truncate block" title={log.file_name}>
                            {log.file_name}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-center text-xs font-mono text-emerald-400">
                          {log.records_processed ?? 0}
                        </td>
                        <td className={`px-3 py-2 text-center text-xs font-mono ${log.records_failed > 0 ? "text-red-400" : "text-white/40"}`}>
                          {log.records_failed ?? 0}
                        </td>
                        <td className="px-3 py-2 text-xs text-white/60">{formatDateTime(log.started_at)}</td>
                        <td className="px-3 py-2 text-xs text-white/60">
                          {duration ? formatDuration(duration) : "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Help footer */}
      <div className="rounded-lg border border-[#2A2A2A] bg-[#0D0D0D] p-4">
        <p className="text-xs font-semibold text-white mb-2">📋 How to export from SAP</p>
        <ol className="space-y-1 text-xs text-white/60 list-decimal list-inside">
          <li>Run the relevant SAP transaction or scheduled report.</li>
          <li>Export the result as CSV with UTF-8 encoding and comma delimiters.</li>
          <li>Verify the column headers match the expected schema shown above.</li>
          <li>Upload here. The system will validate per-row and report any rejected lines.</li>
          <li>Re-export and re-upload only the failed rows if needed.</li>
        </ol>
      </div>
    </div>
  );
}
