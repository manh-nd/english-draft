"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { FileText } from "lucide-react";
import { useDocumentSearch } from "@/hooks/use-document-search";

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const search = useDocumentSearch(query);
  const normalizedQuery = query.trim();
  const results =
    search.status === "success" && search.query === normalizedQuery
      ? search.documents
      : [];
  const isSearching =
    Boolean(normalizedQuery) &&
    (search.status === "loading" || search.query !== normalizedQuery);

  const navigate = (id: string) => {
    router.push(`/documents/${id}`);
    onOpenChange(false);
  };

  return (
    <CommandDialog
      key={open ? "open" : "closed"}
      open={open}
      onOpenChange={onOpenChange}
    >
      <CommandInput
        placeholder="Search documents…"
        value={query}
        onValueChange={setQuery}
      />
      <CommandList>
        {!normalizedQuery ? null : isSearching ? (
          <CommandEmpty>Searching…</CommandEmpty>
        ) : search.status === "error" ? (
          <CommandEmpty>Search failed.</CommandEmpty>
        ) : results.length === 0 ? (
          <CommandEmpty>No documents found.</CommandEmpty>
        ) : (
          <CommandGroup heading="Documents">
            {results.map((doc) => (
              <CommandItem
                key={doc.id}
                value={doc.id}
                onSelect={() => navigate(doc.id)}
              >
                <FileText data-icon="inline-start" />
                {doc.title || "Untitled"}
              </CommandItem>
            ))}
          </CommandGroup>
        )}
      </CommandList>
    </CommandDialog>
  );
}
