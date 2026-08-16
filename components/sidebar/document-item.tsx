"use client";

import { useState } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  FileText,
  FolderInput,
  GripVertical,
  MoreHorizontal,
  Pencil,
  Trash2,
} from "lucide-react";
import type { SidebarDocument, SidebarFolder } from "@/hooks/use-sidebar-data";
import { DeleteConfirmationDialog } from "@/components/sidebar/delete-confirmation-dialog";
import { InlineRename } from "@/components/sidebar/inline-rename";

interface DocumentItemProps {
  doc: SidebarDocument;
  isActive: boolean;
  folders: SidebarFolder[];
  isSubItem?: boolean;
  onRename: (title: string) => Promise<void>;
  onDelete: () => Promise<void>;
  onMove: (folderId: string | null) => Promise<void>;
  onClick: () => void;
}

export function DocumentItem({
  doc,
  isActive,
  folders,
  isSubItem = false,
  onRename,
  onDelete,
  onMove,
  onClick,
}: DocumentItemProps) {
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
        <MenuButton
          isActive={isActive}
          onClick={isRenaming ? undefined : onClick}
          onDoubleClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            setIsRenaming(true);
          }}
          className="group/doc"
        >
          <span
            {...attributes}
            {...listeners}
            className="mr-1 cursor-grab opacity-0 transition-opacity group-hover/doc:opacity-50"
            onClick={(event) => event.stopPropagation()}
            onDoubleClick={(event) => event.stopPropagation()}
          >
            <GripVertical />
          </span>
          <FileText />

          {isRenaming ? (
            <InlineRename
              value={doc.title}
              onCommit={async (title) => {
                setIsRenaming(false);
                await onRename(title);
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
            <DropdownMenuGroup>
              <DropdownMenuItem onSelect={() => setIsRenaming(true)}>
                <Pencil />
                Rename
              </DropdownMenuItem>
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  <FolderInput />
                  Move to…
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent>
                  <DropdownMenuGroup>
                    <DropdownMenuItem
                      onSelect={() => onMove(null)}
                      disabled={doc.folderId === null}
                    >
                      Root (no folder)
                    </DropdownMenuItem>
                  </DropdownMenuGroup>
                  <DropdownMenuSeparator />
                  <DropdownMenuGroup>
                    {folders.map((folder) => (
                      <DropdownMenuItem
                        key={folder.id}
                        onSelect={() => onMove(folder.id)}
                        disabled={doc.folderId === folder.id}
                      >
                        {folder.name}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuGroup>
                </DropdownMenuSubContent>
              </DropdownMenuSub>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem
                variant="destructive"
                onSelect={() => setDeleteOpen(true)}
              >
                <Trash2 />
                Delete
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </MenuItem>

      <DeleteConfirmationDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete document?"
        description={
          <>
            &ldquo;{doc.title || "Untitled"}&rdquo; will be permanently deleted.
            This cannot be undone.
          </>
        }
        onConfirm={onDelete}
      />
    </>
  );
}
