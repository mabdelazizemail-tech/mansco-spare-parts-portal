/**
 * Generate the sample CSV template for the parts catalog bulk upload.
 *
 * 7 columns matching the SAP-style schema:
 *   Part Number, Name (EN), Name (AR), Category, Model, Price, Currency
 */
export function generatePartsTemplate(): string {
  const header = [
    "Part Number",
    "Name (EN)",
    "Name (AR)",
    "Category",
    "Model",
    "Price",
    "Currency",
  ].join(",");

  const examples = [
    ["PSA-4249.34", "Brake Pad Set", "طقم تيل فرامل", "Brakes", "Peugeot 3008", "1250", "EGP"],
    ["PSA-1234.56", "Oil Filter", "فلتر زيت", "Filters", "Peugeot 208", "180", "EGP"],
    ["PSA-7890.12", "Air Filter", "فلتر هواء", "Filters", "Peugeot 508", "220", "EGP"],
  ];

  const rows = examples.map((row) => row.join(",")).join("\n");

  return `${header}\n${rows}`;
}
