# 12. Consolidated Editor Floating Toolbar

Date: 2026-08-16

## Status

Accepted

## Context

Previously, two independent floating menus appeared simultaneously whenever text was selected in the Tiptap editor:

1. An upper floating menu for AI suggestions (`Fix grammar`, `Improve style`, `Make natural`, `Save vocab`, `Ask AI`).
2. A lower floating menu for rich-text formatting (`Bold`, `Italic`, `Code`, highlight color palette).

This caused visual clutter, overlapping boundary issues (especially near the top of the editor or sidebar boundary), and a fragmented user experience.

## Decision

1. **Single Unified Popover Toolbar**:
   - Consolidated formatting controls (`Bold`, `Italic`, `Code`, highlight palette) and AI assistance (`Fix grammar`, `Improve style`, `Make natural`, `Save vocab`, `Ask AI`) into a single `<InlineSuggestionMenu>` BubbleMenu.
   - Styled as a cohesive, polished popover with `rounded-lg border bg-popover/95 shadow-lg backdrop-blur-sm p-1`.
2. **Smart Top Placement with Automatic Collision Handling**:
   - Positioned cleanly above the selected text (`placement: "top", offset: 8`).
   - Integrated floating-ui collision detection automatically shifts or flips the popover downward if space above is constrained.

## Consequences

- Clean, unified editing experience matching modern writing tools (Notion, Medium, Craft).
- Eliminates popover collisions and duplicate floating toolbars.
