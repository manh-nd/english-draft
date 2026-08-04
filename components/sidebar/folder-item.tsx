"use client";

import { useState } from "react";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import {
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Empty, EmptyDescription, EmptyHeader } from "@/components/ui/empty";
import {
  ChevronRight,
  Folder,
  FolderOpen,
  MoreHorizontal,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { SidebarDocument, SidebarFolder } from "@/hooks/use-sidebar-data";
import { DeleteConfirmationDialog } from "@/components/sidebar/delete-confirmation-dialog";
import { DocumentItem } from "@/components/sidebar/document-item";
import { InlineRename } from "@/components/sidebar/inline-rename";

interface FolderItemProps {
  folder: SidebarFolder;
  documents: SidebarDocument[];
  allFolders: SidebarFolder[];
  activeDocumentId?: string;
  onCreateDocument: () => Promise<void>;
  onRenameDocument: (id: string, title: string) => Promise<void>;
  onDeleteDocument: (id: string) => Promise<void>;
  onMoveDocument: (id: string, folderId: string | null) => Promise<void>;
  onRenameFolder: (name: string) => Promise<void>;
  onDeleteFolder: () => Promise<void>;
  onNavigate: (id: string) => void;
}

export function FolderItem({
  folder,
  documents,
  allFolders,
  activeDocumentId,
  onCreateDocument,
  onRenameDocument,
  onDeleteDocument,
  onMoveDocument,
  onRenameFolder,
  onDeleteFolder,
  onNavigate,
}: FolderItemProps) {
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
            <SidebarMenuButton className="group/folder" isActive={isOver}>
              {open ? <FolderOpen /> : <Folder />}
              {isRenaming ? (
                <InlineRename
                  value={folder.name}
                  onCommit={async (name) => {
                    setIsRenaming(false);
                    await onRenameFolder(name);
                  }}
                  onCancel={() => setIsRenaming(false)}
                />
              ) : (
                <span className="truncate">{folder.name}</span>
              )}
              <ChevronRight
                className={cn(
                  "ml-auto transition-transform",
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
              <DropdownMenuGroup>
                <DropdownMenuItem onSelect={onCreateDocument}>
                  <Plus />
                  New Document
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => setIsRenaming(true)}>
                  <Pencil />
                  Rename
                </DropdownMenuItem>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuItem
                  variant="destructive"
                  onSelect={() => setDeleteOpen(true)}
                >
                  <Trash2 />
                  Delete folder
                </DropdownMenuItem>
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>

          <CollapsibleContent>
            <SidebarMenuSub>
              <SortableContext
                items={documents.map((document) => document.id)}
                strategy={verticalListSortingStrategy}
              >
                {documents.length === 0 ? (
                  <SidebarMenuSubItem>
                    <Empty className="p-2">
                      <EmptyHeader>
                        <EmptyDescription>Empty folder</EmptyDescription>
                      </EmptyHeader>
                    </Empty>
                  </SidebarMenuSubItem>
                ) : (
                  documents.map((document) => (
                    <DocumentItem
                      key={document.id}
                      doc={document}
                      isActive={document.id === activeDocumentId}
                      folders={allFolders}
                      isSubItem
                      onRename={(title) => onRenameDocument(document.id, title)}
                      onDelete={() => onDeleteDocument(document.id)}
                      onMove={(folderId) =>
                        onMoveDocument(document.id, folderId)
                      }
                      onClick={() => onNavigate(document.id)}
                    />
                  ))
                )}
              </SortableContext>
            </SidebarMenuSub>
          </CollapsibleContent>
        </Collapsible>
      </SidebarMenuItem>

      <DeleteConfirmationDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete folder?"
        description={
          <>
            &ldquo;{folder.name}&rdquo; will be deleted. All documents inside it
            will be moved to the root.
          </>
        }
        onConfirm={onDeleteFolder}
      />
    </>
  );
}
