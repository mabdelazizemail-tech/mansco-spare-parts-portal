/**
 * Generate sample CSV content for the campaign items template.
 *
 * The Discount Type is set at the campaign level (a single dropdown in the
 * wizard), not per row — so the template only contains item-specific fields.
 *
 * @returns CSV content as string (header + 3 example rows)
 */
export function generateCampaignItemsTemplate(): string {
  const header = [
    "Part Number",
    "Description",
    "Discount Value",
    "Min Order Quantity",
  ].join(",");

  const examples = [
    ["PSA-4249.34", "Brake Pad Set", "10", "1"],
    ["PSA-1234.56", "Oil Filter", "15", "2"],
    ["PSA-7890.12", "Air Filter", "5", "1"],
  ];

  const rows = examples.map((row) => row.join(",")).join("\n");

  return `${header}\n${rows}`;
}
