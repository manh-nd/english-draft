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
  SidebarSeparator,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
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
import {
  FileText,
  Plus,
  FolderPlus,
  BookMarked,
  BookOpen,
  BrainCircuit,
} from "lucide-react";
import Link from "next/link";

interface AppSidebarClientProps {
  user: {
    id: string;
    name: string;
    email: string;
    image?: string | null;
  };
  dueReviewCount?: number;
}

export function AppSidebarClient({
  user,
  dueReviewCount,
}: AppSidebarClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [filter, setFilter] = useState("");
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);

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

  const handleRenameDocument = useCallback(
    async (id: string, title: string) => {
      const succeeded = await renameDocument(id, title);
      if (succeeded && id === activeDocumentId) router.refresh();
    },
    [activeDocumentId, renameDocument, router]
  );

  const handleDeleteDocument = useCallback(
    async (id: string) => {
      const succeeded = await deleteDocument(id);
      if (succeeded && id === activeDocumentId) router.replace("/");
    },
    [activeDocumentId, deleteDocument, router]
  );

  const handleCreateFolder = useCallback(
    async (name: string) => {
      const folder = await createFolder(name);
      if (folder) setIsCreatingFolder(false);
      return folder;
    },
    [createFolder]
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
        <SearchBar value={filter} onChange={setFilter} />
      </SidebarHeader>

      {/* ── Content ────────────────────────────────────────── */}
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="flex items-center justify-between pr-1">
            <span>Documents</span>
            <div className="flex items-center gap-0.5">
              <Button
                variant="ghost"
                size="icon-xs"
                className="size-5 rounded-md p-0 text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                onClick={() => setIsCreatingFolder(true)}
                title="New folder"
                aria-label="New folder"
              >
                <FolderPlus className="size-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon-xs"
                className="size-5 rounded-md p-0 text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                onClick={() => handleCreateDocument(null)}
                title="New document"
                aria-label="New document"
              >
                <Plus className="size-3.5" />
              </Button>
            </div>
          </SidebarGroupLabel>

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
                onRenameDocument={handleRenameDocument}
                onDeleteDocument={handleDeleteDocument}
                onMoveDocument={moveDocument}
                isCreatingFolder={isCreatingFolder}
                onCreateFolder={handleCreateFolder}
                onCancelCreateFolder={() => setIsCreatingFolder(false)}
                onRenameFolder={renameFolder}
                onDeleteFolder={deleteFolder}
              />
            )}
          </SidebarGroupContent>
        </SidebarGroup>

        {/* ── Learning ────────────────────────────────────── */}
        <SidebarGroup>
          <SidebarGroupLabel>Learning</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={pathname === "/corrections"}
                >
                  <Link href="/corrections">
                    <BookMarked className="size-4" />
                    Correction Bank
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={pathname === "/vocabulary"}
                >
                  <Link href="/vocabulary">
                    <BookOpen className="size-4" />
                    Vocabulary
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={pathname === "/review"}>
                  <Link
                    href="/review"
                    className="flex w-full items-center justify-between"
                  >
                    <div className="flex items-center gap-2">
                      <BrainCircuit className="size-4" />
                      <span>Review</span>
                    </div>
                    {typeof dueReviewCount === "number" &&
                      dueReviewCount > 0 && (
                        <Badge
                          variant="secondary"
                          className="h-4.5 min-w-4.5 justify-center rounded-full px-1.5 text-[10px] font-bold bg-primary/15 text-primary"
                        >
                          {dueReviewCount > 9 ? "9+" : dueReviewCount}
                        </Badge>
                      )}
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
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
