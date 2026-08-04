"use client";

import { useEffect, useState } from "react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { CommandPalette } from "@/components/sidebar/command-palette";

/**
 * Wraps the main content area inside SidebarInset.
 * Owns the Command Palette open state and Cmd+K shortcut so the palette
 * renders at the correct stacking context (outside the <Sidebar> element).
 */
export function AppContentArea({ children }: { children: React.ReactNode }) {
  const [paletteOpen, setPaletteOpen] = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setPaletteOpen((prev) => !prev);
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  return (
    <>
      <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
        <SidebarTrigger />
        <Separator orientation="vertical" className="h-4" />
      </header>

      <main className="flex flex-1 flex-col gap-4 p-4">{children}</main>

      {/* CommandPalette lives here — outside <Sidebar> — for correct z-index */}
      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
    </>
  );
}
