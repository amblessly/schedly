"use client";

import { Check } from "lucide-react";

import { cn } from "@/lib/utils";
import { useThemeConfig, THEME_PRESETS } from "@/features/theme";

export function ThemePicker() {
  const { activeId, setTheme } = useThemeConfig();

  return (
    <div className="px-3 pb-3">
      <div className="flex items-center gap-1.5 rounded-xl bg-white/5 p-1.5">
        {THEME_PRESETS.map((preset) => (
          <button
            key={preset.id}
            onClick={() => setTheme(preset.id)}
            className={cn(
              "relative h-7 w-7 rounded-full transition-all duration-200",
              activeId === preset.id
                ? "ring-2 ring-white/80 scale-110 shadow-[0_0_12px_rgba(255,255,255,0.3)]"
                : "opacity-50 hover:opacity-80 hover:scale-105"
            )}
            style={{ backgroundColor: preset.swatch }}
            aria-label={`Theme: ${preset.name}`}
          >
            {activeId === preset.id && (
              <Check className="absolute inset-0 m-auto h-3.5 w-3.5 text-white drop-shadow-md" strokeWidth={3} />
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
