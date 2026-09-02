"use client";

import { useState, useEffect } from "react";
import { Zap, Flame, Clock, TreePine } from "lucide-react";
import { getGamificationProfile } from "@/app/(dashboard)/pomodoro/gamification-actions";

const XP_PER_LEVEL = [0, 0, 50, 150, 300, 500, 750, 1050, 1400, 1800, 2250, 2750, 3300, 3900, 4550, 5250, 6000, 6800, 7650, 8550, 9500];

function getLevelProgress(xp: number, level: number) {
  const current = XP_PER_LEVEL[level - 1] ?? 0;
  const next = XP_PER_LEVEL[level] ?? XP_PER_LEVEL[XP_PER_LEVEL.length - 1] ?? 0;
  if (next === current) return 1;
  return Math.min(1, (xp - current) / (next - current));
}

type Profile = {
  xp: number;
  level: number;
  currentStreak: number;
  totalFocusMinutes: number;
} | null;

export function SidebarGamification() {
  const [profile, setProfile] = useState<Profile>(null);

  useEffect(() => {
    getGamificationProfile().then((p) => {
      if (p) {
        setProfile({
          xp: p.xp,
          level: p.level,
          currentStreak: p.currentStreak,
          totalFocusMinutes: p.totalFocusMinutes,
        });
      }
    });
  }, []);

  if (!profile) return null;

  const progress = getLevelProgress(profile.xp, profile.level);
  const hours = Math.floor(profile.totalFocusMinutes / 60);
  const mins = profile.totalFocusMinutes % 60;
  const focusTime = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;

  return (
    <div className="rounded-xl border-2 border-foreground/80 bg-gradient-to-br from-primary/12 to-primary/4 p-3 shadow-[3px_3px_0_0_#401f32]">
      <div className="flex items-center gap-2 mb-2">
        <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-primary/20">
          <TreePine className="h-4 w-4 text-primary" />
        </div>
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-sidebar-foreground">
              Level {profile.level}
            </span>
            <span className="text-[10px] font-semibold text-primary">
              {Math.round(progress * 100)}% to next
            </span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-sidebar-border mt-1">
            <div
              className="h-full rounded-full bg-primary transition-all duration-500 ease-out"
              style={{ width: `${Math.round(progress * 100)}%` }}
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div className="flex flex-col items-center rounded-lg bg-sidebar-accent/70 py-1.5 px-1">
          <Flame className="h-3.5 w-3.5 text-orange-500 mb-0.5" />
          <span className="text-xs font-bold text-sidebar-foreground tabular-nums">
            {profile.currentStreak}
          </span>
          <span className="text-[9px] text-sidebar-foreground/50">streak</span>
        </div>
        <div className="flex flex-col items-center rounded-lg bg-sidebar-accent/70 py-1.5 px-1">
          <Clock className="h-3.5 w-3.5 text-blue-500 mb-0.5" />
          <span className="text-xs font-bold text-sidebar-foreground tabular-nums">
            {focusTime}
          </span>
          <span className="text-[9px] text-sidebar-foreground/50">focus</span>
        </div>
        <div className="flex flex-col items-center rounded-lg bg-sidebar-accent/70 py-1.5 px-1">
          <Zap className="h-3.5 w-3.5 text-yellow-500 mb-0.5" />
          <span className="text-xs font-bold text-sidebar-foreground tabular-nums">
            {profile.xp}
          </span>
          <span className="text-[9px] text-sidebar-foreground/50">xp</span>
        </div>
      </div>
    </div>
  );
}
