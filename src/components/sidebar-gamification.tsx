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
    <div className="space-y-3">
      {/* Level + XP progress */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <TreePine className="h-3.5 w-3.5 text-green-500" />
            <span className="text-xs font-semibold text-sidebar-foreground">
              Level {profile.level}
            </span>
          </div>
          <span className="text-[10px] font-medium text-sidebar-foreground/50 tabular-nums">
            {profile.xp} XP
          </span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-sidebar-accent">
          <div
            className="h-full rounded-full bg-green-500 transition-all duration-500 ease-out"
            style={{ width: `${Math.round(progress * 100)}%` }}
          />
        </div>
      </div>

      {/* Stats row */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1">
          <Flame className="h-3 w-3 text-orange-500" />
          <span className="text-xs font-medium text-sidebar-foreground tabular-nums">
            {profile.currentStreak}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <Clock className="h-3 w-3 text-blue-500" />
          <span className="text-xs font-medium text-sidebar-foreground tabular-nums">
            {focusTime}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <Zap className="h-3 w-3 text-yellow-500" />
          <span className="text-xs font-medium text-sidebar-foreground tabular-nums">
            {profile.xp}
          </span>
        </div>
      </div>
    </div>
  );
}
