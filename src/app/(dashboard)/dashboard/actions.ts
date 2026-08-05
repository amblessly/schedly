"use server";

import { auth } from "@/server/lib/auth";
import { headers } from "next/headers";
import {
  generateScheduleSuggestions,
  type ScheduleSuggestionInput,
} from "@/server/lib/ai";

export type AiInsightsResult =
  | { success: true; suggestions: string[] }
  | { success: false; error: string };

export async function getAiInsights(
  classes: ScheduleSuggestionInput[],
): Promise<AiInsightsResult> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return { success: false, error: "Unauthorized" };

  if (!Array.isArray(classes) || classes.length === 0) {
    return { success: false, error: "Add a schedule first" };
  }

  try {
    const suggestions = await generateScheduleSuggestions(classes);
    return { success: true, suggestions };
  } catch (err) {
    console.error("[AI_INSIGHTS]", err);
    return { success: false, error: "Could not generate insights. Please try again." };
  }
}
