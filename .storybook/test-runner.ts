import type { TestRunnerConfig } from "@storybook/test-runner";
import { toMatchImageSnapshot } from "jest-image-snapshot";
import path from "path";

const config: TestRunnerConfig = {
  setup() {
    expect.extend({ toMatchImageSnapshot });
  },
  async postVisit(page, context) {
    // Wait for fonts, images, and network requests to stabilize
    await page.waitForLoadState("networkidle");

    // Check if there are active portals attached directly to body (Radix portals, Dialog, Tooltip, Sheet, etc.)
    const hasPortal = await page.evaluate(() => {
      return !!document.querySelector(
        '[data-radix-portal], [role="dialog"], [role="tooltip"], [data-slot$="-content"], [data-slot$="-overlay"]'
      );
    });

    const isFullscreen =
      (context as unknown as { parameters?: { layout?: string } }).parameters
        ?.layout === "fullscreen";

    if (!hasPortal && !isFullscreen) {
      // Shrink #storybook-root to fit the component's actual content width for centered components
      await page.evaluate(() => {
        const root = document.getElementById("storybook-root");
        if (root) {
          root.style.display = "inline-block";
          root.style.width = "max-content";
          root.style.maxWidth = "100%";
        }
      });
    }

    // Capture body for portals or fullscreen layouts; otherwise crop tightly around #storybook-root
    const targetLocator =
      hasPortal || isFullscreen
        ? page.locator("body")
        : page.locator("#storybook-root");
    const image = await targetLocator.screenshot();
    expect(image).toMatchImageSnapshot({
      customSnapshotIdentifier: context.id,
      customSnapshotsDir: path.join(
        process.cwd(),
        "__snapshots__",
        context.title
      ),
      customDiffDir: path.join(
        process.cwd(),
        "__snapshots__",
        "__diff_output__"
      ),
      failureThreshold: 0.01,
      failureThresholdType: "percent",
    });
  },
};

export default config;
