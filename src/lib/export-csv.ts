// src/lib/export-csv.ts
//
// Small client-side CSV export helper for report pages. Builds a CSV string
// from a list of rows + column definitions and triggers a browser download.
// No server round-trip — operates on data already loaded in the page.

export interface CsvColumn<T> {
  header: string;
  value: (row: T) => string | number | null | undefined;
}

function escapeCell(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";
  const s = String(value);
  // Quote if the cell contains a comma, quote, or newline.
  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export function buildCsv<T>(rows: T[], columns: CsvColumn<T>[]): string {
  const header = columns.map((c) => escapeCell(c.header)).join(",");
  const body = rows.map((row) => columns.map((c) => escapeCell(c.value(row))).join(",")).join("\r\n");
  return body ? `${header}\r\n${body}` : header;
}

export function downloadCsv<T>(filename: string, rows: T[], columns: CsvColumn<T>[]): void {
  const csv = buildCsv(rows, columns);
  // Prepend a UTF-8 BOM so Excel renders Arabic/diacritics correctly.
  const blob = new Blob(["﻿", csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename.endsWith(".csv") ? filename : `${filename}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
