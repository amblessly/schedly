"use client";

import type { ExtractedClass } from "../hooks/use-upload";
import type { ValidationIssue } from "@/server/services/validation.service";

export type ReviewState = {
  classes: ExtractedClass[];
  confidence: number | null;
  validationIssues: ValidationIssue[];
};

function storageKey(userId: string): string {
  return `schedly-review-state:${userId}`;
}

function imageKey(userId: string): string {
  return `schedly-review-image:${userId}`;
}

export function getReviewState(userId: string): ReviewState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(storageKey(userId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ReviewState;
    return Array.isArray(parsed.classes) ? parsed : null;
  } catch {
    return null;
  }
}

export function getReviewImage(userId: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.sessionStorage.getItem(imageKey(userId));
  } catch {
    return null;
  }
}

export function saveReviewState(userId: string, state: ReviewState): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(storageKey(userId), JSON.stringify(state));
  } catch {
    // Storage full or unavailable — the review just won't resume.
  }
}

export function saveReviewImage(userId: string, url: string): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(imageKey(userId), url);
  } catch {
    // The image can be larger than the storage quota; the classes still resume.
  }
}

export function clearReviewState(userId: string): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(storageKey(userId));
    window.sessionStorage.removeItem(imageKey(userId));
  } catch {
    // Ignore
  }
}
