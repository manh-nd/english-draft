"use client";

import { Input } from "@/components/ui/input";
import { Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export function SearchBar({ value, onChange, className }: SearchBarProps) {
  return (
    <div className={cn("relative flex items-center", className)}>
      <Search className="absolute left-2 size-3.5 text-muted-foreground pointer-events-none" />
      <Input
        id="sidebar-search"
        type="text"
        placeholder="Filter documents…"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-7 pl-7 pr-7 text-xs"
      />
      {value && (
        <Button
          variant="ghost"
          size="sm"
          className="absolute right-1 size-5 p-0"
          onClick={() => onChange("")}
          aria-label="Clear search"
        >
          <X className="size-3" />
        </Button>
      )}
    </div>
  );
}
