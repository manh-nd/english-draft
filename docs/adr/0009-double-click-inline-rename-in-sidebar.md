# 9. Double Click Inline Rename in Sidebar

Date: 2026-08-16

## Status

Accepted

## Context

Users previously had to open the `...` options dropdown menu and click "Rename" whenever they wanted to edit a Document or Folder title. This added unnecessary friction for a very frequent organizational task.

## Decision

1. **Direct Double-Click Activation**:
   - Double-clicking any Document item or Folder item in the sidebar immediately triggers `<InlineRename>` mode.
   - Event propagation for drag handles and context menus is stopped to prevent drag-and-drop or menu conflicts during double-click.
   - Double-clicking inside the active rename `<Input>` itself stops propagation to permit native text selection.
2. **Accessible Fallback**:
   - The `...` dropdown menu retains the "Rename" item as a secondary trigger for mobile/touch devices and keyboard/screen-reader accessibility.

## Consequences

- Faster, standard desktop interaction pattern (matching VS Code, Obsidian, and macOS Finder).
- Preserves full accessibility and keyboard/mobile navigation support.
