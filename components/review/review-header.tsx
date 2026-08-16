"use client";

import { ArrowLeft, Sparkles } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

interface ReviewHeaderProps {
  currentIndex: number;
  totalItems: number;
  onExit?: () => void;
}

export function ReviewHeader({
  currentIndex,
  totalItems,
  onExit,
}: ReviewHeaderProps) {
  const currentStep = Math.min(currentIndex + 1, totalItems);
  const percent =
    totalItems > 0 ? Math.round((currentStep / totalItems) * 100) : 0;

  return (
    <div className="w-full flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {onExit ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={onExit}
              className="text-muted-foreground hover:text-foreground -ml-2 h-8 px-2 text-xs"
            >
              <ArrowLeft className="mr-1.5 size-3.5" />
              Exit Zen Mode
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              asChild
              className="text-muted-foreground hover:text-foreground -ml-2 h-8 px-2 text-xs"
            >
              <Link href="/">
                <ArrowLeft className="mr-1.5 size-3.5" />
                Dashboard
              </Link>
            </Button>
          )}
        </div>

        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Sparkles className="size-3.5 text-primary" />
          <span className="font-medium text-foreground">
            {currentStep} of {totalItems}
          </span>
          <span className="hidden sm:inline">items</span>
        </div>
      </div>

      {/* Animated Smooth Progress Bar */}
      <div
        className="relative h-1.5 w-full overflow-hidden rounded-full bg-muted/60"
        role="progressbar"
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`Review progress: ${currentStep} of ${totalItems} items`}
      >
        <div
          className="h-full rounded-full bg-gradient-to-r from-primary to-primary/80 transition-all duration-500 ease-out"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
