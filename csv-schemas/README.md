# Bulk Order CSV Upload Guide

This guide explains how to prepare and upload a CSV or Excel file to create multiple orders at once in the MANSCO Spare Parts Portal.

## Quick Start

1. **Download the template** from the "Bulk Upload" section on the New Order page
2. **Fill in your part numbers and quantities** using the format below
3. **Upload the file** — the system will validate and show you a preview
4. **Review and add to cart** — fix any errors and confirm

## CSV Format

Your file needs exactly **2 columns**:

| Column | Required | Format | Example |
|--------|----------|--------|---------|
| **Part Number** | Yes | Exact part number from catalog | `PSA-4249.34` |
| **Quantity** | Yes | Whole number, minimum 1 | `5` |

## Example File

```csv
Part Number,Quantity
PSA-4249.34,2
PSA-1234.56,5
PSA-7890.12,1
MOTOR-2024,10
```

## Important Notes

### Column Names Matter
- Headers **must** be exactly: `Part Number` and `Quantity`
- Column order doesn't matter (Part Number can be second if needed)
- Column names are case-sensitive

### Valid Part Numbers
- Use the exact part number from the catalog (e.g., `PSA-4249.34`)
- Part numbers are case-insensitive in the system
- Leading/trailing spaces are automatically trimmed

### Quantities
- Must be whole numbers (no decimals: ✓ `5`, ✗ `5.5`)
- Minimum quantity is 1
- Maximum depends on available stock

## File Format

You can use either:
- **CSV** (.csv) — comma-separated values, plain text
- **Excel** (.xlsx, .xls) — Microsoft Excel spreadsheets

**File size limit:** 5 MB

## What Happens After Upload

1. **Structural Validation** — We check that every row has a Part Number and Quantity
2. **Catalog Lookup** — We look up each part number in our system
3. **Availability Check** — We verify pricing and stock availability
4. **Preview** — You see a table with:
   - ✓ **Valid items** (green) — ready to add to cart
   - ✗ **Problems** (yellow) — we show the reason and let you fix or remove them

### What Can Go Wrong

| Issue | Why | How to Fix |
|-------|-----|-----------|
| Part not found | Part number doesn't exist in catalog | Verify part number matches catalog exactly |
| Out of stock (no price) | Item unavailable with no ETA | Contact admin or choose different item |
| Invalid quantity | Quantity is blank, not a number, or less than 1 | Enter a whole number ≥ 1 |

## Step-by-Step Example

### Download Template
Click "Download Template" button to get a starter file.

### Fill in Your Data
Open in Excel or any text editor and add your parts:

```csv
Part Number,Quantity
PSA-4249.34,2
PSA-1234.56,5
PSA-7890.12,1
```

### Upload File
Click "Upload CSV / Excel" and select your file.

### Review Preview
- ✓ green rows = ready to add
- ✗ yellow rows = problems to fix
  - Click "Fix" to edit inline
  - Or click "Remove" to skip that row

### Add to Cart
Click "Add N Valid Items to Cart" to proceed.

## Tips & Tricks

- **Test first** — Upload a small batch (5-10 items) before uploading hundreds
- **Reuse templates** — Save your successful uploads as templates for future orders
- **Quick format** — Open in Excel, add rows, save as `.xlsx` — no need to worry about formatting
- **Find part numbers** — Browse the Parts Catalog first to find exact part numbers, then add them to your CSV

## Still Need Help?

- Check the **Parts Catalog** to verify part numbers
- If many items are failing, check that column headers are spelled exactly: `Part Number` and `Quantity`
- Contact support if you believe a valid part number is not being found

## Example: Real-World Upload

**Your CSV:**
```csv
Part Number,Quantity
PSA-4249.34,2
PSA-1234.56,5
PSA-UNKNOWN,3
```

**Preview Result:**
- Row 1: ✓ PSA-4249.34 (2 units) — Ready
- Row 2: ✓ PSA-1234.56 (5 units) — Ready  
- Row 3: ✗ PSA-UNKNOWN — "Part PSA-UNKNOWN not found in catalog"

**Your Options:**
- Remove row 3 and add 2 valid items
- Or fix row 3 with the correct part number and try again

---

**Need a blank template?** [Download order-template.csv](./order-template.csv)
