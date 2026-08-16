"use client";

import type { Editor } from "@tiptap/react";
import { BubbleMenu } from "@tiptap/react/menus";
import { Bold, Italic, Code, Highlighter, X } from "lucide-react";
import { Button } from "@/components/ui/button";

// ─── Highlight colour palette ─────────────────────────────────────────────────

interface HighlightColor {
  label: string;
  color: string;
  className: string;
}

const HIGHLIGHT_COLORS: HighlightColor[] = [
  {
    label: "Yellow — new word / phrase",
    color: "#FDE68A",
    className: "bg-yellow-200",
  },
  {
    label: "Green — correct / good",
    color: "#A7F3D0",
    className: "bg-emerald-200",
  },
  {
    label: "Blue — grammar note",
    color: "#BAE6FD",
    className: "bg-sky-200",
  },
  {
    label: "Pink — error area",
    color: "#FBCFE8",
    className: "bg-pink-200",
  },
  {
    label: "Purple — style note",
    color: "#DDD6FE",
    className: "bg-violet-200",
  },
];

// ─── FormattingMenu ───────────────────────────────────────────────────────────

interface FormattingMenuProps {
  editor: Editor;
}

/**
 * Bubble menu that appears on any text selection, offering inline formatting
 * (Bold, Italic, Code) and highlight colour swatches.
 *
 * Runs alongside InlineSuggestionMenu using a different pluginKey so both
 * can coexist on the same editor instance.
 */
export function FormattingMenu({ editor }: FormattingMenuProps) {
  const toggleHighlight = (color: string) => {
    if (editor.isActive("highlight", { color })) {
      editor.chain().focus().unsetHighlight().run();
    } else {
      editor.chain().focus().setHighlight({ color }).run();
    }
  };

  const removeHighlight = () => {
    editor.chain().focus().unsetHighlight().run();
  };

  const hasHighlight = editor.isActive("highlight");

  return (
    <BubbleMenu
      editor={editor}
      pluginKey="formattingMenu"
      updateDelay={0}
      options={{ placement: "bottom", offset: 6 }}
      shouldShow={({ editor: e, from, to }) => e.isEditable && from !== to}
    >
      <div
        className="flex items-center gap-0.5 rounded-lg border bg-popover p-1 shadow-md"
        role="toolbar"
        aria-label="Text formatting"
      >
        {/* ── Inline formatting ────────────────────────────── */}
        <Button
          type="button"
          variant={editor.isActive("bold") ? "secondary" : "ghost"}
          size="icon"
          className="size-7"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => editor.chain().focus().toggleBold().run()}
          aria-label="Bold"
          aria-pressed={editor.isActive("bold")}
        >
          <Bold className="size-3.5" />
        </Button>

        <Button
          type="button"
          variant={editor.isActive("italic") ? "secondary" : "ghost"}
          size="icon"
          className="size-7"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => editor.chain().focus().toggleItalic().run()}
          aria-label="Italic"
          aria-pressed={editor.isActive("italic")}
        >
          <Italic className="size-3.5" />
        </Button>

        <Button
          type="button"
          variant={editor.isActive("code") ? "secondary" : "ghost"}
          size="icon"
          className="size-7"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => editor.chain().focus().toggleCode().run()}
          aria-label="Inline code"
          aria-pressed={editor.isActive("code")}
        >
          <Code className="size-3.5" />
        </Button>

        {/* ── Separator ───────────────────────────────────── */}
        <div className="mx-1 h-4 w-px bg-border" aria-hidden="true" />

        {/* ── Highlight icon (informational) ──────────────── */}
        <Highlighter
          className="size-3.5 shrink-0 text-muted-foreground"
          aria-hidden="true"
        />

        {/* ── Colour swatches ─────────────────────────────── */}
        {HIGHLIGHT_COLORS.map(({ label, color, className }) => (
          <button
            key={color}
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => toggleHighlight(color)}
            aria-label={label}
            aria-pressed={editor.isActive("highlight", { color })}
            className={`size-5 rounded-sm border transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${className} ${
              editor.isActive("highlight", { color })
                ? "ring-2 ring-ring ring-offset-1"
                : ""
            }`}
          />
        ))}

        {/* ── Remove highlight ─────────────────────────────── */}
        {hasHighlight && (
          <>
            <div className="mx-1 h-4 w-px bg-border" aria-hidden="true" />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-7"
              onMouseDown={(e) => e.preventDefault()}
              onClick={removeHighlight}
              aria-label="Remove highlight"
            >
              <X className="size-3.5" />
            </Button>
          </>
        )}
      </div>
    </BubbleMenu>
  );
}
