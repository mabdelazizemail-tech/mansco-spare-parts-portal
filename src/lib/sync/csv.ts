// src/lib/sync/csv.ts
//
// Shared CSV helpers for the SAP sync engine. Extracted from parts-importer so
// every importer/exporter uses one parser/serializer instead of duplicating.

export type CsvRow = Record<string, string>;

/**
 * Minimal RFC-4180-compatible CSV parser.
 * Handles quoted fields, escaped quotes (""), and embedded commas/newlines.
 * Header names are lower-cased and trimmed. Adequate for the structured SAP
 * exports we control; switch to papaparse if dealing with messier sources.
 */
export function parseCsv(content: string): CsvRow[] {
  const text = content.replace(/^﻿/, ""); // strip BOM
  const rows: string[][] = [];
  let field = "";
  let row: string[] = [];
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ",") {
        row.push(field);
        field = "";
      } else if (ch === "\n" || ch === "\r") {
        if (ch === "\r" && text[i + 1] === "\n") i++;
        row.push(field);
        field = "";
        rows.push(row);
        row = [];
      } else {
        field += ch;
      }
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  if (rows.length === 0) return [];
  const headers = rows[0].map((h) => h.trim().toLowerCase());
  const out: CsvRow[] = [];
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    if (r.length === 1 && r[0] === "") continue; // skip empty lines
    const obj: CsvRow = {};
    for (let c = 0; c < headers.length; c++) {
      obj[headers[c]] = (r[c] ?? "").trim();
    }
    out.push(obj);
  }
  return out;
}

/** Escape a single CSV cell (quote when it contains comma/quote/newline). */
export function csvCell(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";
  const s = String(value);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** Serialize rows (objects) to a CSV string given an ordered column list. */
export function toCsv<T>(rows: T[], columns: { header: string; key: keyof T }[]): string {
  const head = columns.map((c) => csvCell(c.header)).join(",");
  const body = rows
    .map((r) => columns.map((c) => csvCell(r[c.key] as string | number | null | undefined)).join(","))
    .join("\r\n");
  return body ? `${head}\r\n${body}` : head;
}
