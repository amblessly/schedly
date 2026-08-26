"use client";

import { useState, useEffect } from "react";
import { getGamificationProfile } from "@/app/(dashboard)/pomodoro/gamification-actions";
import { Card, CardContent } from "@/components/ui/card";
import { ZapIcon, FlameIcon, TreePineIcon, TimerIcon } from "lucide-react";

const XP_PER_LEVEL = [0, 0, 50, 150, 300, 500, 750, 1050, 1400, 1800, 2250, 2750, 3300, 3900, 4550, 5250, 6000, 6800, 7650, 8550, 9500];

function getLevelProgress(xp: number, level: number) {
  const current = XP_PER_LEVEL[level - 1] ?? 0;
  const next = XP_PER_LEVEL[level] ?? XP_PER_LEVEL[XP_PER_LEVEL.length - 1];
  return Math.min(1, (xp - current) / (next - current));
}

type Profile = {
  xp: number;
  level: number;
  currentStreak: number;
  totalFocusMinutes: number;
} | null;

export function GamificationCard() {
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

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold">Your Progress</h3>
          <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
            Level {profile.level}
          </span>
        </div>

        <div className="mb-3">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
            <span>{profile.xp} XP</span>
            <span>{Math.round(progress * 100)}%</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all duration-500"
              style={{ width: `${progress * 100}%` }}
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="rounded-lg bg-background/50 p-2">
            <FlameIcon className="h-4 w-4 mx-auto mb-0.5 text-orange-500" />
            <p className="text-lg font-bold">{profile.currentStreak}</p>
            <p className="text-[10px] text-muted-foreground">Day Streak</p>
          </div>
          <div className="rounded-lg bg-background/50 p-2">
            <TimerIcon className="h-4 w-4 mx-auto mb-0.5 text-green-500" />
            <p className="text-lg font-bold">{hours > 0 ? `${hours}h` : ""}{mins}m</p>
            <p className="text-[10px] text-muted-foreground">Focus Time</p>
          </div>
          <div className="rounded-lg bg-background/50 p-2">
            <ZapIcon className="h-4 w-4 mx-auto mb-0.5 text-yellow-500" />
            <p className="text-lg font-bold">{profile.xp}</p>
            <p className="text-[10px] text-muted-foreground">Total XP</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
