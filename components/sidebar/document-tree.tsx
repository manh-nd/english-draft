"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { FileText, Folder } from "lucide-react";
import { Empty, EmptyDescription, EmptyHeader } from "@/components/ui/empty";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import type { SidebarDocument, SidebarFolder } from "@/hooks/use-sidebar-data";
import { DocumentItem } from "@/components/sidebar/document-item";
import { FolderItem } from "@/components/sidebar/folder-item";
import { InlineRename } from "@/components/sidebar/inline-rename";

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

  useEffect(() => {
    const handler = () => setNewFolderRenaming(true);
    document.addEventListener("sidebar:new-folder", handler);
    return () => document.removeEventListener("sidebar:new-folder", handler);
  }, []);

  const lowerFilter = filter.toLowerCase();
  const visibleDocuments = filter
    ? documents.filter((document) =>
        (document.title || "Untitled").toLowerCase().includes(lowerFilter)
      )
    : documents;
  const documentsInFolder = (folderId: string) =>
    visibleDocuments.filter((document) => document.folderId === folderId);
  const rootDocuments = visibleDocuments.filter(
    (document) => document.folderId === null
  );
  const visibleFolders = filter
    ? folders.filter((folder) => documentsInFolder(folder.id).length > 0)
    : folders;

  const handleDragStart = (event: DragStartEvent) => {
    const id = String(event.active.id);
    if (!id.startsWith("folder-")) setActiveDragId(id);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveDragId(null);
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const documentId = String(active.id);
    const targetId = String(over.id);
    if (targetId.startsWith("folder-")) {
      await onMoveDocument(documentId, targetId.replace("folder-", ""));
    } else if (targetId === "root-drop-zone") {
      await onMoveDocument(documentId, null);
    }
  };

  const activeDragDocument = activeDragId
    ? documents.find((document) => document.id === activeDragId)
    : null;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <SidebarMenu>
        <SortableContext
          items={[
            ...visibleFolders.map((folder) => `folder-${folder.id}`),
            ...rootDocuments.map((document) => document.id),
            "root-drop-zone",
          ]}
          strategy={verticalListSortingStrategy}
        >
          {visibleFolders.map((folder) => (
            <FolderItem
              key={folder.id}
              folder={folder}
              documents={documentsInFolder(folder.id)}
              allFolders={folders}
              activeDocumentId={activeDocumentId}
              onCreateDocument={() => onCreateDocument(folder.id)}
              onRenameDocument={onRenameDocument}
              onDeleteDocument={onDeleteDocument}
              onMoveDocument={onMoveDocument}
              onRenameFolder={(name) => onRenameFolder(folder.id, name)}
              onDeleteFolder={() => onDeleteFolder(folder.id)}
              onNavigate={navigate}
            />
          ))}

          {rootDocuments.map((document) => (
            <DocumentItem
              key={document.id}
              doc={document}
              isActive={document.id === activeDocumentId}
              folders={folders}
              onRename={(title) => onRenameDocument(document.id, title)}
              onDelete={() => onDeleteDocument(document.id)}
              onMove={(folderId) => onMoveDocument(document.id, folderId)}
              onClick={() => navigate(document.id)}
            />
          ))}

          {activeDragId && (
            <SidebarMenuItem id="root-drop-zone">
              <div className="h-1 w-full rounded bg-border" />
            </SidebarMenuItem>
          )}
        </SortableContext>

        {newFolderRenaming && (
          <SidebarMenuItem>
            <SidebarMenuButton>
              <Folder />
              <InlineRename
                value=""
                onCommit={async (name) => {
                  await onCreateFolder(name);
                  setNewFolderRenaming(false);
                }}
                onCancel={() => setNewFolderRenaming(false)}
              />
            </SidebarMenuButton>
          </SidebarMenuItem>
        )}

        {visibleFolders.length === 0 &&
          rootDocuments.length === 0 &&
          !newFolderRenaming && (
            <SidebarMenuItem>
              <Empty className="p-2">
                <EmptyHeader>
                  <EmptyDescription>
                    {filter ? "No documents match" : "No documents yet"}
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            </SidebarMenuItem>
          )}
      </SidebarMenu>

      <DragOverlay>
        {activeDragDocument && (
          <div className="flex items-center gap-1.5 rounded border bg-background px-2 py-1 text-xs shadow-md">
            <FileText />
            {activeDragDocument.title || "Untitled"}
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}
