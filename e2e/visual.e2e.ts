import { test, expect } from "@playwright/test";

test.describe("Visual Regression Tests", () => {
  test("login page visual snapshot", async ({ page }) => {
    await page.goto("/login");
    // Verify essential elements are visible before screenshot
    await expect(
      page.getByRole("button", { name: /continue with google/i })
    ).toBeVisible();
    await expect(page).toHaveScreenshot("login-page.png");
  });
});
