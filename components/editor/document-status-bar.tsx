"use client";

import { Clock, Hash } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export interface DocumentStatusBarProps {
  wordCount: number;
  characterCount: number;
  readingTimeMinutes?: number;
  className?: string;
}

export function DocumentStatusBar({
  wordCount,
  characterCount,
  readingTimeMinutes = Math.max(1, Math.ceil(wordCount / 200)),
  className = "",
}: DocumentStatusBarProps) {
  return (
    <TooltipProvider>
      <div
        className={`inline-flex items-center gap-2 rounded-full border bg-background/85 px-3 py-1 text-[11px] text-muted-foreground backdrop-blur-md shadow-xs transition-opacity hover:opacity-100 select-none ${className}`}
        role="status"
        aria-label="Document statistics"
      >
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="flex items-center gap-1 font-medium cursor-default">
              <Hash className="size-3 text-muted-foreground/60" />
              <span>{wordCount.toLocaleString()} words</span>
            </span>
          </TooltipTrigger>
          <TooltipContent side="top">
            {wordCount.toLocaleString()} words •{" "}
            {characterCount.toLocaleString()} characters
          </TooltipContent>
        </Tooltip>

        <span className="text-muted-foreground/30">•</span>

        <span className="hidden sm:inline-flex text-muted-foreground/70 cursor-default">
          {characterCount.toLocaleString()} chars
        </span>

        <span className="hidden sm:inline-flex text-muted-foreground/30">
          •
        </span>

        <Tooltip>
          <TooltipTrigger asChild>
            <span className="flex items-center gap-1 text-muted-foreground/80 cursor-default">
              <Clock className="size-3 text-muted-foreground/60" />
              <span>~{readingTimeMinutes} min</span>
            </span>
          </TooltipTrigger>
          <TooltipContent side="top">
            Estimated reading time at 200 words/min
          </TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
}
