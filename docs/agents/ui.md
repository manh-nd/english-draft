# UI & Components

Use the `shadcn` skill (`.agents/skills/shadcn/SKILL.md`) when adding, searching, styling, building, debugging, or composing UI components and design systems.

## Component Spacing & Layout Ownership

- **Container owns spacing**: Parent containers (`SidebarHeader`, `FieldGroup`, `CardContent`, flex layouts) own gaps and padding.
- **No ad-hoc call-site overrides**: Never pass `px-*`, `pb-*`, `pt-*`, or `m-*` to feature control components at their call-sites (e.g. `<SearchBar />` inside `<SidebarHeader>`). Controls must render their own internal borders and padding cleanly.
- See `docs/adr/0007-component-spacing-boundaries-and-visual-verification.md`.

## Visual Regression Testing Workflow

1. **Mandatory Stories**: When creating or modifying UI components (both primitives in `components/ui/` and composite feature components like `components/sidebar/`), ensure a corresponding `.stories.tsx` file exists covering key visual states.
2. **Run Verification**: Run `bun run test:visual` in Docker before completing any UI work.
3. **Diagnose Failures**:
   - If a test fails with dimension mismatch (e.g. `168x64` vs `168x60`) or pixel differences, inspect the diff image in `__snapshots__/__diff_output__/` to identify unintentional spacing or padding leaks.
   - Only run `bun run test:visual:update` when the visual changes are intentional and explicitly approved.
