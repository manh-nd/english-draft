"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
  SidebarMenuAction,
} from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub as DropdownMenuSubMenu,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  ChevronRight,
  FileText,
  Folder,
  FolderOpen,
  GripVertical,
  MoreHorizontal,
  Plus,
  Trash2,
  Pencil,
  FolderInput,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { SidebarDocument, SidebarFolder } from "@/hooks/use-sidebar-data";

// ─── Types ───────────────────────────────────────────────────────────────────

interface DocumentTreeProps {
  folders: SidebarFolder[];
  documents: SidebarDocument[];
  activeDocumentId?: string;
  filter: string;
  onCreateDocument: (folderId?: string | null) => Promise<void>;
  onRenameDocument: (id: string, title: string) => Promise<void>;
  onDeleteDocument: (id: string) => Promise<void>;
  onMoveDocument: (id: string, folderId: string | null) => Promise<void>;
  onCreateFolder: (name: string) => Promise<void | SidebarFolder | null>;
  onRenameFolder: (id: string, name: string) => Promise<void>;
  onDeleteFolder: (id: string) => Promise<void>;
}

// ─── Inline Rename Input ──────────────────────────────────────────────────────

function InlineRename({
  value,
  onCommit,
  onCancel,
}: {
  value: string;
  onCommit: (name: string) => void;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  const commit = () => {
    const trimmed = draft.trim();
    if (trimmed && trimmed !== value) onCommit(trimmed);
    else onCancel();
  };

  return (
    <input
      ref={inputRef}
      autoFocus
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") commit();
        if (e.key === "Escape") onCancel();
      }}
      className="h-6 w-full rounded border border-border bg-background px-1 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
      onClick={(e) => e.stopPropagation()}
    />
  );
}

// ─── Document Item (sortable) ─────────────────────────────────────────────────

export function DocumentItem({
  doc,
  isActive,
  folders,
  isSubItem = false,
  onRename,
  onDelete,
  onMove,
  onClick,
}: {
  doc: SidebarDocument;
  isActive: boolean;
  folders: SidebarFolder[];
  isSubItem?: boolean;
  onRename: (title: string) => Promise<void>;
  onDelete: () => Promise<void>;
  onMove: (folderId: string | null) => Promise<void>;
  onClick: () => void;
}) {
  const [isRenaming, setIsRenaming] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: doc.id, data: { type: "document", doc } });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  const MenuItem = isSubItem ? SidebarMenuSubItem : SidebarMenuItem;
  const MenuButton = isSubItem ? SidebarMenuSubButton : SidebarMenuButton;

  return (
    <>
      <MenuItem ref={setNodeRef} style={style}>
        <MenuButton isActive={isActive} onClick={onClick} className="group/doc">
          {/* Drag handle */}
          <span
            {...attributes}
            {...listeners}
            className="mr-1 cursor-grab opacity-0 transition-opacity group-hover/doc:opacity-50"
            onClick={(e) => e.stopPropagation()}
          >
            <GripVertical className="size-3" />
          </span>

          <FileText className="size-3.5 shrink-0" />

          {isRenaming ? (
            <InlineRename
              value={doc.title}
              onCommit={async (t) => {
                setIsRenaming(false);
                await onRename(t);
              }}
              onCancel={() => setIsRenaming(false)}
            />
          ) : (
            <span className="truncate">{doc.title || "Untitled"}</span>
          )}
        </MenuButton>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuAction showOnHover>
              <MoreHorizontal />
              <span className="sr-only">Document options</span>
            </SidebarMenuAction>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="right" align="start">
            <DropdownMenuItem onSelect={() => setIsRenaming(true)}>
              <Pencil data-icon="inline-start" />
              Rename
            </DropdownMenuItem>

            {/* Move to */}
            <DropdownMenuSubMenu>
              <DropdownMenuSubTrigger>
                <FolderInput data-icon="inline-start" />
                Move to…
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                <DropdownMenuItem
                  onSelect={() => onMove(null)}
                  disabled={doc.folderId === null}
                >
                  Root (no folder)
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {folders.map((f) => (
                  <DropdownMenuItem
                    key={f.id}
                    onSelect={() => onMove(f.id)}
                    disabled={doc.folderId === f.id}
                  >
                    {f.name}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuSubContent>
            </DropdownMenuSubMenu>

            <DropdownMenuSeparator />
            <DropdownMenuItem
              onSelect={() => setDeleteOpen(true)}
              className="text-destructive"
            >
              <Trash2 data-icon="inline-start" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </MenuItem>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete document?</AlertDialogTitle>
            <AlertDialogDescription>
              &ldquo;{doc.title || "Untitled"}&rdquo; will be permanently
              deleted. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                setDeleteOpen(false);
                await onDelete();
              }}
              variant="destructive"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// ─── Folder Item ──────────────────────────────────────────────────────────────

function FolderItem({
  folder,
  documents,
  allFolders,
  activeDocumentId,
  onCreateDocument,
  onRenameDoc,
  onDeleteDoc,
  onMoveDoc,
  onRenameFolder,
  onDeleteFolder,
  onNavigate,
}: {
  folder: SidebarFolder;
  documents: SidebarDocument[];
  allFolders: SidebarFolder[];
  activeDocumentId?: string;
  onCreateDocument: () => Promise<void>;
  onRenameDoc: (id: string, title: string) => Promise<void>;
  onDeleteDoc: (id: string) => Promise<void>;
  onMoveDoc: (id: string, folderId: string | null) => Promise<void>;
  onRenameFolder: (name: string) => Promise<void>;
  onDeleteFolder: () => Promise<void>;
  onNavigate: (id: string) => void;
}) {
  const [open, setOpen] = useState(true);
  const [isRenaming, setIsRenaming] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const { setNodeRef, isOver } = useSortable({
    id: `folder-${folder.id}`,
    data: { type: "folder", folderId: folder.id },
  });

  return (
    <>
      <SidebarMenuItem ref={setNodeRef}>
        <Collapsible open={open} onOpenChange={setOpen}>
          <CollapsibleTrigger asChild>
            <SidebarMenuButton
              className={cn("group/folder", isOver && "bg-accent")}
            >
              {open ? (
                <FolderOpen className="size-4 shrink-0" />
              ) : (
                <Folder className="size-4 shrink-0" />
              )}

              {isRenaming ? (
                <InlineRename
                  value={folder.name}
                  onCommit={async (n) => {
                    setIsRenaming(false);
                    await onRenameFolder(n);
                  }}
                  onCancel={() => setIsRenaming(false)}
                />
              ) : (
                <span className="truncate">{folder.name}</span>
              )}

              <ChevronRight
                className={cn(
                  "ml-auto size-3.5 shrink-0 transition-transform",
                  open && "rotate-90"
                )}
              />
            </SidebarMenuButton>
          </CollapsibleTrigger>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <SidebarMenuAction showOnHover>
                <MoreHorizontal />
                <span className="sr-only">Folder options</span>
              </SidebarMenuAction>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="right" align="start">
              <DropdownMenuItem onSelect={onCreateDocument}>
                <Plus data-icon="inline-start" />
                New Document
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => setIsRenaming(true)}>
                <Pencil data-icon="inline-start" />
                Rename
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onSelect={() => setDeleteOpen(true)}
                className="text-destructive"
              >
                <Trash2 data-icon="inline-start" />
                Delete folder
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <CollapsibleContent>
            <SidebarMenuSub>
              <SortableContext
                items={documents.map((d) => d.id)}
                strategy={verticalListSortingStrategy}
              >
                {documents.length === 0 ? (
                  <SidebarMenuSubItem>
                    <span className="px-2 text-xs text-muted-foreground italic">
                      Empty folder
                    </span>
                  </SidebarMenuSubItem>
                ) : (
                  documents.map((doc) => (
                    <DocumentItem
                      key={doc.id}
                      doc={doc}
                      isActive={doc.id === activeDocumentId}
                      folders={allFolders}
                      isSubItem={true}
                      onRename={(t) => onRenameDoc(doc.id, t)}
                      onDelete={() => onDeleteDoc(doc.id)}
                      onMove={(fid) => onMoveDoc(doc.id, fid)}
                      onClick={() => onNavigate(doc.id)}
                    />
                  ))
                )}
              </SortableContext>
            </SidebarMenuSub>
          </CollapsibleContent>
        </Collapsible>
      </SidebarMenuItem>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete folder?</AlertDialogTitle>
            <AlertDialogDescription>
              &ldquo;{folder.name}&rdquo; will be deleted. All documents inside
              it will be moved to the root.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                setDeleteOpen(false);
                await onDeleteFolder();
              }}
              variant="destructive"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// ─── DocumentTree (root) ──────────────────────────────────────────────────────

export function DocumentTree({
  folders,
  documents,
  activeDocumentId,
  filter,
  onCreateDocument,
  onRenameDocument,
  onDeleteDocument,
  onMoveDocument,
  onCreateFolder,
  onRenameFolder,
  onDeleteFolder,
}: DocumentTreeProps) {
  const router = useRouter();
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [newFolderRenaming, setNewFolderRenaming] = useState(false);

  const sensors = useSensors(useSensor(PointerSensor));

  const navigate = useCallback(
    (id: string) => router.push(`/documents/${id}`),
    [router]
  );

  // Listen for the "sidebar:new-folder" custom event dispatched by AppSidebarClient
  useEffect(() => {
    const handler = () => setNewFolderRenaming(true);
    document.addEventListener("sidebar:new-folder", handler);
    return () => document.removeEventListener("sidebar:new-folder", handler);
  }, []);

  // ── Filtering ───────────────────────────────────────────────────────────────

  const lowerFilter = filter.toLowerCase();

  const visibleDocs = filter
    ? documents.filter((d) =>
        (d.title || "Untitled").toLowerCase().includes(lowerFilter)
      )
    : documents;

  const docsInFolder = (folderId: string) =>
    visibleDocs.filter((d) => d.folderId === folderId);

  const rootDocs = visibleDocs.filter((d) => d.folderId === null);

  // Which folders are visible (have matching docs, or no filter)
  const visibleFolders = filter
    ? folders.filter((f) => docsInFolder(f.id).length > 0)
    : folders;

  // ── Drag & Drop ─────────────────────────────────────────────────────────────

  const handleDragStart = (event: DragStartEvent) => {
    const id = String(event.active.id);
    if (!id.startsWith("folder-")) setActiveDragId(id);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveDragId(null);
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const docId = String(active.id);
    const overId = String(over.id);

    if (overId.startsWith("folder-")) {
      // Dropped onto a folder → move into it
      await onMoveDocument(docId, overId.replace("folder-", ""));
    } else if (overId === "root-drop-zone") {
      // Dropped onto root zone → move to root
      await onMoveDocument(docId, null);
    }
  };

  const activeDragDoc = activeDragId
    ? documents.find((d) => d.id === activeDragId)
    : null;

  // ── New folder handler ────────────────────────────────────────────────────

  const handleNewFolder = async (name: string) => {
    await onCreateFolder(name);
    setNewFolderRenaming(false);
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <SidebarMenu>
        {/* ── Folders ────────────────────────────────────────────── */}
        <SortableContext
          items={[
            ...visibleFolders.map((f) => `folder-${f.id}`),
            ...rootDocs.map((d) => d.id),
            "root-drop-zone",
          ]}
          strategy={verticalListSortingStrategy}
        >
          {visibleFolders.map((folder) => (
            <FolderItem
              key={folder.id}
              folder={folder}
              documents={docsInFolder(folder.id)}
              allFolders={folders}
              activeDocumentId={activeDocumentId}
              onCreateDocument={() => onCreateDocument(folder.id)}
              onRenameDoc={onRenameDocument}
              onDeleteDoc={onDeleteDocument}
              onMoveDoc={onMoveDocument}
              onRenameFolder={(n) => onRenameFolder(folder.id, n)}
              onDeleteFolder={() => onDeleteFolder(folder.id)}
              onNavigate={navigate}
            />
          ))}

          {/* ── Root Documents ──────────────────────────────────── */}
          {rootDocs.map((doc) => (
            <DocumentItem
              key={doc.id}
              doc={doc}
              isActive={doc.id === activeDocumentId}
              folders={folders}
              isSubItem={false}
              onRename={(t) => onRenameDocument(doc.id, t)}
              onDelete={() => onDeleteDocument(doc.id)}
              onMove={(fid) => onMoveDocument(doc.id, fid)}
              onClick={() => navigate(doc.id)}
            />
          ))}

          {/* Invisible drop zone for root when dragging */}
          {activeDragId && (
            <SidebarMenuItem id="root-drop-zone">
              <div className="h-1 w-full rounded bg-border" />
            </SidebarMenuItem>
          )}
        </SortableContext>

        {/* ── New folder inline rename ──────────────────────────── */}
        {newFolderRenaming && (
          <SidebarMenuItem>
            <SidebarMenuButton>
              <Folder className="size-4 shrink-0" />
              <InlineRename
                value=""
                onCommit={handleNewFolder}
                onCancel={() => setNewFolderRenaming(false)}
              />
            </SidebarMenuButton>
          </SidebarMenuItem>
        )}

        {/* ── Empty state ─────────────────────────────────────────── */}
        {visibleFolders.length === 0 &&
          rootDocs.length === 0 &&
          !newFolderRenaming && (
            <SidebarMenuItem>
              <p className="px-2 py-4 text-center text-xs text-muted-foreground">
                {filter ? "No documents match" : "No documents yet"}
              </p>
            </SidebarMenuItem>
          )}
      </SidebarMenu>

      <DragOverlay>
        {activeDragDoc && (
          <div className="flex items-center gap-1.5 rounded border bg-background px-2 py-1 text-xs shadow-md">
            <FileText className="size-3.5" />
            {activeDragDoc.title || "Untitled"}
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}
