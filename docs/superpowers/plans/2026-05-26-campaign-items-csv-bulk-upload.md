# Campaign Items CSV Bulk Upload — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task.

**Goal:** Replace manual one-by-one item entry in the campaign wizard's Items step with CSV-only bulk upload, featuring template download, validation, inline editing preview, and seamless integration.

**Architecture:** CSV upload is handled by a self-contained component (`ItemsCSVUpload`) that manages parsing, validation, and preview state independently. Helper modules handle CSV I/O (parse, validate, download), keeping concerns separated. The component integrates into the existing campaign wizard via a callback pattern.

**Tech Stack:** 
- **CSV parsing:** papaparse (already available in Next.js)
- **Validation:** Zod (for schema) + custom validation functions
- **Component:** React (hooks), shadcn/ui components
- **Testing:** Vitest (unit), Playwright (E2E)

---

## File Structure

```
src/
├── components/
│   └── campaign-wizard/
│       └── items-csv-upload.tsx           # NEW: Main upload + preview component
├── lib/
│   ├── csv/                               # NEW: CSV utilities
│   │   ├── parser.ts                      # Parse CSV file with error handling
│   │   ├── validator.ts                   # Validate individual rows
│   │   ├── template-generator.ts          # Generate sample CSV content
│   │   └── schemas.ts                     # Zod schema for campaign items
│   └── validators/
│       └── campaign-item.ts               # May already exist or will be updated
└── utils/
    └── csv-download.ts                    # NEW: Trigger browser CSV download

tests/
├── unit/
│   ├── csv-parser.test.ts                 # Test parsing logic
│   ├── csv-validator.test.ts              # Test validation rules
│   └── csv-template-generator.test.ts     # Test template generation
└── e2e/
    └── campaign-wizard-csv-upload.spec.ts # E2E campaign CSV flow
```

**Files to Modify:**
- `src/app/dashboard/admin/campaigns/new/page.tsx` — Remove manual item entry UI, integrate CSV component

---

## Tasks

### Task 1: Create CSV Download Utility

**Files:**
- Create: `src/utils/csv-download.ts`
- Test: `tests/unit/csv-download.test.ts` (optional, simple utility)

- [ ] **Step 1: Write the CSV download utility**

Create `src/utils/csv-download.ts`:

```typescript
/**
 * Trigger a browser download of CSV content
 * @param content - CSV content as string
 * @param filename - Name of the file to download (e.g., "campaign-items-template.csv")
 */
export function downloadCSV(content: string, filename: string): void {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  link.style.visibility = "hidden";
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
```

- [ ] **Step 2: Commit**

```bash
git add src/utils/csv-download.ts
git commit -m "feat: add CSV download utility"
```

---

### Task 2: Create Zod Schema for Campaign Items

**Files:**
- Create: `src/lib/csv/schemas.ts`

- [ ] **Step 1: Create the schema file**

Create `src/lib/csv/schemas.ts`:

```typescript
import { z } from "zod";

export const campaignItemSchema = z.object({
  part_number: z
    .string()
    .min(1, "Part Number is required")
    .trim(),
  part_description: z
    .string()
    .max(200, "Description must not exceed 200 characters")
    .optional()
    .default(""),
  discount_type: z
    .enum(["percentage", "fixed"], {
      errorMap: () => ({ message: "Discount Type must be 'Percentage' or 'Fixed'" }),
    }),
  discount_value: z
    .number()
    .gt(0, "Discount Value must be greater than 0")
    .refine(
      (val, { path }) =>
        path[0] === "discount_type" && val > 100
          ? false
          : true,
      { message: "Percentage cannot exceed 100%" }
    ),
  min_order_quantity: z
    .number()
    .int("Min Order Quantity must be a whole number")
    .gte(1, "Min Order Quantity must be at least 1"),
});

export type CampaignItem = z.infer<typeof campaignItemSchema>;

/**
 * Validate a single row (as a plain object from CSV)
 * Returns { valid: boolean, errors: string[] }
 */
export function validateCampaignItemRow(
  row: Record<string, any>
): { valid: boolean; errors: string[] } {
  const result = campaignItemSchema.safeParse({
    part_number: row["Part Number"]?.toString().trim() || "",
    part_description: row["Description"]?.toString().trim() || "",
    discount_type: row["Discount Type"]?.toString().toLowerCase().trim() || "",
    discount_value: Number(row["Discount Value"]) || 0,
    min_order_quantity: Number(row["Min Order Quantity"]) || 0,
  });

  if (!result.success) {
    const errors = result.error.errors.map((e) => e.message);
    return { valid: false, errors };
  }

  return { valid: true, errors: [] };
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/csv/schemas.ts
git commit -m "feat: add campaign item validation schema"
```

---

### Task 3: Create CSV Parser

**Files:**
- Create: `src/lib/csv/parser.ts`

- [ ] **Step 1: Create the parser**

Create `src/lib/csv/parser.ts`:

```typescript
import Papa from "papaparse";

export interface ParseResult {
  rows: Record<string, string>[];
  errors: string[];
}

const REQUIRED_COLUMNS = [
  "Part Number",
  "Description",
  "Discount Type",
  "Discount Value",
  "Min Order Quantity",
];

/**
 * Parse a CSV file and validate structure
 * @param file - The CSV file to parse
 * @returns { rows: parsed rows, errors: file-level errors }
 */
export async function parseCSVFile(file: File): Promise<ParseResult> {
  if (!file) {
    return { rows: [], errors: ["No file selected"] };
  }

  if (!file.name.endsWith(".csv")) {
    return { rows: [], errors: ["File must be a CSV file"] };
  }

  return new Promise((resolve) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const errors: string[] = [];

        // Check if file is empty
        if (!results.data || results.data.length === 0) {
          errors.push("CSV file is empty, please select a valid file");
        }

        // Check for required columns
        if (results.data && results.data.length > 0) {
          const firstRow = results.data[0] as Record<string, any>;
          const missingColumns = REQUIRED_COLUMNS.filter(
            (col) => !(col in firstRow)
          );
          if (missingColumns.length > 0) {
            errors.push(
              `Missing required columns: ${missingColumns.join(", ")}`
            );
          }
        }

        if (errors.length > 0) {
          resolve({ rows: [], errors });
        } else {
          resolve({ rows: results.data as Record<string, string>[], errors: [] });
        }
      },
      error: (err) => {
        resolve({
          rows: [],
          errors: [`Failed to parse CSV: ${err.message}`],
        });
      },
    });
  });
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/csv/parser.ts
git commit -m "feat: add CSV file parser"
```

---

### Task 4: Create Validator

**Files:**
- Modify: `src/lib/csv/schemas.ts` (already created in Task 2)
- Create: `src/lib/csv/validator.ts`

- [ ] **Step 1: Create the validator module**

Create `src/lib/csv/validator.ts`:

```typescript
import { validateCampaignItemRow } from "./schemas";

export interface ValidatedRow {
  index: number;
  data: Record<string, string>;
  valid: boolean;
  errors: string[];
}

/**
 * Validate all rows from parsed CSV
 * @param rows - Array of parsed CSV rows
 * @returns Array of ValidatedRow objects with validation status
 */
export function validateCSVRows(
  rows: Record<string, string>[]
): ValidatedRow[] {
  return rows.map((row, index) => {
    const validation = validateCampaignItemRow(row);
    return {
      index: index + 1,
      data: row,
      valid: validation.valid,
      errors: validation.errors,
    };
  });
}

/**
 * Check if all rows are valid
 */
export function allRowsValid(validatedRows: ValidatedRow[]): boolean {
  return validatedRows.every((row) => row.valid);
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/csv/validator.ts
git commit -m "feat: add CSV row validator"
```

---

### Task 5: Create Template Generator

**Files:**
- Create: `src/lib/csv/template-generator.ts`

- [ ] **Step 1: Create the template generator**

Create `src/lib/csv/template-generator.ts`:

```typescript
/**
 * Generate sample CSV content for the campaign items template
 * @returns CSV content as string (header + 3 example rows)
 */
export function generateCampaignItemsTemplate(): string {
  const header = [
    "Part Number",
    "Description",
    "Discount Type",
    "Discount Value",
    "Min Order Quantity",
  ].join(",");

  const examples = [
    ['PSA-4249.34', 'Brake Pad Set', 'Percentage', '10', '1'],
    ['PSA-1234.56', 'Oil Filter', 'Fixed', '150', '2'],
    ['PSA-7890.12', 'Air Filter', 'Percentage', '15', '1'],
  ];

  const rows = examples.map((row) => row.join(",")).join("\n");

  return `${header}\n${rows}`;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/csv/template-generator.ts
git commit -m "feat: add CSV template generator"
```

---

### Task 6: Create Unit Tests for CSV Utilities

**Files:**
- Create: `tests/unit/csv-parser.test.ts`
- Create: `tests/unit/csv-validator.test.ts`
- Create: `tests/unit/csv-template-generator.test.ts`

- [ ] **Step 1: Write parser tests**

Create `tests/unit/csv-parser.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { parseCSVFile } from "@/lib/csv/parser";

describe("CSV Parser", () => {
  it("should parse a valid CSV file", async () => {
    const csvContent = `Part Number,Description,Discount Type,Discount Value,Min Order Quantity
PSA-4249.34,Brake Pad Set,Percentage,10,1`;
    const file = new File([csvContent], "test.csv", { type: "text/csv" });

    const result = await parseCSVFile(file);

    expect(result.errors).toEqual([]);
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0]["Part Number"]).toBe("PSA-4249.34");
  });

  it("should return error for empty file", async () => {
    const file = new File([""], "test.csv", { type: "text/csv" });

    const result = await parseCSVFile(file);

    expect(result.errors).toContain(
      "CSV file is empty, please select a valid file"
    );
    expect(result.rows).toHaveLength(0);
  });

  it("should detect missing required columns", async () => {
    const csvContent = `Part Number,Description
PSA-4249.34,Brake Pad Set`;
    const file = new File([csvContent], "test.csv", { type: "text/csv" });

    const result = await parseCSVFile(file);

    expect(result.errors.some((e) => e.includes("Missing required columns"))).toBe(true);
  });

  it("should reject non-CSV files", async () => {
    const file = new File(["data"], "test.txt", { type: "text/plain" });

    const result = await parseCSVFile(file);

    expect(result.errors).toContain("File must be a CSV file");
  });
});
```

- [ ] **Step 2: Write validator tests**

Create `tests/unit/csv-validator.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { validateCSVRows, allRowsValid } from "@/lib/csv/validator";

describe("CSV Validator", () => {
  it("should validate a valid row", () => {
    const rows = [
      {
        "Part Number": "PSA-4249.34",
        "Description": "Brake Pad Set",
        "Discount Type": "Percentage",
        "Discount Value": "10",
        "Min Order Quantity": "1",
      },
    ];

    const validated = validateCSVRows(rows);

    expect(validated).toHaveLength(1);
    expect(validated[0].valid).toBe(true);
    expect(validated[0].errors).toHaveLength(0);
  });

  it("should reject row with missing part number", () => {
    const rows = [
      {
        "Part Number": "",
        "Description": "Brake Pad Set",
        "Discount Type": "Percentage",
        "Discount Value": "10",
        "Min Order Quantity": "1",
      },
    ];

    const validated = validateCSVRows(rows);

    expect(validated[0].valid).toBe(false);
    expect(validated[0].errors[0]).toContain("Part Number is required");
  });

  it("should reject percentage > 100", () => {
    const rows = [
      {
        "Part Number": "PSA-4249.34",
        "Description": "Brake Pad Set",
        "Discount Type": "Percentage",
        "Discount Value": "150",
        "Min Order Quantity": "1",
      },
    ];

    const validated = validateCSVRows(rows);

    expect(validated[0].valid).toBe(false);
    expect(validated[0].errors.some((e) => e.includes("cannot exceed 100%"))).toBe(true);
  });

  it("should accept case-insensitive discount type", () => {
    const rows = [
      {
        "Part Number": "PSA-4249.34",
        "Description": "Brake Pad Set",
        "Discount Type": "PERCENTAGE",
        "Discount Value": "10",
        "Min Order Quantity": "1",
      },
    ];

    const validated = validateCSVRows(rows);

    expect(validated[0].valid).toBe(true);
  });

  it("should detect when not all rows are valid", () => {
    const rows = [
      {
        "Part Number": "PSA-4249.34",
        "Description": "Brake Pad Set",
        "Discount Type": "Percentage",
        "Discount Value": "10",
        "Min Order Quantity": "1",
      },
      {
        "Part Number": "",
        "Description": "Oil Filter",
        "Discount Type": "Fixed",
        "Discount Value": "150",
        "Min Order Quantity": "2",
      },
    ];

    const validated = validateCSVRows(rows);

    expect(allRowsValid(validated)).toBe(false);
  });
});
```

- [ ] **Step 3: Write template generator tests**

Create `tests/unit/csv-template-generator.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { generateCampaignItemsTemplate } from "@/lib/csv/template-generator";
import { parseCSVFile } from "@/lib/csv/parser";

describe("CSV Template Generator", () => {
  it("should generate valid CSV template", () => {
    const template = generateCampaignItemsTemplate();

    expect(template).toContain("Part Number");
    expect(template).toContain("Discount Type");
    expect(template).toContain("Discount Value");
    expect(template).toContain("Min Order Quantity");
  });

  it("should include example rows", () => {
    const template = generateCampaignItemsTemplate();

    expect(template).toContain("PSA-4249.34");
    expect(template).toContain("Brake Pad Set");
    expect(template).toContain("Percentage");
  });

  it("should generate parseable CSV", async () => {
    const template = generateCampaignItemsTemplate();
    const file = new File([template], "template.csv", { type: "text/csv" });

    const result = await parseCSVFile(file);

    expect(result.errors).toHaveLength(0);
    expect(result.rows.length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test -- csv-parser.test.ts csv-validator.test.ts csv-template-generator.test.ts
```

Expected: All tests PASS

- [ ] **Step 5: Commit**

```bash
git add tests/unit/csv-parser.test.ts tests/unit/csv-validator.test.ts tests/unit/csv-template-generator.test.ts
git commit -m "test: add CSV utility unit tests"
```

---

### Task 7: Create ItemsCSVUpload Component

**Files:**
- Create: `src/components/campaign-wizard/items-csv-upload.tsx`

- [ ] **Step 1: Create the component**

Create `src/components/campaign-wizard/items-csv-upload.tsx`:

```typescript
"use client";

import { useState } from "react";
import { Upload, Download, AlertCircle, CheckCircle2, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { parseCSVFile } from "@/lib/csv/parser";
import { validateCSVRows, allRowsValid, ValidatedRow } from "@/lib/csv/validator";
import { generateCampaignItemsTemplate } from "@/lib/csv/template-generator";
import { downloadCSV } from "@/utils/csv-download";

export type CampaignItemDraft = {
  key: string;
  part_number: string;
  part_description: string;
  discount_type: "percentage" | "fixed";
  discount_value: number;
  min_order_quantity: number;
};

interface ItemsCSVUploadProps {
  onItemsConfirmed: (items: CampaignItemDraft[]) => void;
  onCancel?: () => void;
}

let keyCounter = 0;
function newKey() {
  return `item-${++keyCounter}`;
}

export default function ItemsCSVUpload({
  onItemsConfirmed,
  onCancel,
}: ItemsCSVUploadProps) {
  const [fileError, setFileError] = useState<string>("");
  const [validatedRows, setValidatedRows] = useState<ValidatedRow[]>([]);
  const [editingRowIndex, setEditingRowIndex] = useState<number | null>(null);
  const [editingValues, setEditingValues] = useState<Record<string, string>>({});

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

    // Parse CSV
    const parseResult = await parseCSVFile(file);
    if (parseResult.errors.length > 0) {
      setFileError(parseResult.errors.join("; "));
      return;
    }

    // Validate rows
    const validated = validateCSVRows(parseResult.rows);
    setValidatedRows(validated);
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
    const validated = validateCSVRows([editingValues]);
    updatedRows[rowIndex] = {
      ...validated[0],
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
      discount_type: (row.data["Discount Type"]
        .toLowerCase()
        .trim() as "percentage" | "fixed"),
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
    document.getElementById("csv-file-input")?.click();
  };

  // ── Render empty state ────────────────────────────────────────────
  if (validatedRows.length === 0 && !fileError) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-white/60">
          Download the template, fill it with your items, then upload it here.
        </p>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={handleDownloadTemplate}
            className="flex items-center gap-2 rounded-lg border border-[#2A2A2A] bg-[#0D0D0D] px-4 py-2.5 text-sm font-semibold text-white/60 transition hover:border-[#00BFA6]/40 hover:text-[#00BFA6]"
          >
            <Download className="h-4 w-4" />
            Download Template
          </button>
          <label>
            <input
              id="csv-file-input"
              type="file"
              accept=".csv"
              onChange={handleFileSelect}
              className="hidden"
            />
            <button
              onClick={() => document.getElementById("csv-file-input")?.click()}
              className="flex items-center gap-2 rounded-lg bg-[#00BFA6] px-4 py-2.5 text-sm font-semibold text-black transition hover:bg-[#00BFA6]/90"
            >
              <Upload className="h-4 w-4" />
              Upload CSV
            </button>
          </label>
        </div>
      </div>
    );
  }

  // ── Render file error ─────────────────────────────────────────────
  if (fileError) {
    return (
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
    );
  }

  // ── Render preview table ──────────────────────────────────────────
  const isValid = allRowsValid(validatedRows);

  return (
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
            {validatedRows.filter((r) => !r.valid).length} item{validatedRows.filter((r) => !r.valid).length !== 1 ? "s" : ""} need
            to be fixed
          </p>
        </div>
      )}

      {/* Preview table */}
      <Card className="border-[#2A2A2A] bg-[#1A1A1A] overflow-x-auto">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#2A2A2A]">
                <th className="text-left px-3 py-3 text-xs font-semibold uppercase text-white/40">
                  Row
                </th>
                <th className="text-left px-3 py-3 text-xs font-semibold uppercase text-white/40">
                  Part Number
                </th>
                <th className="text-left px-3 py-3 text-xs font-semibold uppercase text-white/40">
                  Description
                </th>
                <th className="text-left px-3 py-3 text-xs font-semibold uppercase text-white/40">
                  Type
                </th>
                <th className="text-left px-3 py-3 text-xs font-semibold uppercase text-white/40">
                  Value
                </th>
                <th className="text-left px-3 py-3 text-xs font-semibold uppercase text-white/40">
                  Min Qty
                </th>
                <th className="text-left px-3 py-3 text-xs font-semibold uppercase text-white/40">
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              {validatedRows.map((row, idx) => (
                <tbody key={row.index}>
                  <tr
                    className={`border-b border-[#2A2A2A] ${
                      row.valid ? "bg-green-500/5" : "bg-red-500/5"
                    }`}
                  >
                    <td className="px-3 py-3 text-xs text-white/60">{row.index}</td>
                    <td className="px-3 py-3 text-xs text-white">
                      {editingRowIndex === idx ? (
                        <input
                          type="text"
                          value={editingValues["Part Number"] || ""}
                          onChange={(e) =>
                            handleEditChange("Part Number", e.target.value)
                          }
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
                          onChange={(e) =>
                            handleEditChange("Description", e.target.value)
                          }
                          className="h-8 w-full rounded border border-[#2A2A2A] bg-[#0D0D0D] px-2 text-xs text-white placeholder:text-white/30 focus:border-[#00BFA6] focus:outline-none"
                        />
                      ) : (
                        row.data["Description"] || "—"
                      )}
                    </td>
                    <td className="px-3 py-3 text-xs text-white">
                      {editingRowIndex === idx ? (
                        <select
                          value={editingValues["Discount Type"] || ""}
                          onChange={(e) =>
                            handleEditChange("Discount Type", e.target.value)
                          }
                          className="h-8 rounded border border-[#2A2A2A] bg-[#0D0D0D] px-2 text-xs text-white focus:border-[#00BFA6] focus:outline-none"
                        >
                          <option value="">Select</option>
                          <option value="Percentage">Percentage</option>
                          <option value="Fixed">Fixed</option>
                        </select>
                      ) : (
                        row.data["Discount Type"]
                      )}
                    </td>
                    <td className="px-3 py-3 text-xs text-white">
                      {editingRowIndex === idx ? (
                        <input
                          type="number"
                          value={editingValues["Discount Value"] || ""}
                          onChange={(e) =>
                            handleEditChange("Discount Value", e.target.value)
                          }
                          className="h-8 w-20 rounded border border-[#2A2A2A] bg-[#0D0D0D] px-2 text-xs text-white placeholder:text-white/30 focus:border-[#00BFA6] focus:outline-none"
                        />
                      ) : (
                        row.data["Discount Value"]
                      )}
                    </td>
                    <td className="px-3 py-3 text-xs text-white">
                      {editingRowIndex === idx ? (
                        <input
                          type="number"
                          value={editingValues["Min Order Quantity"] || ""}
                          onChange={(e) =>
                            handleEditChange("Min Order Quantity", e.target.value)
                          }
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
                        <span className="text-emerald-400 font-semibold">✓ Valid</span>
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
                      <td colSpan={7} className="px-3 py-2">
                        <p className="text-xs text-red-400">
                          {row.errors.map((err, i) => (
                            <div key={i}>• {err}</div>
                          ))}
                        </p>
                      </td>
                    </tr>
                  )}
                </tbody>
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

      {/* Hidden file input for re-upload */}
      <input
        id="csv-file-input-hidden"
        type="file"
        accept=".csv"
        onChange={handleFileSelect}
        className="hidden"
      />
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/campaign-wizard/items-csv-upload.tsx
git commit -m "feat: add ItemsCSVUpload component with preview and inline editing"
```

---

### Task 8: Integrate CSV Component into Campaign Wizard

**Files:**
- Modify: `src/app/dashboard/admin/campaigns/new/page.tsx`

- [ ] **Step 1: Import the new component**

At the top of `src/app/dashboard/admin/campaigns/new/page.tsx`, add:

```typescript
import ItemsCSVUpload, { type CampaignItemDraft as CSVCampaignItemDraft } from "@/components/campaign-wizard/items-csv-upload";
```

- [ ] **Step 2: Remove manual item management functions**

Find and delete these functions from the component:

```typescript
// REMOVE THESE:
const addItem = () => {
  setItems((prev) => [
    ...prev,
    { key: newKey(), part_number: "", part_description: "", discount_type: "percentage", discount_value: 0, min_order_quantity: 1 },
  ]);
};
const removeItem = (key: string) => setItems((prev) => prev.filter((i) => i.key !== key));
const updateItem = (key: string, field: string, value: unknown) =>
  setItems((prev) => prev.map((i) => (i.key === key ? { ...i, [field]: value } : i)));
```

- [ ] **Step 3: Replace Items step UI**

Find the section:

```typescript
{/* STEP: ITEMS */}
{currentStep.id === "items" && (
  <>
    <div className="flex items-center justify-between">
      <p className="text-xs text-white/60">
        {validItemsCount} item{validItemsCount !== 1 ? "s" : ""} added
      </p>
      <button
        onClick={addItem}
        className="flex items-center gap-1.5 rounded-lg border border-[#2A2A2A] bg-[#0D0D0D] px-3 py-1.5 text-xs font-semibold text-white/60 transition hover:border-[#00BFA6]/40 hover:text-[#00BFA6]"
      >
        <Plus className="h-3 w-3" />
        Add Item
      </button>
    </div>

    {items.map((item, idx) => (
      // ... manual item entry cards ...
    ))}
  </>
)}
```

Replace with:

```typescript
{/* STEP: ITEMS */}
{currentStep.id === "items" && (
  <>
    <ItemsCSVUpload
      onItemsConfirmed={(newItems) => setItems(newItems)}
      onCancel={undefined}
    />
    <p className="text-xs text-white/60 mt-4">
      {validItemsCount} item{validItemsCount !== 1 ? "s" : ""} added
    </p>
  </>
)}
```

- [ ] **Step 4: Remove the Plus icon import if no longer used**

Check if `Plus` is used elsewhere in the file. If only used for the "Add Item" button, remove it from the imports:

```typescript
// Before
import { ArrowLeft, ArrowRight, Save, Loader2, Plus, Trash2, ... } from "lucide-react";

// After (remove Plus)
import { ArrowLeft, ArrowRight, Save, Loader2, Trash2, ... } from "lucide-react";
```

- [ ] **Step 5: Test in browser**

Start the dev server:
```bash
npm run dev
```

Navigate to `/dashboard/admin/campaigns/new` and go to Step 5 (Items).

Expected:
- ✓ See "Download Template" and "Upload CSV" buttons
- ✓ No "Add Item" button
- ✓ Download works
- ✓ Upload triggers file picker
- ✓ Preview shows after upload

- [ ] **Step 6: Commit**

```bash
git add src/app/dashboard/admin/campaigns/new/page.tsx
git commit -m "feat: integrate CSV bulk upload component into campaign wizard"
```

---

### Task 9: Create E2E Tests for Campaign Wizard CSV Flow

**Files:**
- Create: `tests/e2e/campaign-wizard-csv-upload.spec.ts`

- [ ] **Step 1: Write E2E tests**

Create `tests/e2e/campaign-wizard-csv-upload.spec.ts`:

```typescript
import { test, expect } from "@playwright/test";

test.describe("Campaign Wizard - CSV Items Upload", () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to campaign wizard
    await page.goto("/dashboard/admin/campaigns/new");
    
    // Go to items step
    await page.click("text=Items");
  });

  test("should show download and upload buttons initially", async ({ page }) => {
    expect(await page.getByText("Download Template")).toBeVisible();
    expect(await page.getByText("Upload CSV")).toBeVisible();
  });

  test("should download template CSV when button clicked", async ({ page }) => {
    const downloadPromise = page.waitForEvent("download");
    await page.click("text=Download Template");
    const download = await downloadPromise;
    
    expect(download.suggestedFilename()).toBe("campaign-items-template.csv");
  });

  test("should parse and preview valid CSV", async ({ page }) => {
    const csvContent = `Part Number,Description,Discount Type,Discount Value,Min Order Quantity
PSA-4249.34,Brake Pad Set,Percentage,10,1
PSA-1234.56,Oil Filter,Fixed,150,2`;

    const file = Buffer.from(csvContent);
    const input = await page.$('input[accept=".csv"]');
    await input?.setInputFiles({
      name: "test.csv",
      mimeType: "text/csv",
      buffer: file,
    });

    // Preview should appear
    await expect(page.locator("text=All 2 items are valid")).toBeVisible();
  });

  test("should show validation errors for invalid rows", async ({ page }) => {
    const csvContent = `Part Number,Description,Discount Type,Discount Value,Min Order Quantity
,Brake Pad Set,Percentage,10,1
PSA-1234.56,Oil Filter,Fixed,150,2`;

    const file = Buffer.from(csvContent);
    const input = await page.$('input[accept=".csv"]');
    await input?.setInputFiles({
      name: "test.csv",
      mimeType: "text/csv",
      buffer: file,
    });

    // Error should appear
    await expect(page.locator("text=Part Number is required")).toBeVisible();
  });

  test("should allow inline editing of invalid rows", async ({ page }) => {
    const csvContent = `Part Number,Description,Discount Type,Discount Value,Min Order Quantity
,Brake Pad Set,Percentage,10,1`;

    const file = Buffer.from(csvContent);
    const input = await page.$('input[accept=".csv"]');
    await input?.setInputFiles({
      name: "test.csv",
      mimeType: "text/csv",
      buffer: file,
    });

    // Click "Fix" button
    await page.click("text=Fix");

    // Edit the Part Number field
    const inputs = await page.$$("input[type='text']");
    await inputs[0].fill("PSA-4249.34");

    // Click Save
    await page.click("text=Save");

    // Status should update to valid
    await expect(page.locator("text=✓ Valid")).toBeVisible();
  });

  test("should disable confirm button until all rows are valid", async ({ page }) => {
    const csvContent = `Part Number,Description,Discount Type,Discount Value,Min Order Quantity
,Brake Pad Set,Percentage,10,1`;

    const file = Buffer.from(csvContent);
    const input = await page.$('input[accept=".csv"]');
    await input?.setInputFiles({
      name: "test.csv",
      mimeType: "text/csv",
      buffer: file,
    });

    // Confirm button should be disabled
    const confirmButton = page.locator("button:has-text('Confirm')");
    await expect(confirmButton).toBeDisabled();

    // Fix the error
    await page.click("text=Fix");
    const inputs = await page.$$("input[type='text']");
    await inputs[0].fill("PSA-4249.34");
    await page.click("text=Save");

    // Confirm button should now be enabled
    await expect(confirmButton).toBeEnabled();
  });

  test("should allow re-uploading a different CSV", async ({ page }) => {
    const csvContent = `Part Number,Description,Discount Type,Discount Value,Min Order Quantity
PSA-4249.34,Brake Pad Set,Percentage,10,1`;

    const file = Buffer.from(csvContent);
    const input = await page.$('input[accept=".csv"]');
    await input?.setInputFiles({
      name: "test.csv",
      mimeType: "text/csv",
      buffer: file,
    });

    // Wait for preview
    await expect(page.locator("text=All 1 items")).toBeVisible();

    // Click re-upload
    await page.click("text=Re-upload");

    // Preview should disappear and upload UI should reappear
    await expect(page.getByText("Download Template")).toBeVisible();
  });

  test("should add items to wizard state on confirm", async ({ page }) => {
    const csvContent = `Part Number,Description,Discount Type,Discount Value,Min Order Quantity
PSA-4249.34,Brake Pad Set,Percentage,10,1
PSA-1234.56,Oil Filter,Fixed,150,2`;

    const file = Buffer.from(csvContent);
    const input = await page.$('input[accept=".csv"]');
    await input?.setInputFiles({
      name: "test.csv",
      mimeType: "text/csv",
      buffer: file,
    });

    // Confirm
    await page.click("button:has-text('Confirm')");

    // Items count should update
    await expect(page.locator("text=2 items added")).toBeVisible();

    // Can proceed to next step
    await page.click("button:has-text('Continue')");
    await expect(page.locator("text=Review")).toBeVisible();
  });
});
```

- [ ] **Step 2: Run E2E tests**

```bash
npx playwright test tests/e2e/campaign-wizard-csv-upload.spec.ts
```

Expected: All tests PASS

- [ ] **Step 3: Commit**

```bash
git add tests/e2e/campaign-wizard-csv-upload.spec.ts
git commit -m "test: add E2E tests for campaign CSV upload flow"
```

---

### Task 10: Final Integration Test & Documentation

**Files:**
- Create: `docs/CSV_UPLOAD_USAGE.md` (optional documentation)

- [ ] **Step 1: Manual integration test**

Test the complete flow manually:

1. Start dev server: `npm run dev`
2. Navigate to `/dashboard/admin/campaigns/new`
3. Go to Items step (Step 5)
4. Click "Download Template" and verify CSV downloads
5. Open CSV in Excel, add 5-10 rows of valid items
6. Save and upload the CSV
7. Preview should show all valid items
8. Click Confirm
9. Continue to Review step
10. Verify items appear in review summary
11. Create campaign and verify success

- [ ] **Step 2: Run all tests**

```bash
npm test
npx playwright test
```

Expected: All unit tests and E2E tests PASS

- [ ] **Step 3: Verify no regressions**

- [ ] Items step no longer has "Add Item" button
- [ ] Manual item entry is completely removed
- [ ] CSV upload is the only way to add items
- [ ] Existing campaign viewing still works
- [ ] Other wizard steps unchanged

- [ ] **Step 4: Clean up imports (if needed)**

Remove any unused imports from `page.tsx` that were only used for manual item management.

- [ ] **Step 5: Final commit**

```bash
git add -A
git commit -m "feat: complete CSV bulk upload feature with tests and integration"
```

---

## Self-Review Checklist

✅ **Spec Coverage:**
- CSV format with 5 columns → Task 5 (template generator)
- Template download → Task 7 (component)
- CSV parsing → Task 3
- Row validation → Task 4
- Preview table → Task 7 (component)
- Inline editing → Task 7 (component)
- Confirm/re-upload → Task 7 (component)
- Integration into wizard → Task 8

✅ **No Placeholders:** All steps have actual code, commands, and expected outputs

✅ **Type Consistency:** 
- `CampaignItemDraft` type used consistently across all tasks
- Field names match: `part_number`, `part_description`, `discount_type`, `discount_value`, `min_order_quantity`

✅ **Scope:** Feature is focused and self-contained; doesn't depend on unrelated changes

✅ **Testing:** Unit tests for utilities + E2E tests for complete flow
