import {
  afterEach,
  expect,
  test,
  describe,
  mock,
  beforeAll,
  beforeEach,
} from "bun:test";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

// Mock next/navigation & next-themes
const routerPush = mock(() => {});
const routerReplace = mock(() => {});
const routerRefresh = mock(() => {});
let currentPathname = "/";
const mockRouter = {
  push: routerPush,
  replace: routerReplace,
  refresh: routerRefresh,
};

mock.module("next/navigation", () => ({
  useRouter: () => mockRouter,
  usePathname: () => currentPathname,
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

const renameDocument = mock(async () => true);
const deleteDocument = mock(async () => true);
let folderCreationSucceeds = true;
const createFolder = mock(async (name: string) =>
  folderCreationSucceeds
    ? {
        id: "folder-1",
        name,
        createdAt: "2026-08-07T00:00:00.000Z",
        updatedAt: "2026-08-07T00:00:00.000Z",
      }
    : null
);

mock.module("@/hooks/use-sidebar-data", () => ({
  useSidebarData: () => ({
    data: {
      folders: [],
      documents: [
        {
          id: "active-document",
          title: "Active document",
          folderId: null,
          createdAt: "2026-08-06T00:00:00.000Z",
          updatedAt: "2026-08-06T00:00:00.000Z",
        },
        {
          id: "other-document",
          title: "Other document",
          folderId: null,
          createdAt: "2026-08-06T00:00:00.000Z",
          updatedAt: "2026-08-06T00:00:00.000Z",
        },
      ],
    },
    isLoading: false,
    createDocument: mock(async () => null),
    renameDocument,
    deleteDocument,
    moveDocument: mock(async () => true),
    createFolder,
    renameFolder: mock(async () => true),
    deleteFolder: mock(async () => true),
  }),
}));

interface SignOutOptions {
  fetchOptions?: {
    onSuccess?: () => void;
  };
}

const signOut = mock(async (options?: SignOutOptions) => {
  options?.fetchOptions?.onSuccess?.();
});

mock.module("@/lib/auth-client", () => ({
  authClient: { signOut },
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
    useReducer: (
      _reducer: unknown,
      initialArg: unknown,
      init?: (value: unknown) => unknown
    ) => [init ? init(initialArg) : initialArg, () => {}],
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
import { AppSidebarClient } from "@/components/sidebar/app-sidebar-client";

function findElementByType(
  node: React.ReactNode,
  type: React.ElementType
): React.ReactElement | undefined {
  if (!React.isValidElement(node)) return undefined;
  if (node.type === type) return node;

  const props = node.props as { children?: React.ReactNode };
  for (const child of React.Children.toArray(props.children)) {
    const match = findElementByType(child, type);
    if (match) return match;
  }

  return undefined;
}

function renderAppSidebarDocumentTree() {
  const sidebar = AppSidebarClient({
    user: {
      id: "user-1",
      name: "Test User",
      email: "test@example.com",
    },
  });
  const tree = findElementByType(sidebar, DocumentTree);
  expect(tree).toBeDefined();
  return tree as React.ReactElement<React.ComponentProps<typeof DocumentTree>>;
}

function renderAppSidebar() {
  return render(
    React.createElement(
      SidebarProvider,
      null,
      React.createElement(AppSidebarClient, {
        user: {
          id: "user-1",
          name: "Test User",
          email: "test@example.com",
        },
      })
    )
  );
}

function getFolderNameInput() {
  return document.querySelector<HTMLInputElement>("input:not(#sidebar-search)");
}

describe("Sidebar UI Components - Regression & Hydration Tests", () => {
  beforeEach(() => {
    currentPathname = "/documents/active-document";
    routerPush.mockClear();
    routerReplace.mockClear();
    routerRefresh.mockClear();
    renameDocument.mockClear();
    deleteDocument.mockClear();
    createFolder.mockClear();
    signOut.mockClear();
    folderCreationSucceeds = true;
    renameDocument.mockImplementation(async () => true);
    deleteDocument.mockImplementation(async () => true);
  });

  afterEach(cleanup);

  describe("sidebar actions", () => {
    async function beginFolderCreation() {
      renderAppSidebar();
      fireEvent.click(screen.getByRole("button", { name: /new folder/i }));

      await waitFor(() => expect(getFolderNameInput()).not.toBeNull());
      return getFolderNameInput() as HTMLInputElement;
    }

    test("creating a Folder commits its name and closes the editor", async () => {
      const input = await beginFolderCreation();

      fireEvent.change(input, { target: { value: "Writing" } });
      fireEvent.keyDown(input, { key: "Enter" });

      await waitFor(() => expect(createFolder).toHaveBeenCalledWith("Writing"));
      await waitFor(() => expect(getFolderNameInput()).toBeNull());
    });

    test("cancelling Folder creation closes the editor without creating a Folder", async () => {
      const input = await beginFolderCreation();

      fireEvent.keyDown(input, { key: "Escape" });

      expect(getFolderNameInput()).toBeNull();
      expect(createFolder).not.toHaveBeenCalled();
    });

    test("a failed Folder creation keeps the editor open for retry", async () => {
      folderCreationSucceeds = false;
      const input = await beginFolderCreation();

      fireEvent.change(input, { target: { value: "Writing" } });
      fireEvent.keyDown(input, { key: "Enter" });

      await waitFor(() => expect(createFolder).toHaveBeenCalledWith("Writing"));
      expect(getFolderNameInput()).not.toBeNull();
    });

    test("double-clicking a Document opens inline rename and commits on Enter", async () => {
      renderAppSidebar();
      const docButton = screen.getByRole("button", {
        name: /active document/i,
      });

      fireEvent.doubleClick(docButton);

      const renameInput = await waitFor(() => {
        const input = document.querySelector<HTMLInputElement>(
          "input:not(#sidebar-search)"
        );
        expect(input).not.toBeNull();
        return input as HTMLInputElement;
      });

      expect(renameInput.value).toBe("Active document");
      fireEvent.change(renameInput, { target: { value: "New Title" } });
      fireEvent.keyDown(renameInput, { key: "Enter" });

      await waitFor(() =>
        expect(renameDocument).toHaveBeenCalledWith(
          "active-document",
          "New Title"
        )
      );
    });

    test("signing out uses the muted Button treatment and returns to login", async () => {
      renderAppSidebar();
      const button = screen.getByRole("button", { name: "Sign out" });

      expect(button.dataset.variant).toBe("muted");
      fireEvent.click(button);

      await waitFor(() => expect(signOut).toHaveBeenCalledTimes(1));
      expect(routerPush).toHaveBeenCalledWith("/login");
      expect(routerRefresh).toHaveBeenCalledTimes(1);
    });
  });

  describe("active Document mutation synchronization", () => {
    test("renaming the active Document refreshes its content after success", async () => {
      const tree = renderAppSidebarDocumentTree();

      await tree.props.onRenameDocument("active-document", "Renamed");

      expect(renameDocument).toHaveBeenCalledWith("active-document", "Renamed");
      expect(routerRefresh).toHaveBeenCalledTimes(1);
    });

    test("renaming a non-active Document leaves the open Document undisturbed", async () => {
      const tree = renderAppSidebarDocumentTree();

      await tree.props.onRenameDocument("other-document", "Renamed");

      expect(renameDocument).toHaveBeenCalledWith("other-document", "Renamed");
      expect(routerRefresh).not.toHaveBeenCalled();
      expect(routerReplace).not.toHaveBeenCalled();
    });

    test("deleting the active Document replaces its route with the application root", async () => {
      const tree = renderAppSidebarDocumentTree();

      await tree.props.onDeleteDocument("active-document");

      expect(deleteDocument).toHaveBeenCalledWith("active-document");
      expect(routerReplace).toHaveBeenCalledWith("/");
    });

    test("deleting a non-active Document leaves the active Document open", async () => {
      const tree = renderAppSidebarDocumentTree();

      await tree.props.onDeleteDocument("other-document");

      expect(deleteDocument).toHaveBeenCalledWith("other-document");
      expect(routerReplace).not.toHaveBeenCalled();
      expect(routerRefresh).not.toHaveBeenCalled();
    });

    test("failed active Document mutations retain the confirmed route and content", async () => {
      renameDocument.mockImplementation(async () => false);
      deleteDocument.mockImplementation(async () => false);
      const tree = renderAppSidebarDocumentTree();

      await tree.props.onRenameDocument("active-document", "Unconfirmed");
      await tree.props.onDeleteDocument("active-document");

      expect(routerRefresh).not.toHaveBeenCalled();
      expect(routerReplace).not.toHaveBeenCalled();
    });
  });

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
          isCreatingFolder: false,
          onCreateFolder: async () => null,
          onCancelCreateFolder: () => {},
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
            isCreatingFolder: false,
            onCreateFolder: async () => null,
            onCancelCreateFolder: () => {},
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
