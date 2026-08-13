"use client";

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { Extension } from "@tiptap/core";
import Suggestion, { type SuggestionOptions } from "@tiptap/suggestion";
import type { Editor, Range } from "@tiptap/core";

// Type-only imports to activate module augmentation for ChainedCommands
import type {} from "@tiptap/extension-heading";
import type {} from "@tiptap/extension-code-block";
import type {} from "@tiptap/extension-blockquote";
import type {} from "@tiptap/extension-horizontal-rule";
import type {} from "@tiptap/extension-table";
import type {} from "@tiptap/extension-list";

// ─── Command definitions ─────────────────────────────────────────────────────

export interface SlashCommandItem {
  title: string;
  description: string;
  icon: string;
  command: (args: { editor: Editor; range: Range }) => void;
}

export const slashCommandItems: SlashCommandItem[] = [
  {
    title: "Heading 1",
    description: "Large section heading",
    icon: "H1",
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setHeading({ level: 1 }).run();
    },
  },
  {
    title: "Heading 2",
    description: "Medium section heading",
    icon: "H2",
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setHeading({ level: 2 }).run();
    },
  },
  {
    title: "Heading 3",
    description: "Small section heading",
    icon: "H3",
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setHeading({ level: 3 }).run();
    },
  },
  {
    title: "Bullet List",
    description: "Create a simple bullet list",
    icon: "•",
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleBulletList().run();
    },
  },
  {
    title: "Numbered List",
    description: "Create a numbered list",
    icon: "1.",
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleOrderedList().run();
    },
  },
  {
    title: "Task List",
    description: "Track tasks with checkboxes",
    icon: "☑",
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleTaskList().run();
    },
  },
  {
    title: "Table",
    description: "Insert a table",
    icon: "⊞",
    command: ({ editor, range }) => {
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
        .run();
    },
  },
  {
    title: "Code Block",
    description: "Insert a code block",
    icon: "<>",
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleCodeBlock().run();
    },
  },
  {
    title: "Blockquote",
    description: "Capture a quote",
    icon: "❝",
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleBlockquote().run();
    },
  },
  {
    title: "Horizontal Rule",
    description: "Insert a divider",
    icon: "—",
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setHorizontalRule().run();
    },
  },
];

// ─── React dropdown component ────────────────────────────────────────────────

interface CommandListProps {
  items: SlashCommandItem[];
  command: (item: SlashCommandItem) => void;
}

export interface CommandListRef {
  onKeyDown: (args: { event: KeyboardEvent }) => boolean;
}

export const CommandList = forwardRef<CommandListRef, CommandListProps>(
  ({ items, command }, ref) => {
    const [selectedIndex, setSelectedIndex] = useState(0);
    const containerRef = useRef<HTMLDivElement>(null);

    // Scroll the selected item into view
    useEffect(() => {
      const container = containerRef.current;
      if (!container) return;
      const selected = container.children[selectedIndex] as
        HTMLElement | undefined;
      selected?.scrollIntoView({ block: "nearest" });
    }, [selectedIndex]);

    const selectItem = useCallback(
      (index: number) => {
        const item = items[index];
        if (item) command(item);
      },
      [items, command]
    );

    useImperativeHandle(ref, () => ({
      onKeyDown: ({ event }) => {
        if (event.key === "ArrowUp") {
          setSelectedIndex((i) => (i + items.length - 1) % items.length);
          return true;
        }
        if (event.key === "ArrowDown") {
          setSelectedIndex((i) => (i + 1) % items.length);
          return true;
        }
        if (event.key === "Enter") {
          selectItem(selectedIndex);
          return true;
        }
        return false;
      },
    }));

    if (items.length === 0) {
      return (
        <div className="slash-command-menu">
          <div className="slash-command-empty">No results</div>
        </div>
      );
    }

    return (
      <div className="slash-command-menu" ref={containerRef}>
        {items.map((item, index) => (
          <button
            key={item.title}
            className={`slash-command-item ${index === selectedIndex ? "is-selected" : ""}`}
            onClick={() => selectItem(index)}
            onMouseEnter={() => setSelectedIndex(index)}
            type="button"
          >
            <span className="slash-command-icon">{item.icon}</span>
            <div className="slash-command-text">
              <span className="slash-command-title">{item.title}</span>
              <span className="slash-command-description">
                {item.description}
              </span>
            </div>
          </button>
        ))}
      </div>
    );
  }
);

CommandList.displayName = "CommandList";

// ─── Floating popup renderer ─────────────────────────────────────────────────

interface PopupState {
  items: SlashCommandItem[];
  command: (item: SlashCommandItem) => void;
  clientRect: (() => DOMRect | null) | null;
}

function SlashCommandPopup({
  items,
  command,
  clientRect,
  onListMount,
}: PopupState & {
  onListMount: (ref: CommandListRef | null) => void;
}) {
  const popupRef = useRef<HTMLDivElement>(null);

  // Callback ref — reports the CommandListRef back to the hook owner
  const listCallbackRef = useCallback(
    (node: CommandListRef | null) => {
      onListMount(node);
    },
    [onListMount]
  );

  // Position the popup
  useLayoutEffect(() => {
    const el = popupRef.current;
    if (!el || !clientRect) return;

    const rect = clientRect();
    if (!rect) return;

    el.style.top = `${rect.bottom + window.scrollY + 4}px`;
    el.style.left = `${rect.left + window.scrollX}px`;
  }, [clientRect, items]);

  // Key based on item titles — forces CommandList remount (and selectedIndex
  // reset) whenever the filtered items change.
  const itemsKey = items.map((i) => i.title).join("\0");

  return createPortal(
    <div
      ref={popupRef}
      className="slash-command-popup"
      style={{ position: "absolute", zIndex: 50 }}
    >
      <CommandList
        key={itemsKey}
        ref={listCallbackRef}
        items={items}
        command={command}
      />
    </div>,
    document.body
  );
}

// ─── Tiptap Extension ────────────────────────────────────────────────────────

/**
 * Creates the suggestion options for the slash command menu.
 *
 * `getKeyDownHandler` is called lazily when ProseMirror fires a keyDown —
 * never during React render — so it's safe to read mutable state inside.
 */
export function createSlashCommandSuggestion(
  renderPopup: (state: PopupState | null) => void,
  getKeyDownHandler: () => ((args: { event: KeyboardEvent }) => boolean) | null
): Omit<SuggestionOptions<SlashCommandItem>, "editor"> {
  return {
    char: "/",
    items: ({ query }) =>
      slashCommandItems.filter((item) =>
        item.title.toLowerCase().includes(query.toLowerCase())
      ),
    command: ({ editor, range, props }) => {
      props.command({ editor, range });
    },
    render: () => ({
      onStart: (props) => {
        renderPopup({
          items: props.items,
          command: (item) => props.command(item),
          clientRect: props.clientRect ?? null,
        });
      },
      onUpdate: (props) => {
        renderPopup({
          items: props.items,
          command: (item) => props.command(item),
          clientRect: props.clientRect ?? null,
        });
      },
      onKeyDown: ({ event }) => getKeyDownHandler()?.({ event }) ?? false,
      onExit: () => {
        renderPopup(null);
      },
    }),
  };
}

/**
 * Hook that creates the SlashCommands extension and renders the popup.
 *
 * The keyDown bridge uses a mutable variable scoped to the useState
 * initializer closure. ProseMirror reads it lazily via a getter, and
 * the popup writes it via a callback — no React refs are involved.
 */
export function useSlashCommands() {
  const [popupState, setPopupState] = useState<PopupState | null>(null);

  // Stable bundle created once: the extension + a callback to wire keyDown
  const [{ extension, setListRef, getListRef }] = useState(() => {
    let listRef: CommandListRef | null = null;

    return {
      extension: Extension.create({
        name: "slashCommands",

        addProseMirrorPlugins() {
          return [
            Suggestion({
              editor: this.editor,
              ...createSlashCommandSuggestion(
                setPopupState,
                () => listRef?.onKeyDown ?? null
              ),
            }),
          ];
        },
      }),
      setListRef: (ref: CommandListRef | null) => {
        listRef = ref;
      },
      getListRef: () => listRef,
    };
  });

  // Clean up listRef when popup closes
  useEffect(() => {
    if (!popupState && getListRef()) {
      setListRef(null);
    }
  }, [popupState, getListRef, setListRef]);

  const popup = popupState ? (
    <SlashCommandPopup {...popupState} onListMount={setListRef} />
  ) : null;

  return { extension, popup };
}
