# 7. Component Spacing Boundaries and Visual Verification

Date: 2026-08-16

## Status

Accepted

## Context

During Phase 1 UI iterations, ad-hoc spacing overrides (such as `className="px-1 pb-1"`) were occasionally added at feature call-sites (e.g. `SearchBar` inside `SidebarHeader`). This caused fragile layout contracts, uneven vertical padding, and visual regressions when switching theme presets or refactoring container wrappers.

Furthermore, AI agents developing or modifying UI components could not automatically detect subtle spacing leaks without isolated visual test baselines and explicit layout boundary rules.

## Decision

1. **Strict Layout Ownership (Container vs Control)**:
   - Layout containers (e.g. `SidebarHeader`, `FieldGroup`, `CardContent`) own spacing via layout tokens (`gap-*`, `p-*`, `flex-col`).
   - Leaf control components (e.g. `SearchBar`, `InputGroup`, `Button`) must NOT accept or inject ad-hoc padding/margin overrides (`p-*`, `m-*`, `pb-*`, `px-*`) at call-sites that interfere with the parent layout contract.
2. **Mandatory Visual Test Coverage for Composite UI Components**:
   - Composite and feature-level UI components (such as `components/sidebar/search-bar.tsx`) must have dedicated Storybook story files (`*.stories.tsx`) covering key visual states (Empty, With Value, and In-Container Context).
3. **Agent Diagnostic Workflow for Visual Regressions**:
   - When `bun run test:visual` fails due to snapshot diffs or bounding-box dimensions, agents must diagnose the root cause (inspecting call-site spacing vs component contract) before updating snapshots. Snapshot updates (`bun run test:visual:update`) are reserved strictly for approved intentional design changes.

## Consequences

- Prevents spacing leaks and padding compounding across composite UI components.
- Enables AI agents to automatically catch and understand layout/spacing regressions in Docker Playwright visual tests.
- Keeps component markup clean, declarative, and aligned with standard shadcn composition patterns.
