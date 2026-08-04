"use client";

import { useEffect, useState, useCallback } from "react";
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
import type { SidebarDocument } from "@/hooks/use-sidebar-data";

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SidebarDocument[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const search = useCallback(async (q: string) => {
    if (!q.trim()) {
      setResults([]);
      return;
    }
    setIsSearching(true);
    try {
      const res = await fetch(
        `/api/documents?q=${encodeURIComponent(q.trim())}`
      );
      if (res.ok) {
        const docs: SidebarDocument[] = await res.json();
        setResults(docs);
      }
    } finally {
      setIsSearching(false);
    }
  }, []);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => search(query), 300);
    return () => clearTimeout(timer);
  }, [query, search]);

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
        {query.trim() === "" ? null : isSearching ? (
          <CommandEmpty>Searching…</CommandEmpty>
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
