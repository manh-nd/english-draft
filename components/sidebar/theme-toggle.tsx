"use client";

import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { Sun, Moon, Monitor } from "lucide-react";

const themes = ["light", "dark", "system"] as const;
type Theme = (typeof themes)[number];

const icons: Record<Theme, React.ElementType> = {
  light: Sun,
  dark: Moon,
  system: Monitor,
};

const labels: Record<Theme, string> = {
  light: "Light",
  dark: "Dark",
  system: "System",
};

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  const current = (theme as Theme | undefined) ?? "system";
  const next = themes[(themes.indexOf(current) + 1) % themes.length];
  const Icon = icons[current];

  const label = `Current: ${labels[current]}. Click for ${labels[next]}`;

  return (
    <Button
      variant="ghost"
      size="sm"
      className="w-full justify-start gap-2"
      onClick={() => setTheme(next)}
      aria-label={label}
      title={label}
    >
      <Icon data-icon="inline-start" />
      <span>{labels[current]}</span>
    </Button>
  );
}
