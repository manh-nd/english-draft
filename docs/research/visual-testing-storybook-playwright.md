# Storybook Visual Testing for AI Agents

## 1. Primary Sources & Tooling Investigation

### Chromatic

- **Docs:** Official Storybook visual testing service ([Chromatic Docs](https://www.chromatic.com/docs/)).
- **Mechanism:** Cloud-based. Captures UI snapshots and uploads them; diffs are reviewed via a SaaS web UI.
- **AI Compatibility:** **Poor**. Because diffs and baselines are stored in the cloud and gated behind a web UI and authentication, an AI agent cannot easily inspect the visual differences natively without building complex API integrations.

### Storycap + Pixelmatch

- **Docs:** Older local headless ecosystem ([Storycap GitHub](https://github.com/reg-viz/storycap)).
- **Mechanism:** `storycap` crawls a running Storybook instance and takes screenshots. `pixelmatch` (often integrated via `reg-suit`) compares them.
- **AI Compatibility:** **Fair**. It produces local files, but it requires gluing multiple tools together manually and is less maintained than modern Playwright equivalents.

### Playwright Visual Comparisons & Component Testing (CT)

- **Docs:** Native Playwright assertions ([Playwright Visual Comparisons](https://playwright.dev/docs/test-snapshots)).
- **Mechanism:** `@playwright/experimental-ct-react` allows mounting Next.js/React components in a real browser and asserting `expect(page).toHaveScreenshot()`.
- **AI Compatibility:** **Good**. Generates local `-diff.png` files. However, using Playwright CT bypasses Storybook entirely, meaning you lose the Storybook catalog, args, and addons context.

### @storybook/test-runner + jest-image-snapshot

- **Docs:** Official local Storybook test runner ([Storybook Test Runner](https://storybook.js.org/docs/writing-tests/test-runner)).
- **Mechanism:** Powered by Playwright and Jest. By hooking `jest-image-snapshot` into the runner's lifecycle, it visits every story automatically, takes a screenshot, and compares it against a local baseline.
- **AI Compatibility:** **Excellent**. It integrates directly with Storybook and outputs artifacts locally. It drops visual diffs (`-diff.png`) straight to the filesystem. The AI agent can read these directly using tools like `view_file` (which natively supports image rendering).

---

## 2. AI Agent Feedback Loop Architecture

To create an autonomous visual feedback loop, the architecture must rely on CLI triggers and local file system artifacts.

### The Recommended Loop:

1. **Trigger:** The AI agent executes `bun run test:visual` via its command execution tool.
2. **Execution:** The `@storybook/test-runner` visits the local Storybook instance, captures headless Playwright screenshots, and compares them against baselines in `__snapshots__`.
3. **Failure Detection:** If a visual change is detected, the CLI command fails with a non-zero exit code. The output specifies exactly which story failed and the absolute path to the diff image (e.g., `__snapshots__/__diff_output__/button-primary-diff.png`).
4. **Inspection:** The AI agent parses the CLI output to find the path of the diff image, then uses the `view_file` tool on the `.png` file. The environment's multimodal capabilities allow the AI to _see_ the visual difference directly.
5. **Iteration:** The AI agent modifies the Next.js component code (e.g., adjusting Tailwind styling) and repeats step 1. Once correct, or if the change is an intentional update, the AI runs `bun run test:visual:update` to save the new baseline.

---

## 3. Step-by-Step Setup Guide (Next.js + Bun + Storybook)

### Step 1: Install Dependencies

Use `bun` to install the test runner, Playwright, and the snapshot matching libraries:

```bash
bun add -D @storybook/test-runner playwright jest-image-snapshot @types/jest-image-snapshot
```

### Step 2: Add Package Scripts

Add the following scripts to `package.json` to give the AI agent simple commands to trigger and update the tests:

```json
{
  "scripts": {
    "test:visual": "test-storybook",
    "test:visual:update": "test-storybook --updateSnapshot"
  }
}
```

### Step 3: Configure the Test Runner

Create `.storybook/test-runner.ts` to hook the visual capturing into the Storybook test lifecycle:

```typescript
import { toMatchImageSnapshot } from "jest-image-snapshot";
import type { TestRunnerConfig } from "@storybook/test-runner";
import path from "path";

const config: TestRunnerConfig = {
  setup() {
    expect.extend({ toMatchImageSnapshot });
  },
  async postRender(page, context) {
    // Wait for the network to be idle to avoid flaky screenshots from loading web fonts or images
    await page.waitForLoadState("networkidle");

    // Capture the screenshot using Playwright
    const image = await page.screenshot();

    // Compare against the local baseline
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
      // Allow slight pixel differences to reduce flakiness (e.g., subpixel anti-aliasing on different OS)
      failureThreshold: 0.01,
      failureThresholdType: "percent",
    });
  },
};

export default config;
```

### Step 4: Run the Workflow

1. Start the Storybook server (must be running for the test runner to hit it):
   ```bash
   bun run storybook
   ```
2. In a separate terminal, run the visual tests:
   ```bash
   bun run test:visual
   ```
3. To update the baselines intentionally:
   ```bash
   bun run test:visual:update
   ```

> **Note on CI Environments:** Because screenshots are generated locally, differences in OS (e.g., macOS local vs Ubuntu CI) can cause slight font rendering mismatches. For a robust team setup, baseline generation and tests should be run in a Dockerized environment, or a consistent failure threshold should be tuned in the config above.
