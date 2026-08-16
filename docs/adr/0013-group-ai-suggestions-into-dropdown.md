# 13. Group AI Suggestions into Dropdown Menu

Date: 2026-08-16

## Status

Accepted

## Context

Placing all three AI suggestion actions (`Fix grammar`, `Improve style`, `Make natural`) as flat buttons directly on the floating toolbar made the popover unnecessarily wide, especially on narrower viewports or short text selections.

## Decision

1. **Grouped AI Dropdown**:
   - Grouped `Fix grammar`, `Improve style`, and `Make natural` into a single, compact `AI Rewrite` dropdown menu.
   - The trigger button displays a `<Sparkles />` icon and "AI Rewrite ▾".
   - When an AI action is executing, the trigger dynamically displays a `<Spinner />` and the action's progress label (e.g. "Fixing grammar…").
2. **Descriptive Menu Items**:
   - Each item in the dropdown includes a distinct icon and helper description (e.g. "Correct spelling, punctuation & syntax").
3. **Selection Preservation**:
   - `onMouseDown={(e) => e.preventDefault()}` is applied across dropdown triggers and menu items to prevent Tiptap text selection loss during interaction.

## Consequences

- Significantly more compact floating toolbar footprint.
- Extensible structure for future AI actions without bloating toolbar width.
- Clear visual feedback during AI generation.
