"use client";

import { useEffect, useState, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";

export interface LoadingTip {
  category: string;
  text: string;
}

const DEFAULT_TIPS: LoadingTip[] = [
  { category: "STUDY TIP", text: "Reviewing information at spaced intervals can help improve long-term retention." },
  { category: "SCHEDLY TIP", text: "Keep your schedule updated so your daily classes stay organized." },
  { category: "PRODUCTIVITY", text: "Focus on your most important task before moving on to less urgent tasks." },
  { category: "STUDY FACT", text: "The human brain can hold about 7 items in short-term memory at once." },
  { category: "MOTIVATION", text: "Consistent small effort beats sporadic bursts of intense work." },
  { category: "STUDY TIP", text: "Active recall — testing yourself — is more effective than passive rereading." },
  { category: "SCHEDLY TIP", text: "Use the syllabus review feature to preview your subjects before the semester starts." },
  { category: "PRODUCTIVITY", text: "Time-blocking your calendar reduces decision fatigue and increases focus." },
  { category: "STUDY FACT", text: "Reading aloud to yourself can improve memory encoding compared to silent reading." },
  { category: "MOTIVATION", text: "Progress, not perfection, is what builds momentum over time." },
  { category: "STUDY TIP", text: "Break large tasks into smaller, manageable steps to stay on track." },
  { category: "SCHEDLY TIP", text: "Set reminders for assignments so nothing slips through the cracks." },
];

const CATEGORY_LABELS: Record<string, string> = {
  "STUDY TIP": "Study Tip",
  "SCHEDLY TIP": "Schedly Tip",
  "PRODUCTIVITY": "Productivity",
  "STUDY FACT": "Study Fact",
  "MOTIVATION": "Motivation",
};

interface RotatingLoadingTipsProps {
  tips?: LoadingTip[];
  intervalMs?: number;
  isLoading?: boolean;
  className?: string;
}

export function RotatingLoadingTips({
  tips = DEFAULT_TIPS,
  intervalMs = 5000,
  isLoading = true,
  className = "",
}: RotatingLoadingTipsProps) {
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(true);

  const advance = useCallback(() => {
    setVisible(false);
    setTimeout(() => {
      setIndex((i) => (i + 1) % tips.length);
      setVisible(true);
    }, 300);
  }, [tips.length]);

  useEffect(() => {
    if (!isLoading || tips.length <= 1) return;
    const id = setInterval(advance, intervalMs);
    return () => clearInterval(id);
  }, [isLoading, tips.length, intervalMs, advance]);

  useEffect(() => {
    setIndex(0);
    setVisible(true);
  }, [isLoading]);

  if (!isLoading || tips.length === 0) return null;

  const tip: LoadingTip = tips[index] ?? DEFAULT_TIPS[0]!;
  const categoryLabel = CATEGORY_LABELS[tip.category] ?? tip.category;

  return (
    <div className={`flex flex-col items-center gap-2 ${className}`}>
      <div className="h-px w-48 bg-gradient-to-r from-transparent via-border to-transparent" />
      <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
        {categoryLabel}
      </p>
      <AnimatePresence mode="wait">
        {visible && (
          <motion.p
            key={index}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="min-h-[3rem] text-center text-xs leading-relaxed text-foreground/70"
          >
            {tip.text}
          </motion.p>
        )}
      </AnimatePresence>
      <div className="h-px w-48 bg-gradient-to-r from-transparent via-border to-transparent" />
    </div>
  );
}
