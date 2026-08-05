# Storybook Test Runner vs. Chromatic: Screenshot Behaviors

## 1. Investigation of Default Behaviors

### Why Chromatic Crops Tightly

Chromatic is a purpose-built service for component-driven visual regression testing. Its infrastructure renders your stories in a controlled cloud environment (the "Capture Cloud") and automatically dimensions or trims snapshots to the component's boundaries. It inherently focuses on the component, eliminating background noise to ensure highly accurate visual diffing.

### Why Storybook Test Runner Captures Full Viewport

The `@storybook/test-runner` is powered by Playwright and is primarily designed for functional and interaction testing.

- By default, `page.screenshot()` captures the browser's full viewport.
- Playwright treats the Storybook iframe as a standard web page, capturing the full window size regardless of the component's actual footprint.
- Unless manually configured to target a specific element, Playwright will just snap the entire visible viewport.

### `page.screenshot()` vs `locator.screenshot()`

- **`page.screenshot()`**: Captures the entire viewable area of the browser window.
- **`locator.screenshot()`**: Captures only the bounding box of the specific DOM element matched by the locator.

### The Storybook Root Selector

Modern Storybook (v7+) mounts components inside a predictable container:

- **`#storybook-root`**: The standard wrapper for the component under test.
- _(Note: In older Storybook 6.x versions, the wrapper was often `#root`)_

By targeting this wrapper using Playwright's locator API (`page.locator('#storybook-root')`), we can replicate Chromatic's tight cropping behavior.

---

## 2. Practical Solution for this Repo

### Impact & Benefits of Element-Level Screenshots

1. **File Size Reduction**: Cropping to the component drops unnecessary blank space (often a large white or dark background), yielding significantly smaller PNG sizes.
2. **AI Token Efficiency**: When passing visual snapshots to Multimodal AI agents for visual inspection, tightly cropped component images utilize far fewer tokens and drastically improve processing time.
3. **Visual Clarity**: Eliminates "noise," ensuring that tests fail _only_ when the component itself changes, rather than when background layout shifts occur.

### Configuration (`.storybook/test-runner.ts`)

To configure `@storybook/test-runner` to capture only the component, update the `postVisit` hook to target `#storybook-root`.

```typescript
import type { TestRunnerConfig } from "@storybook/test-runner";
import { waitForPageReady } from "@storybook/test-runner";
import { toMatchImageSnapshot } from "jest-image-snapshot";

const config: TestRunnerConfig = {
  setup() {
    expect.extend({ toMatchImageSnapshot });
  },
  async postVisit(page, context) {
    // 1. Ensure the page and component are fully loaded and stable
    await waitForPageReady(page);

    // 2. Locate the Storybook wrapper element
    const element = page.locator("#storybook-root");

    // 3. Take a screenshot of just that element (tight crop)
    const image = await element.screenshot();

    // 4. Run the visual regression assertion
    expect(image).toMatchImageSnapshot({
      customSnapshotIdentifier: context.id,
      // Optional: adjust thresholds to your project's needs
      failureThreshold: 0.01,
      failureThresholdType: "percent",
    });
  },
};

export default config;
```

> [!TIP]
> **Handling Flakiness**: Use `mask: [page.locator('.dynamic-content')]` inside `element.screenshot()` if your components have dynamic values (e.g. current dates or random IDs) that would otherwise cause false visual regression failures.
