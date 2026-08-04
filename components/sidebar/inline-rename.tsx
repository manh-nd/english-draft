"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";

interface InlineRenameProps {
  value: string;
  onCommit: (name: string) => void;
  onCancel: () => void;
}

export function InlineRename({ value, onCommit, onCancel }: InlineRenameProps) {
  const [draft, setDraft] = useState(value);

  const commit = () => {
    const trimmed = draft.trim();
    if (trimmed && trimmed !== value) onCommit(trimmed);
    else onCancel();
  };

  return (
    <Input
      autoFocus
      value={draft}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={commit}
      onKeyDown={(event) => {
        if (event.key === "Enter") commit();
        if (event.key === "Escape") onCancel();
      }}
      className="h-6"
      onClick={(event) => event.stopPropagation()}
    />
  );
}
