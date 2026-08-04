"use client";

import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group";

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export function SearchBar({ value, onChange, className }: SearchBarProps) {
  return (
    <InputGroup className={cn(className)}>
      <InputGroupInput
        id="sidebar-search"
        type="text"
        placeholder="Filter documents…"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      <InputGroupAddon align="inline-start">
        <Search />
      </InputGroupAddon>
      {value && (
        <InputGroupAddon align="inline-end">
          <InputGroupButton
            size="icon-xs"
            onClick={() => onChange("")}
            aria-label="Clear search"
          >
            <X data-icon="inline-start" />
          </InputGroupButton>
        </InputGroupAddon>
      )}
    </InputGroup>
  );
}
