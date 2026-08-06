import { expect, test, describe, mock, beforeAll } from "bun:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

// Mock next/navigation & next-themes
mock.module("next/navigation", () => ({
  useRouter: () => ({ push: mock(() => {}) }),
  usePathname: () => "/",
}));

mock.module("next-themes", () => ({
  useTheme: () => ({ theme: undefined, setTheme: mock(() => {}) }),
}));

mock.module("@dnd-kit/core", () => ({
  DndContext: ({ children }: { children: React.ReactNode }) => children,
  closestCenter: mock(() => {}),
  PointerSensor: mock(() => {}),
  useSensor: mock(() => {}),
  useSensors: mock(() => []),
  DragOverlay: ({ children }: { children: React.ReactNode }) => children,
}));

mock.module("@dnd-kit/sortable", () => ({
  SortableContext: ({ children }: { children: React.ReactNode }) => children,
  useSortable: () => ({
    attributes: {},
    listeners: {},
    setNodeRef: mock(() => {}),
    transform: null,
    transition: undefined,
    isDragging: false,
  }),
  verticalListSortingStrategy: mock(() => {}),
}));

// Setup React 19 dispatcher so components calling hooks (useState/useRef/useEffect) can be invoked directly
beforeAll(() => {
  const internals =
    (React as unknown as Record<string, unknown>)[
      "__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE"
    ] ||
    (React as unknown as Record<string, unknown>)[
      "__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED"
    ];

  const mockDispatcher = {
    useState: (init: unknown) => [
      typeof init === "function" ? init() : init,
      () => {},
    ],
    useRef: (init: unknown) => ({ current: init }),
    useCallback: (fn: unknown) => fn,
    useEffect: () => {},
    useLayoutEffect: () => {},
    useMemo: (fn: () => unknown) => fn(),
    useContext: () => ({}),
  };

  if (internals && typeof internals === "object") {
    (internals as Record<string, unknown>).H = mockDispatcher;
    (internals as Record<string, unknown>).ReactCurrentDispatcher = {
      current: mockDispatcher,
    };
  }
});

import { CommandDialog, CommandInput, Command } from "@/components/ui/command";
import { SidebarProvider } from "@/components/ui/sidebar";
import { DocumentTree } from "@/components/sidebar/document-tree";
import { DocumentItem } from "@/components/sidebar/document-item";
import { SearchBar } from "@/components/sidebar/search-bar";
import { ThemeToggle } from "@/components/sidebar/theme-toggle";

describe("Sidebar UI Components - Regression & Hydration Tests", () => {
  describe("Bug 3: CommandDialog cmdk context wrapper", () => {
    test("CommandDialog wraps children in Command component", () => {
      const dialogElement = CommandDialog({
        open: true,
        children: React.createElement(CommandInput, { placeholder: "Search" }),
      });

      // Find DialogContent in the element tree
      const dialogContent = dialogElement.props.children[1];
      expect(dialogContent).toBeDefined();

      // DialogContent's child must be <Command>, which provides the cmdk context required by CommandInput
      const commandChild = dialogContent.props.children;
      expect(commandChild.type).toBe(Command);
    });
  });

  describe("Bug 2: DocumentItem & DocumentTree HTML list item nesting", () => {
    test("DocumentItem when isSubItem=false renders SidebarMenuItem (not SidebarMenuSubItem inside SidebarMenuItem)", () => {
      const fakeDoc = {
        id: "doc-1",
        title: "Root Document",
        folderId: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // DocumentItem rendered for root (isSubItem=false)
      const docItemElement = DocumentItem({
        doc: fakeDoc,
        isActive: false,
        folders: [],
        isSubItem: false,
        onRename: async () => {},
        onDelete: async () => {},
        onMove: async () => {},
        onClick: () => {},
      });

      // The top element of DocumentItem when isSubItem=false must be SidebarMenuItem
      const topMenuElement = docItemElement.props.children[0];
      expect(topMenuElement.type.name).toBe("SidebarMenuItem");
    });

    test("DocumentItem when isSubItem=true renders SidebarMenuSubItem", () => {
      const fakeDoc = {
        id: "doc-2",
        title: "Folder Document",
        folderId: "folder-1",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const docItemElement = DocumentItem({
        doc: fakeDoc,
        isActive: false,
        folders: [],
        isSubItem: true,
        onRename: async () => {},
        onDelete: async () => {},
        onMove: async () => {},
        onClick: () => {},
      });

      const topMenuElement = docItemElement.props.children[0];
      expect(topMenuElement.type.name).toBe("SidebarMenuSubItem");
    });
  });

  describe("Bug 1: ThemeToggle SSR hydration match", () => {
    test("ThemeToggle returns initial mounted check handling before effect runs", () => {
      const toggleElement = ThemeToggle();
      expect(toggleElement).toBeDefined();
      // Before mounted (useState initial false), it renders disabled button with System text to match SSR
      expect(toggleElement.props.disabled).toBe(true);
    });
  });

  describe("Sidebar composition standards", () => {
    test("search exposes one grouped control with an accessible clear action", () => {
      const markup = renderToStaticMarkup(
        React.createElement(SearchBar, {
          value: "draft",
          onChange: () => {},
        })
      );

      expect(markup).toContain('data-slot="input-group"');
      expect(markup).toContain('data-slot="input-group-control"');
      expect(markup).toContain('aria-label="Clear search"');
    });

    test("an empty document tree renders the standard empty state", () => {
      const markup = renderToStaticMarkup(
        React.createElement(DocumentTree, {
          folders: [],
          documents: [],
          onCreateDocument: async () => {},
          onRenameDocument: async () => {},
          onDeleteDocument: async () => {},
          onMoveDocument: async () => {},
          onCreateFolder: async () => {},
          onRenameFolder: async () => {},
          onDeleteFolder: async () => {},
        })
      );

      expect(markup).toContain('data-slot="empty"');
      expect(markup).toContain("No documents yet");
    });

    test("search results render even when the title does not contain the query", () => {
      const markup = renderToStaticMarkup(
        React.createElement(
          SidebarProvider,
          null,
          React.createElement(DocumentTree, {
            folders: [],
            documents: [
              {
                id: "content-match",
                title: "Weekly reflection",
                folderId: null,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              },
            ],
            searchQuery: "grammar",
            onCreateDocument: async () => {},
            onRenameDocument: async () => {},
            onDeleteDocument: async () => {},
            onMoveDocument: async () => {},
            onCreateFolder: async () => {},
            onRenameFolder: async () => {},
            onDeleteFolder: async () => {},
          })
        )
      );

      expect(markup).toContain("Weekly reflection");
      expect(markup).not.toContain("No documents match");
    });
  });
});
