import { test, expect } from "@playwright/test";

test.describe("Campaign Wizard - CSV Items Upload", () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to campaign wizard
    await page.goto("/dashboard/admin/campaigns/new");

    // Go to items step
    await page.click("button:has-text('Items')");
    await page.waitForLoadState("networkidle");
  });

  test("should show download and upload buttons initially", async ({ page }) => {
    await expect(page.getByText("Download Template")).toBeVisible();
    await expect(page.getByText("Upload CSV")).toBeVisible();
  });

  test("should download template CSV when button clicked", async ({ page }) => {
    const downloadPromise = page.waitForEvent("download");
    await page.getByText("Download Template").click();
    const download = await downloadPromise;

    expect(download.suggestedFilename()).toBe("campaign-items-template.csv");
  });

  test("should parse and preview valid CSV", async ({ page }) => {
    const csvContent = `Part Number,Description,Discount Type,Discount Value,Min Order Quantity
PSA-4249.34,Brake Pad Set,Percentage,10,1
PSA-1234.56,Oil Filter,Fixed,150,2`;

    const file = Buffer.from(csvContent);
    const input = page.locator('input[accept=".csv"]');
    await input.setInputFiles({
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
    const input = page.locator('input[accept=".csv"]');
    await input.setInputFiles({
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
    const input = page.locator('input[accept=".csv"]');
    await input.setInputFiles({
      name: "test.csv",
      mimeType: "text/csv",
      buffer: file,
    });

    // Click "Fix" button
    await page.getByRole("button", { name: /Fix/i }).click();

    // Edit the Part Number field
    const textInputs = page.locator("input[type='text']");
    await textInputs.first().fill("PSA-4249.34");

    // Click Save
    await page.getByRole("button", { name: /Save/i }).click();

    // Status should update to valid
    await expect(page.locator("text=✓ Valid")).toBeVisible();
  });

  test("should disable confirm button until all rows are valid", async ({ page }) => {
    const csvContent = `Part Number,Description,Discount Type,Discount Value,Min Order Quantity
,Brake Pad Set,Percentage,10,1`;

    const file = Buffer.from(csvContent);
    const input = page.locator('input[accept=".csv"]');
    await input.setInputFiles({
      name: "test.csv",
      mimeType: "text/csv",
      buffer: file,
    });

    // Confirm button should be disabled
    const confirmButton = page.getByRole("button", { name: /Confirm/i });
    await expect(confirmButton).toBeDisabled();

    // Fix the error
    await page.getByRole("button", { name: /Fix/i }).click();
    const textInputs = page.locator("input[type='text']");
    await textInputs.first().fill("PSA-4249.34");
    await page.getByRole("button", { name: /Save/i }).click();

    // Confirm button should now be enabled
    await expect(confirmButton).toBeEnabled();
  });

  test("should allow re-uploading a different CSV", async ({ page }) => {
    const csvContent = `Part Number,Description,Discount Type,Discount Value,Min Order Quantity
PSA-4249.34,Brake Pad Set,Percentage,10,1`;

    const file = Buffer.from(csvContent);
    const input = page.locator('input[accept=".csv"]');
    await input.setInputFiles({
      name: "test.csv",
      mimeType: "text/csv",
      buffer: file,
    });

    // Wait for preview
    await expect(page.locator("text=All 1 items")).toBeVisible();

    // Click re-upload
    await page.getByRole("button", { name: /Re-upload/i }).click();

    // Preview should disappear and upload UI should reappear
    await expect(page.getByText("Download Template")).toBeVisible();
  });

  test("should add items to wizard state on confirm", async ({ page }) => {
    const csvContent = `Part Number,Description,Discount Type,Discount Value,Min Order Quantity
PSA-4249.34,Brake Pad Set,Percentage,10,1
PSA-1234.56,Oil Filter,Fixed,150,2`;

    const file = Buffer.from(csvContent);
    const input = page.locator('input[accept=".csv"]');
    await input.setInputFiles({
      name: "test.csv",
      mimeType: "text/csv",
      buffer: file,
    });

    // Confirm
    await page.getByRole("button", { name: /Confirm/i }).click();

    // Items count should update
    await expect(page.locator("text=2 items added")).toBeVisible();

    // Can proceed to next step
    await page.getByRole("button", { name: /Continue/i }).click();
    await expect(page.locator("text=Review")).toBeVisible();
  });
});
