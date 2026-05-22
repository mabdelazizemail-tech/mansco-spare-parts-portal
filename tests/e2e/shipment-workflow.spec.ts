// tests/e2e/shipment-workflow.spec.ts

import { test, expect } from "@playwright/test";

test.describe("shipment workflow", () => {
  test("should create and track a shipment end-to-end", async ({ page }) => {
    // Login as dealer
    await page.goto("/login");
    await page.fill("input[type='email']", "dealer@test.com");
    await page.fill("input[type='password']", "password123");
    await page.click("button:has-text('Login')");
    await page.waitForNavigation();

    // Navigate to shipments list
    await page.goto("/dashboard/shipments");
    await expect(page.locator("h1")).toContainText("Shipments");

    // Create new shipment
    await page.click("button:has-text('Create Shipment')");
    await page.waitForSelector("[role='dialog']");

    // Select carrier
    await page.selectOption("select[name='carrier_code']", "dhl");

    // Fill tracking refs
    await page.fill("input[name='tracking_number']", "DHL1234567890");
    await page.fill("input[name='awb_number']", "ABC123XYZ");

    // Submit form
    await page.click("button:has-text('Create')");
    await expect(page).toHaveURL(/\/dashboard\/shipments\/[a-f0-9-]+$/);

    // Verify detail page
    await expect(page.locator("h1")).toContainText("SHP-");
    await expect(page.locator("text=DHL Express")).toBeVisible();
    await expect(page.locator("text=DHL1234567890")).toBeVisible();

    // Update status
    const statusButton = page.locator("button:has-text('Edit')");
    await statusButton.click();
    await page.selectOption("select[name='shipment_status']", "shipped");
    await page.click("button:has-text('Update')");

    // Verify status changed
    await expect(page.locator("text=Shipped")).toBeVisible();
  });

  test("should list and filter shipments", async ({ page }) => {
    await page.goto("/dashboard/shipments");

    // Filter by status
    await page.click("button:has-text('In Transit')");
    await page.waitForLoadState("networkidle");

    const rows = page.locator("tbody tr");
    const count = await rows.count();
    expect(count).toBeGreaterThan(0);

    // Verify all rows are "In Transit"
    for (let i = 0; i < count; i++) {
      const status = rows.nth(i).locator("[role='status']");
      await expect(status).toContainText("In Transit");
    }
  });
});
