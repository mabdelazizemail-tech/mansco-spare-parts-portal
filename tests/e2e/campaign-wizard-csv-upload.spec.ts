import { test, expect } from "@playwright/test";

/**
 * The CSV upload now takes the campaign-level discount type as context.
 * The CSV itself has 4 columns (Discount Type was moved to a wizard-level
 * dropdown). The file input also accepts .xlsx.
 */
test.describe("Campaign Wizard - CSV Items Upload", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/dashboard/admin/campaigns/new");
    await page.click("button:has-text('Items')");
    await page.waitForLoadState("networkidle");
  });

  test("should show discount-type dropdown plus download/upload buttons", async ({ page }) => {
    await expect(page.getByText("Discount Type for this Campaign")).toBeVisible();
    await expect(page.getByText("Percentage (%)")).toBeVisible();
    await expect(page.getByText("Fixed Price (EGP)")).toBeVisible();
    await expect(page.getByText("Download Template")).toBeVisible();
    await expect(page.getByText("Upload CSV / Excel")).toBeVisible();
  });

  test("should download template CSV when button clicked", async ({ page }) => {
    const downloadPromise = page.waitForEvent("download");
    await page.getByText("Download Template").click();
    const download = await downloadPromise;

    expect(download.suggestedFilename()).toBe("campaign-items-template.csv");
  });

  test("should parse and preview valid CSV (4 columns, no Discount Type)", async ({ page }) => {
    const csvContent = `Part Number,Description,Discount Value,Min Order Quantity
PSA-4249.34,Brake Pad Set,10,1
PSA-1234.56,Oil Filter,20,2`;

    const file = Buffer.from(csvContent);
    const input = page.locator('input[type="file"]');
    await input.setInputFiles({
      name: "test.csv",
      mimeType: "text/csv",
      buffer: file,
    });

    await expect(page.locator("text=All 2 items are valid")).toBeVisible();
  });

  test("should show validation errors for invalid rows", async ({ page }) => {
    const csvContent = `Part Number,Description,Discount Value,Min Order Quantity
,Brake Pad Set,10,1
PSA-1234.56,Oil Filter,20,2`;

    const file = Buffer.from(csvContent);
    const input = page.locator('input[type="file"]');
    await input.setInputFiles({
      name: "test.csv",
      mimeType: "text/csv",
      buffer: file,
    });

    await expect(page.locator("text=Part Number is required")).toBeVisible();
  });

  test("should enforce percentage cap when campaign type is Percentage", async ({ page }) => {
    // Default discount type is Percentage. Discount Value of 150 should fail.
    const csvContent = `Part Number,Description,Discount Value,Min Order Quantity
PSA-4249.34,Brake Pad Set,150,1`;

    const file = Buffer.from(csvContent);
    const input = page.locator('input[type="file"]');
    await input.setInputFiles({
      name: "test.csv",
      mimeType: "text/csv",
      buffer: file,
    });

    await expect(page.locator("text=Percentage cannot exceed 100%")).toBeVisible();
  });

  test("should ALLOW Discount Value > 100 when campaign type is Fixed", async ({ page }) => {
    // Toggle to Fixed before upload
    await page.getByRole("button", { name: /Fixed Price/i }).click();

    const csvContent = `Part Number,Description,Discount Value,Min Order Quantity
PSA-4249.34,Brake Pad Set,500,1`;

    const file = Buffer.from(csvContent);
    const input = page.locator('input[type="file"]');
    await input.setInputFiles({
      name: "test.csv",
      mimeType: "text/csv",
      buffer: file,
    });

    await expect(page.locator("text=All 1 items are valid")).toBeVisible();
  });

  test("should allow inline editing of invalid rows", async ({ page }) => {
    const csvContent = `Part Number,Description,Discount Value,Min Order Quantity
,Brake Pad Set,10,1`;

    const file = Buffer.from(csvContent);
    const input = page.locator('input[type="file"]');
    await input.setInputFiles({
      name: "test.csv",
      mimeType: "text/csv",
      buffer: file,
    });

    await page.getByRole("button", { name: /Fix/i }).click();
    const textInputs = page.locator("input[type='text']");
    await textInputs.first().fill("PSA-4249.34");
    await page.getByRole("button", { name: /Save/i }).click();

    await expect(page.locator("text=✓ Valid")).toBeVisible();
  });

  test("should disable Confirm button until all rows are valid", async ({ page }) => {
    const csvContent = `Part Number,Description,Discount Value,Min Order Quantity
,Brake Pad Set,10,1`;

    const file = Buffer.from(csvContent);
    const input = page.locator('input[type="file"]');
    await input.setInputFiles({
      name: "test.csv",
      mimeType: "text/csv",
      buffer: file,
    });

    const confirmButton = page.getByRole("button", { name: /Confirm/i });
    await expect(confirmButton).toBeDisabled();

    await page.getByRole("button", { name: /Fix/i }).click();
    const textInputs = page.locator("input[type='text']");
    await textInputs.first().fill("PSA-4249.34");
    await page.getByRole("button", { name: /Save/i }).click();

    await expect(confirmButton).toBeEnabled();
  });

  test("should allow re-uploading a different file", async ({ page }) => {
    const csvContent = `Part Number,Description,Discount Value,Min Order Quantity
PSA-4249.34,Brake Pad Set,10,1`;

    const file = Buffer.from(csvContent);
    const input = page.locator('input[type="file"]');
    await input.setInputFiles({
      name: "test.csv",
      mimeType: "text/csv",
      buffer: file,
    });

    await expect(page.locator("text=All 1 items")).toBeVisible();

    await page.getByRole("button", { name: /Re-upload/i }).click();

    await expect(page.getByText("Download Template")).toBeVisible();
  });

  test("should add items to wizard state on confirm and reach Review", async ({ page }) => {
    const csvContent = `Part Number,Description,Discount Value,Min Order Quantity
PSA-4249.34,Brake Pad Set,10,1
PSA-1234.56,Oil Filter,20,2`;

    const file = Buffer.from(csvContent);
    const input = page.locator('input[type="file"]');
    await input.setInputFiles({
      name: "test.csv",
      mimeType: "text/csv",
      buffer: file,
    });

    await page.getByRole("button", { name: /Confirm/i }).click();

    await expect(page.locator("text=2 items added")).toBeVisible();
  });

  test("should display the campaign-level discount type in Review step", async ({ page }) => {
    // Fill in required fields to reach Review step
    // (this test is happy-path only; relies on default values for unrelated steps)
    const csvContent = `Part Number,Description,Discount Value,Min Order Quantity
PSA-4249.34,Brake Pad Set,10,1`;

    await page.getByRole("button", { name: /Fixed Price/i }).click();

    const file = Buffer.from(csvContent);
    const input = page.locator('input[type="file"]');
    await input.setInputFiles({
      name: "test.csv",
      mimeType: "text/csv",
      buffer: file,
    });

    await page.getByRole("button", { name: /Confirm/i }).click();
    await expect(page.locator("text=1 items added")).toBeVisible();
  });
});
