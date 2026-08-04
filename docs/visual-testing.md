# Visual UI & Component Testing Guide

Self-hosted visual testing strategy for this codebase (**Next.js 16**, **React 19**, **Tailwind CSS v4**, **Bun**, **Shadcn UI**).

> **Architectural Decision**: See [ADR-0006](file:///Users/manh/english-draft/docs/adr/0006-self-hosted-docker-visual-testing.md) for rationale on self-hosted Docker execution.

---

## 1. Chosen Strategy: 100% Self-Hosted Hybrid Testing

We use a two-tier self-hosted visual testing setup:

1. **Page/Flow Visual Testing**: Playwright E2E (`@playwright/test`) with `toHaveScreenshot()`.
2. **Component-Level Visual Testing**: Storybook 10 (`@storybook/nextjs-vite`) + Storybook Test Runner (`@storybook/test-runner`).

Both tiers execute inside standard Linux Docker containers (`mcr.microsoft.com/playwright`) to guarantee 0% subpixel font antialiasing variance between macOS local development and Linux CI runners.

---

## 2. Playwright E2E Visual Testing

Tests full application routes (`/login`, main app shell) against the live Next.js build.

### Test Example (`e2e/visual.spec.ts`)

```ts
import { test, expect } from "@playwright/test";

test.describe("Page Visual Regression", () => {
  test("Login page matches baseline snapshot", async ({ page }) => {
    await page.goto("/login");
    await expect(page).toHaveScreenshot("login-page.png");
  });
});
```

---

## 3. Storybook 10 Component Visual Testing

Isolates individual Shadcn UI components (`Button`, `Card`, `Sidebar`, `Avatar`) into stories and automatically runs Playwright visual assertion against every story via `@storybook/test-runner`.

### Story Example (`components/ui/card.stories.tsx`)

```tsx
import type { Meta, StoryObj } from "@storybook/react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "./card";
import { Button } from "./button";

const meta: Meta<typeof Card> = {
  title: "UI/Card",
  component: Card,
};

export default meta;
type Story = StoryObj<typeof Card>;

export const Default: Story = {
  render: () => (
    <Card className="w-[350px]">
      <CardHeader>
        <CardTitle>Card Title</CardTitle>
        <CardDescription>Card Description</CardDescription>
      </CardHeader>
      <CardContent>
        <Button>Action</Button>
      </CardContent>
    </Card>
  ),
};
```

---

## 4. Running Visual Tests Locally via Docker

To generate or verify snapshots with 0% OS pixel discrepancy:

```bash
# Run Playwright tests inside Playwright Linux container
docker run --rm -v $(pwd):/work -w /work mcr.microsoft.com/playwright:v1.49.0-noble npx playwright test

# Update baseline snapshots inside Docker container
docker run --rm -v $(pwd):/work -w /work mcr.microsoft.com/playwright:v1.49.0-noble npx playwright test --update-snapshots
```

---

## 5. Summary of Architecture Decisions

- **No Cloud Third-Party SaaS**: 100% self-hosted local and CI execution.
- **Strict Pixel Accuracy**: Standardized Playwright Docker Linux image (`mcr.microsoft.com/playwright`).
- **Storybook 10**: ESM-only component sandbox using `@storybook/nextjs-vite` builder for Next.js 16 + React 19 + Tailwind v4.
