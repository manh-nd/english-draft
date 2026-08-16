# 8. Sidebar Header Actions and Folder Creation Hierarchy

Date: 2026-08-16

## Status

Accepted

## Context

Previously, the "New Folder" action in the sidebar was rendered as an isolated full-width button item at the bottom of the Document Tree, while "New Document" was a single icon action in the Documents section header. This fragmented the document creation actions, wasted vertical space below the folder hierarchy, and deviated from modern IDE and project sidebar conventions (e.g. Antigravity and Codex UI).

## Decision

1. **Consolidated Section Header Actions**:
   - Place both `FolderPlus` ("New folder") and `Plus` ("New document") as compact, icon-only action buttons side-by-side within the `Documents` `SidebarGroupLabel`.
   - Remove the standalone full-width "New Folder" button at the bottom of the sidebar.
2. **Inline Folder Creation**:
   - Retain the seamless inline input flow: clicking `FolderPlus` immediately renders an editable `InlineRename` item at the top of the tree, automatically focused.
3. **Empty Folder State**:
   - When an expanded folder contains no documents, display a subtle `"No documents"` muted indicator with an inline quick-add `+` button.

## Consequences

- Creates a cohesive, modern project tree navigation experience matching Antigravity and Codex UI.
- Frees up vertical real estate in the sidebar by removing unnecessary bottom button groups.
- Improves accessibility with explicit `aria-label` and `title` tooltips on header actions.
