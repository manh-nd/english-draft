"use client";

import { useState, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarGroupAction,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { SignOutButton } from "@/components/sign-out-button";
import { DocumentTree } from "@/components/sidebar/document-tree";
import { SearchBar } from "@/components/sidebar/search-bar";
import { ThemeToggle } from "@/components/sidebar/theme-toggle";
import { useSidebarData } from "@/hooks/use-sidebar-data";
import {
  selectSidebarDocuments,
  useDocumentSearch,
} from "@/hooks/use-document-search";
import { FileText, Plus, FolderPlus } from "lucide-react";
import Link from "next/link";

interface AppSidebarClientProps {
  user: {
    id: string;
    name: string;
    email: string;
    image?: string | null;
  };
}

export function AppSidebarClient({ user }: AppSidebarClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [filter, setFilter] = useState("");

  const {
    data,
    isLoading,
    createDocument,
    renameDocument,
    deleteDocument,
    moveDocument,
    createFolder,
    renameFolder,
    deleteFolder,
  } = useSidebarData();
  const search = useDocumentSearch(filter);
  const normalizedQuery = filter.trim();
  const visibleDocuments = selectSidebarDocuments(
    data.documents,
    filter,
    search
  );
  const showingSearchResults =
    Boolean(normalizedQuery) &&
    search.status === "success" &&
    search.query === normalizedQuery;

  // Derive active document id from pathname
  const activeDocumentId = pathname.startsWith("/documents/")
    ? pathname.split("/documents/")[1]
    : undefined;

  const initials = user.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : user.email[0].toUpperCase();

  const handleCreateDocument = useCallback(
    async (folderId?: string | null) => {
      const doc = await createDocument(folderId);
      if (doc) router.push(`/documents/${doc.id}`);
    },
    [createDocument, router]
  );

  return (
    <>
      {/* ── Header ─────────────────────────────────────────── */}
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href="/">
                <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <FileText />
                </div>
                <div className="flex flex-col gap-0.5 leading-none">
                  <span className="font-semibold">English Draft</span>
                  <span className="text-xs text-muted-foreground">
                    AI Writing Assistant
                  </span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>

        {/* Search bar */}
        <SearchBar value={filter} onChange={setFilter} className="px-1 pb-1" />
      </SidebarHeader>

      {/* ── Content ────────────────────────────────────────── */}
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Documents</SidebarGroupLabel>

          {/* + New Document */}
          <SidebarGroupAction
            title="New document"
            onClick={() => handleCreateDocument(null)}
          >
            <Plus />
            <span className="sr-only">New Document</span>
          </SidebarGroupAction>

          <SidebarGroupContent>
            {normalizedQuery && search.status === "loading" && (
              <div
                className="flex flex-col gap-1 px-2 py-1"
                role="status"
                aria-label="Searching documents"
              >
                <Skeleton className="h-5 w-full" />
                <span className="sr-only">Searching documents…</span>
              </div>
            )}
            {normalizedQuery && search.status === "error" && (
              <Alert variant="destructive">
                <AlertDescription>
                  Search failed. Showing your document tree.
                </AlertDescription>
              </Alert>
            )}
            {isLoading ? (
              <div className="flex flex-col gap-1 px-2 py-1">
                <Skeleton className="h-5 w-full" />
                <Skeleton className="h-5 w-4/5" />
                <Skeleton className="h-5 w-3/5" />
              </div>
            ) : (
              <DocumentTree
                folders={data.folders}
                documents={visibleDocuments}
                activeDocumentId={activeDocumentId}
                searchQuery={showingSearchResults ? normalizedQuery : undefined}
                onCreateDocument={handleCreateDocument}
                onRenameDocument={renameDocument}
                onDeleteDocument={deleteDocument}
                onMoveDocument={moveDocument}
                onCreateFolder={createFolder}
                onRenameFolder={renameFolder}
                onDeleteFolder={deleteFolder}
              />
            )}
          </SidebarGroupContent>
        </SidebarGroup>

        {/* New Folder button — dispatches a custom event that DocumentTree listens for */}
        <SidebarGroup>
          <SidebarGroupContent>
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start"
              onClick={() => {
                document.dispatchEvent(new CustomEvent("sidebar:new-folder"));
              }}
            >
              <FolderPlus data-icon="inline-start" />
              New Folder
            </Button>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* ── Footer ─────────────────────────────────────────── */}
      <SidebarFooter className="gap-1.5 p-2">
        <SidebarSeparator className="my-1" />
        <div className="flex items-center gap-3 px-2 py-1.5">
          <Avatar className="size-8">
            <AvatarImage src={user.image ?? undefined} alt={user.name} />
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
          <div className="flex min-w-0 flex-1 flex-col">
            <span className="truncate text-xs font-semibold">{user.name}</span>
            <span className="truncate text-[11px] text-muted-foreground">
              {user.email}
            </span>
          </div>
        </div>
        <ThemeToggle />
        <SignOutButton />
      </SidebarFooter>
    </>
  );
}
