/**
 * Generate a simple 2-column order upload template.
 *
 * Catalog metadata (name, price, availability) is resolved on the server
 * after upload — the dealer only needs to provide Part Number + Quantity.
 */
export function generateOrderTemplate(): string {
  const header = ["Part Number", "Quantity"].join(",");

  const examples = [
    ["PSA-4249.34", "2"],
    ["PSA-1234.56", "5"],
    ["PSA-7890.12", "1"],
  ];

  const rows = examples.map((row) => row.join(",")).join("\n");

  return `${header}\n${rows}`;
}
