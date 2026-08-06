# Self-Hosted Visual Testing via Docker, Playwright, and Storybook 10

We chose a 100% self-hosted, hybrid visual testing architecture combining Playwright E2E visual snapshots (`expect(page).toHaveScreenshot()`) for page flows and Storybook 10 Test Runner (`@storybook/test-runner`) for isolated component testing.

To eliminate font antialiasing and subpixel rendering discrepancies between macOS development environments and Linux CI runners, all baseline snapshot generation and comparison runs execute in the project image defined by `Dockerfile.visual-test`. It pins the Playwright 1.62.1 Noble image and Bun 1.3.14. Both comparison and update commands build this same image before running.

The component tier pins Storybook, `@storybook/nextjs-vite`, and `@storybook/addon-docs` to 10.5.7 and uses `@storybook/test-runner` 0.24.4, whose peer range supports Storybook 10. The test runner remains appropriate here because its Node hooks capture and compare local image snapshots.

This approach eliminates reliance on third-party cloud visual testing SaaS platforms such as Chromatic or Percy, at the cost of managing the Docker image locally and maintaining snapshot binary artifacts in Git.
