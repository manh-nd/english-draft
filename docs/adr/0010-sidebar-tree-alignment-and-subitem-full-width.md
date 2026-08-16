# 10. Sidebar Tree Alignment and Sub-Item Full Width

Date: 2026-08-16

## Status

Accepted

## Context

Inside `SidebarMenuSub`, sub-items previously suffered from two visual defects:

1. `SidebarMenuSub` applied `mx-3.5` (right margin of 14px), preventing sub-items from extending full-width to the right edge. As a result, the `...` actions on sub-items were horizontally indented and misaligned with root items and folders.
2. The drag handle (`GripVertical`) on root documents took up horizontal flow space without a fixed-width spacer on folders, causing folder icons and document icons to drift out of vertical alignment.
3. The folder `Chevron` was placed on the far right where it collided with the `...` action button.

## Decision

1. **Full-Width Sub-Items**:
   - `SidebarMenuSub` is configured with `ml-3.5 mr-0 pl-2.5 pr-0`, ensuring sub-items occupy 100% width on the right.
   - All `SidebarMenuAction` (`...`) buttons on Folders, Root Documents, and Nested Documents are vertically aligned on the exact same right edge column (`right-1`).
2. **Fixed-Slot Icon Alignment**:
   - Folders place a compact `ChevronRight` (`size-3.5`) at the leading position, followed by `Folder` / `FolderOpen` (`size-4`).
   - Documents place a fixed `size-3.5` drag handle slot (`GripVertical`) at the leading position, followed by `FileText` (`size-4`).
   - When not hovered, the drag slot is transparent (`opacity-0`) and prevents layout shifts, guaranteeing that all file and folder icons share the exact same X-axis alignment.

## Consequences

- Consistent, pixel-aligned visual hierarchy matching modern IDE and project tree navigation standards.
- Eliminates layout jumps on hover.
- Fixes `...` action alignment across all nesting levels.
