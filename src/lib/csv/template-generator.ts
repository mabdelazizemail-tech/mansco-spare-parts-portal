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
