# Campaign Items CSV Bulk Upload Design

**Date:** 2026-05-26  
**Feature:** CSV bulk upload for campaign items (replaces manual one-by-one entry)  
**Status:** Approved Design

---

## Overview

The campaign wizard's **Items step** (Step 5 of 6) currently allows manual one-by-one item entry via an "Add Item" button. This design removes that button entirely and makes **CSV bulk upload the only way** to add items to a campaign.

Admins will download a pre-formatted CSV template, fill it with item data, upload it, preview the data with inline editing capability, and confirm.

---

## CSV Format & Template

### Column Structure

The CSV file has exactly 5 columns in this order:

| Column | Required | Type | Constraints | Example |
|--------|----------|------|-------------|---------|
| Part Number | Yes | String | Non-empty | PSA-4249.34 |
| Description | No | String | Max 200 chars | Brake Pad Set |
| Discount Type | Yes | Enum | "Percentage" or "Fixed" | Percentage |
| Discount Value | Yes | Number | > 0; ≤ 100 if Percentage | 10 |
| Min Order Quantity | Yes | Number | ≥ 1 | 1 |

### Sample Template File

**Filename:** `campaign-items-template.csv`

```csv
Part Number,Description,Discount Type,Discount Value,Min Order Quantity
PSA-4249.34,Brake Pad Set,Percentage,10,1
PSA-1234.56,Oil Filter,Fixed,150,2
PSA-7890.12,Air Filter,Percentage,15,1
```

The template includes a header row plus 3 example items for reference. Admins download this, delete/replace the examples, add their own items, and upload.

---

## User Journey

### Step 1: Items Upload Section (Empty State)

The current Items step UI is replaced:

**REMOVED:**
- "Add Item" button
- Individual item cards with manual input fields

**ADDED:**
- Help text: "Download the template, fill it with your items, then upload it here"
- **"Download Template"** button (blue outline)
  - Click → browser downloads `campaign-items-template.csv`
- **"Upload CSV"** button (primary teal color)
  - Click → file picker (accepts `.csv` only, `accept=".csv"`)
- Empty state illustration or placeholder

### Step 2: Parse & Preview

After file selection:

1. **Parse CSV**
   - Read file contents
   - Use papaparse library with settings: `{ header: true, skipEmptyLines: true }`
   - Handle encoding (UTF-8 expected)
   - Detect structural errors (missing columns, encoding issues)

2. **Validate Each Row**
   - Run each row through validation rules (see Validation section below)
   - Collect error messages per row

3. **Display Preview Table**

| Row | Part Number | Description | Discount Type | Value | Min Qty | Status |
|-----|-------------|-------------|----------------|-------|---------|--------|
| 1 | PSA-4249.34 | Brake Pad Set | Percentage | 10 | 1 | ✓ Valid |
| 2 | | Oil Filter | Fixed | 150 | 2 | ✗ Invalid: Part Number required |
| 3 | PSA-7890.12 | | Percentage | 150 | 1 | ✗ Invalid: Percentage cannot exceed 100% |

- Status color coding:
  - ✓ **Valid** → green background
  - ✗ **Invalid** → red background with error message displayed below row
  - ⚠ **Warning** (future) → yellow background

### Step 3: Inline Editing (Optional)

- Invalid rows are **editable directly in the preview table**
- Click on an invalid row → cells become editable inputs (same styling as manual entry)
- As user types, validation re-runs in real-time
- Status updates automatically from ✗ to ✓ when errors are resolved
- User can edit multiple rows before confirming
- Edited values are highlighted (subtle border or background tint)

### Step 4: Actions

**Available Buttons:**

1. **"Re-upload"** button
   - Click → open file picker again
   - Discards current preview, starts fresh
   - Useful if user prefers to fix the CSV in Excel and upload again

2. **"Confirm"** button
   - **Enabled ONLY** when all rows are valid (0 red rows)
   - Click → saves items to wizard state
   - Closes preview
   - Updates item count display in the Items step header
   - User can now proceed to next step or review step

3. **"Cancel"** button
   - Closes preview without saving
   - Returns to empty Items step (no items added yet)

---

## Validation Rules

### Row-Level Validation

Each row is validated against these rules in order:

**Part Number:**
- Required (non-empty) → ✓
- Error: "Part Number is required"

**Description:**
- Optional
- If provided: max 200 characters
- Error: "Description must not exceed 200 characters"

**Discount Type:**
- Required (non-empty)
- Must be exactly "Percentage" or "Fixed" (case-insensitive)
- Error: "Discount Type must be 'Percentage' or 'Fixed'"

**Discount Value:**
- Required (non-empty)
- Must be a positive number (> 0)
- If Discount Type is "Percentage": must be ≤ 100
- Errors:
  - "Discount Value is required"
  - "Discount Value must be greater than 0"
  - "Percentage cannot exceed 100%"

**Min Order Quantity:**
- Required (non-empty)
- Must be a whole number ≥ 1
- Error: "Min Order Quantity must be at least 1"

### File-Level Validation

**Before parsing rows:**
- File is empty → Error: "CSV file is empty, please select a valid file"
- File encoding is not UTF-8 (detected via BOM) → Warning: "File may not be UTF-8 encoded; results may be unpredictable"
- Missing required columns (Part Number, Discount Type, Discount Value, Min Order Quantity) → Error: "Missing required columns: [list missing columns]"

---

## Error Handling & Messages

### File-Level Errors

Shown in an error banner at the top of the preview section:

```
⚠️ CSV file is missing required columns: Discount Type, Min Order Quantity
[Re-upload] [Cancel]
```

User must re-upload a valid file.

### Row-Level Errors

Displayed inline below each invalid row in red text:

```
Row 2: PSA-1234.56 | Oil Filter | Fixed | 150 | 2
⚠️ Part Number is required
```

User can click the row to edit and fix the error, or re-upload a corrected CSV.

### Success State

Once all rows are valid:

```
✓ All 3 items are valid and ready to add
[Confirm] [Re-upload] [Cancel]
```

---

## Component Architecture

### New Files

```
src/
├── components/
│   └── campaign-wizard/
│       └── items-csv-upload.tsx           # Main upload + preview component
├── lib/
│   └── csv/
│       ├── parser.ts                      # CSV parsing
│       ├── validator.ts                   # Row-level validation logic
│       ├── template-generator.ts          # Sample template generation
│       └── schemas.ts                     # Zod schema for campaign items
└── utils/
    └── csv-download.ts                    # Trigger browser CSV download
```

### Component: `items-csv-upload.tsx`

**Props:**
```typescript
interface ItemsCSVUploadProps {
  onItemsConfirmed: (items: CampaignItemDraft[]) => void;
  onCancel: () => void;
}
```

**State:**
```typescript
- uploadedFile: File | null
- parsedRows: ParsedRow[]  // { index, values, errors: string[] }
- editingRowIndex: number | null
- editingValues: Record<string, string>  // current edit values
```

**Methods:**
- `handleDownloadTemplate()` — generate and download CSV
- `handleFileSelect(file: File)` — parse and validate CSV
- `handleRowEdit(index)` — enter edit mode for a row
- `handleRowChange(field, value)` — update edited cell value
- `handleRowSave(index)` — validate and save edited row
- `handleConfirm()` — convert parsed rows to CampaignItemDraft[] and call onItemsConfirmed
- `handleReupload()` — reset state and open file picker again

### Helper Functions

**`parseCSV(file: File): { rows: Record<string, string>[], errors?: string }`**
- Uses papaparse
- Returns array of parsed rows or file-level errors

**`validateRow(row: Record<string, string>): { valid: boolean, errors: string[] }`**
- Checks each field against validation rules
- Returns error array (empty if valid)

**`generateTemplateCSV(): string`**
- Creates CSV content with header + 3 examples
- Returns as string (not file)

**`downloadCSV(content: string, filename: string): void`**
- Creates a Blob from CSV content
- Triggers browser download

---

## Integration with Existing Wizard

### Changes to `page.tsx` (Campaign Wizard)

**Removed:**
- `addItem()` function
- `removeItem()` function
- `updateItem()` function
- Item management UI code in the items step
- "Add Item" button

**Changed:**
- Items step now imports and renders `<ItemsCSVUpload />` component instead of manual input section
- Pass callback: `onItemsConfirmed={(items) => setItems(items)}`
- Pass callback: `onCancel={() => {}}` (optional, maybe just close preview)

**Type remains the same:**
```typescript
type CampaignItemDraft = {
  key: string;
  part_number: string;
  part_description: string;
  discount_type: "percentage" | "fixed";
  discount_value: number;
  min_order_quantity: number;
};
```

On confirmation, generate keys for each item and populate the `items` state.

---

## UI Styling

### Colors & Status Indicators

Use existing campaign wizard color scheme (dark theme):

- **Valid row:** Green checkmark (✓) + light green background (`bg-green-500/10`)
- **Invalid row:** Red X (✗) + light red background (`bg-red-500/10`) + error message in red text
- **Buttons:** Match existing wizard buttons (teal primary, outlined secondary)
- **Table:** Use existing Card + shadcn components for consistency

### Preview Table

```typescript
// Rendered as a table within a Card
<Card className="border-[#2A2A2A] bg-[#0D0D0D]">
  <table>
    <thead>
      <tr>
        <th>Row</th>
        <th>Part Number</th>
        <th>Description</th>
        <th>Discount Type</th>
        <th>Value</th>
        <th>Min Qty</th>
        <th>Status</th>
      </tr>
    </thead>
    <tbody>
      {parsedRows.map((row, idx) => (
        <tr key={idx} className={row.errors.length > 0 ? "bg-red-500/10" : "bg-green-500/10"}>
          {/* Render cells, editable if invalid */}
        </tr>
      ))}
    </tbody>
  </table>
</Card>
```

---

## Testing Strategy

### Unit Tests (Vitest)

**`csv/validator.test.ts`:**
- Valid row passes all checks
- Each validation rule fails correctly (part number missing, discount > 100, etc.)
- Case-insensitive discount type matching

**`csv/parser.test.ts`:**
- Valid CSV parses correctly
- Empty CSV returns error
- Missing columns detected
- UTF-8 encoding handled

**`csv/template-generator.test.ts`:**
- Template content includes correct columns
- Example rows are valid according to validator

### E2E Tests (Playwright)

- Download template
- Upload CSV with valid rows → preview shows all valid, confirm succeeds
- Upload CSV with invalid rows → preview shows errors, confirm disabled
- Edit invalid row inline → status updates to valid, confirm enabled
- Re-upload different file → clears previous preview
- Cancel → returns to empty items step

---

## Edge Cases & Notes

1. **Empty descriptions:** Allowed; rows with no description should still be valid
2. **Case sensitivity:** Discount Type accepts "percentage", "Percentage", "PERCENTAGE" (case-insensitive)
3. **Trailing whitespace:** CSV parser should trim whitespace from part numbers
4. **Large files:** If CSV has >1000 rows, show warning but still process; consider pagination in preview
5. **Duplicate part numbers:** Allowed (system may enforce uniqueness at campaign level, not here)
6. **Negative numbers:** Rejected for discount value and min qty
7. **Decimal quantities:** Min Order Quantity should be whole numbers only

---

## Success Criteria

✅ CSV upload is the only way to add items (no manual button)  
✅ Template can be downloaded with correct columns and examples  
✅ CSV is parsed and validated, with errors shown clearly  
✅ Invalid rows are editable inline in the preview  
✅ Re-upload option available  
✅ Confirm button enabled only when all rows valid  
✅ Integration with existing wizard state works seamlessly  
✅ Styling matches existing campaign wizard design  
✅ E2E and unit tests pass  
