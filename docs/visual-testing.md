# Visual UI and component testing

This project uses self-hosted visual testing for Next.js 16, React 19, Tailwind CSS v4, Bun, and shadcn/ui. See [ADR-0006](adr/0006-self-hosted-docker-visual-testing.md) for the architectural decision.

## Runtime

The supported runtime is intentionally pinned:

| Part                                                         | Version |
| ------------------------------------------------------------ | ------- |
| Storybook, `@storybook/nextjs-vite`, `@storybook/addon-docs` | 10.5.7  |
| `@storybook/test-runner`                                     | 0.24.4  |
| Playwright package and Linux image                           | 1.62.1  |
| Bun in the Linux image                                       | 1.3.14  |

`@storybook/nextjs-vite` is the Storybook framework integration for this Next.js application. The test runner's Storybook 10 peer range is compatible with the pinned Storybook version.

`Dockerfile.visual-test` combines `mcr.microsoft.com/playwright:v1.62.1-noble` with Bun 1.3.14 and installs the exact `bun.lock`. Host `node_modules` is hidden by an anonymous container volume, so native host packages cannot leak into Linux captures.

## Component snapshots

`bun run test:visual` performs the complete comparison flow:

1. Verify that Docker and its daemon are available.
2. Build the pinned test image.
3. Build the static Storybook inside the image.
4. Start a local static server and wait for its `index.json`.
5. Run every story through one Chromium worker and compare its screenshot with the checked-in baseline.

Update intentional changes with the same runtime:

```bash
bun run test:visual:update
```

Never create or update baselines by running `test-storybook` directly on the host. Baselines live under `__snapshots__/`; transient diffs under `__snapshots__/__diff_output__/` are ignored.

The capture hook waits for Storybook, fonts, and images, hides carets, and disables Playwright animations. Storybook also globally disables CSS animation, transitions, and smooth scrolling so animated components render at a fixed state. Stories must use checked-in fixtures under `public/storybook/` instead of remote media hosts.

If Docker is unavailable, the public command exits with a Docker prerequisite message. If the static server does not become ready, it prints the server log and exits with the Storybook URL that failed.

## Page-flow snapshots

Playwright page-flow tests use `expect(page).toHaveScreenshot()` under `e2e/`. Run comparisons and updates in the same pinned image:

```bash
bun run test:e2e:docker
bun run test:e2e:docker:update
```

The non-Docker `bun run test:e2e` command is useful for functional debugging, but it is not a supported way to compare or update visual baselines.

## Story requirements

- Import `Meta` and `StoryObj` from `@storybook/nextjs-vite`.
- Keep every captured state static and repeatable; do not use the current time, randomness, or remote requests.
- Keep required shadcn/ui composition, such as an `AvatarFallback` for every `Avatar`.
- Use the `fullscreen` layout only when the story intentionally owns the viewport; other stories are cropped to `#storybook-root`.
