# Self-Hosted Visual Testing via Docker, Playwright, and Storybook 10

We chose a 100% self-hosted, hybrid visual testing architecture combining Playwright E2E visual snapshots (`expect(page).toHaveScreenshot()`) for page flows and Storybook 10 Test Runner (`@storybook/test-runner`) for isolated component testing.

To eliminate font antialiasing and subpixel rendering discrepancies between macOS development environments and Linux CI runners, all baseline snapshot generation and test executions run strictly inside standard Linux Docker containers (`mcr.microsoft.com/playwright`).

This approach eliminates reliance on third-party cloud visual testing SaaS platforms (such as Chromatic or Percy) and guarantees 0% false positives, at the cost of managing Playwright Docker test containers locally and maintaining snapshot binary artifacts in Git.
