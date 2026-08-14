"use client";

import { useState } from "react";
import { Check, ChevronLeft, ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";
import { useThemeConfig, THEME_PRESETS } from "@/features/theme";

// Compact theme switcher — a horizontal carousel of color swatches. Shared by
// the mobile sidebar drawer and the persistent desktop navigation panel.
export function ThemePicker() {
  const { activeId, setTheme } = useThemeConfig();
  const [start, setStart] = useState(0);
  const VISIBLE = 3;
  const maxStart = Math.max(0, THEME_PRESETS.length - VISIBLE);

  const visible = THEME_PRESETS.slice(start, start + VISIBLE);

  return (
    <div className="px-4 pb-3">
      <p className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/50">
        Theme
      </p>
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => setStart((s) => Math.max(0, s - 1))}
          disabled={start === 0}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-25 disabled:hover:bg-transparent"
          aria-label="Previous themes"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        <div className="flex flex-1 items-center justify-center gap-2">
          {visible.map((preset) => (
            <button
              key={preset.id}
              onClick={() => setTheme(preset.id)}
              className={cn(
                "relative h-7 w-7 rounded-full transition-all duration-200",
                activeId === preset.id
                  ? "ring-2 ring-primary ring-offset-2 ring-offset-background scale-110"
                  : "ring-1 ring-border/60 hover:ring-muted-foreground/30 hover:scale-105"
              )}
              style={{ backgroundColor: preset.swatch }}
              title={preset.name}
              aria-label={`Theme: ${preset.name}`}
            >
              {activeId === preset.id && (
                <Check className="absolute inset-0 m-auto h-3.5 w-3.5 text-white drop-shadow-sm" />
              )}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={() => setStart((s) => Math.min(maxStart, s + 1))}
          disabled={start >= maxStart}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-25 disabled:hover:bg-transparent"
          aria-label="Next themes"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
