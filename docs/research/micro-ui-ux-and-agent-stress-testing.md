# Micro UI/UX Optimization & Agent Self Stress-Testing Harness

## Abstract

This document captures high-trust research from official documentation (Google GenAI SDK, Tiptap v3, Radix UI Primitives, Next.js App Router, Storybook 10.5.7) and community best practices to solve micro UI/UX flaws (chat streaming latency, markdown noise, resize stutter, popup unmounting, cluttered header) and establish an automated **Agent Self Stress-Testing Harness**.

---

## 1. Gemini Streaming & Clean Markdown Chat Architecture

### 1.1 Native `@google/genai` Streaming in Next.js App Router

The `@google/genai` SDK (`^2.17.1`) provides `models.generateContentStream`, returning an async iterable:

```typescript
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const responseStream = await ai.models.generateContentStream({
  model: "gemini-3.6-flash",
  contents: prompt,
});

// Chunks arrive asynchronously with .text property
for await (const chunk of responseStream) {
  if (chunk.text) {
    // Pipe to stream
  }
}
```

### 1.2 Route Handler Implementation (`app/api/chat/route.ts`)

Instead of blocking until full generation completes (3–5 seconds), wrap `generateContentStream` inside a Web Standard `ReadableStream`:

```typescript
const encoder = new TextEncoder();
const stream = new ReadableStream({
  async start(controller) {
    try {
      for await (const chunk of responseStream) {
        if (chunk.text) {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ text: chunk.text })}\n\n`)
          );
        }
      }
      controller.enqueue(encoder.encode("data: [DONE]\n\n"));
      controller.close();
    } catch (err) {
      controller.error(err);
    }
  },
});

return new Response(stream, {
  headers: {
    "Content-Type": "text/event-stream; charset=utf-8",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
  },
});
```

### 1.3 System Prompt Optimization & Markdown Sanitization

- **Prompt De-noising**: Add an explicit system rule:
  _"Respond directly with the substance. Do NOT include conversational preambles (e.g., 'Sure!', 'Here is the breakdown', 'Certainly'). Use structured Markdown with bold keywords, clean bullet lists, and code blocks."_
- **Stream-Safe Markdown Component**: Handles unclosed tags (e.g. unterminated `**` or ` ``` ` during active streaming) without crashing or layout shift, paired with a pulsing cursor indicator (`▋`) and one-click copy button.

---

## 2. 60 FPS Fluid Side Panel Resizing

### 2.1 Technical Root Cause of Jitter

In `components/editor/side-panel.tsx`, line 367 had `transition-[width] duration-75`. When dragging, mouse move events fire at 60–120Hz while CSS transition engine continually interpolates stale widths against new mouse coordinates, causing heavy visual tearing and CPU thrashing.

### 2.2 Fluid Resizing Rules

1. **Disable Transition During Active Drag**:
   ```tsx
   className={`relative flex shrink-0 flex-col border-l border-border bg-background ${
     isResizing ? "transition-none select-none" : "transition-[width] duration-150 ease-out"
   }`}
   ```
2. **Backdrop Pointer Events**: Set `document.body.style.userSelect = "none"` and `pointer-events: none` on the text editor iframe/content during drag to avoid losing mouse capture over text selections.
3. **Debounced LocalStorage**: Update `localStorage` only in `handleMouseUp` (pointerup), not on every mousemove pixel event.

---

## 3. Tiptap BubbleMenu & Radix Dropdown Portal Integration

### 3.1 Root Cause of Dropdown Popover Disappearance

1. Radix `DropdownMenu` defaults to rendering in `document.body` via a `Portal`.
2. When the user clicks the "AI Rewrite" trigger or submenu item, focus shifts from the ProseMirror editor DOM node to the portal.
3. Tiptap's `BubbleMenu` interprets this blur as selection loss and immediately unmounts itself, destroying the dropdown before the action can execute.

### 3.2 Solution Pattern

1. **Set `modal={false}`**: Prevents Radix from locking focus and trapping events.
2. **Use `portal={false}`** (or inline container): Renders the dropdown content within the `BubbleMenu`'s DOM hierarchy rather than at the root of `document.body`.
3. **Prevent MouseDown Default**: On trigger buttons, attach `onMouseDown={(e) => e.preventDefault()}` so the editor never receives a blur event.
4. **State Pinning**: Pass `isDropdownOpen` into `shouldShow({ editor, from, to })` predicate so BubbleMenu stays mounted as long as the user is interacting with the submenu.

---

## 4. Minimalist Focused Document Header (Adaptive Focus)

### 4.1 Layout Rebalance

- **Breadcrumb & Minimal Actions**:
  - Left: Folder breadcrumb (`📁 Folder / Doc Title`).
  - Right: Minimal Save dot (`● Saved`), AI Review icon-pill, and Side Panel toggle (`⌘J`).
- **Relocate Auxiliary Metrics**:
  - Move word count, character count, and reading time (~2 min) to a subtle status bar at the bottom right of the editor.
- **Auto-Expanding Inline Title**:
  - Borderless, clean typography matching H1, seamless enter/escape handling, no layout jumps.

---

## 5. Agent Self Stress-Testing Harness

### 5.1 Interactive Storybook Stories (`@storybook/test`)

Write stories with `play` functions for every core workspace component:

```typescript
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { within, userEvent, expect } from "@storybook/test";
import { SidePanel } from "./side-panel";

export const StreamingState: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const input = canvas.getByPlaceholderText(/Ask about grammar/i);
    await userEvent.type(input, "Explain past perfect");
    const sendButton = canvas.getByRole("button", { name: /send/i });
    await userEvent.click(sendButton);
    await expect(canvas.getByText(/Thinking…/i)).toBeInTheDocument();
  },
};
```

### 5.2 Verification Pipeline

1. `bun run typecheck` & `bun run lint` (Static correctness)
2. `bun test` (Unit & algorithmic tests)
3. `bun run test-storybook` (Automated execution of all Storybook `play` functions)
4. `bun run test:visual` (Dockerized visual snapshot regression to verify zero layout shifts)

---

## 6. Primary Sources & Citations

- **Google GenAI SDK**: `@google/genai` `generateContentStream` specification ([googleapis/js-genai](https://github.com/googleapis/js-genai)).
- **Tiptap Extensions**: BubbleMenu lifecycle & Floating UI integration ([Tiptap v3 Docs](https://tiptap.dev/docs/editor/extensions/functionality/bubble-menu)).
- **Radix UI Primitives**: DropdownMenu focus management, `modal={false}`, `portal={false}` ([Radix UI Documentation](https://www.radix-ui.com/primitives/docs/components/dropdown-menu)).
- **Storybook Interaction Testing**: `@storybook/test` `play` functions and test-runner ([Storybook Documentation](https://storybook.js.org/docs/writing-tests/interaction-testing)).
