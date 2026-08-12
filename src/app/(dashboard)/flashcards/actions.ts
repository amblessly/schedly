"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/server/lib/auth";
import { db } from "@/server/db/client";
import { PipelineLogger } from "@/server/lib/structured-logger";
import { headers } from "next/headers";

async function requireUser() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session?.user?.id) redirect("/login");
  if (!(session.user as { isAdmin?: boolean }).isAdmin) redirect("/dashboard");
  return session.user.id;
}

export async function getDecks() {
  const userId = await requireUser();
  const decks = await db.flashcardDeck.findMany({
    where: { userId },
    include: { _count: { select: { flashcards: true } } },
    orderBy: { updatedAt: "desc" },
  });
  return decks.map((d) => ({
    id: d.id,
    title: d.title,
    subject: d.subject,
    sourceType: d.sourceType,
    createdAt: d.createdAt.toISOString(),
    cardCount: d._count.flashcards,
  }));
}

export async function getDeck(deckId: string) {
  const userId = await requireUser();
  const deck = await db.flashcardDeck.findFirst({
    where: { id: deckId, userId },
    include: { flashcards: { orderBy: { createdAt: "asc" } } },
  });
  if (!deck) return null;
  return {
    id: deck.id,
    title: deck.title,
    subject: deck.subject,
    sourceType: deck.sourceType,
    cards: deck.flashcards.map((c) => ({ id: c.id, front: c.front, back: c.back })),
  };
}

export async function createManualDeck(input: {
  title: string;
  subject?: string;
  cards: { front: string; back: string }[];
}): Promise<{ ok: boolean; error?: string }> {
  const userId = await requireUser();
  const title = input.title.trim().slice(0, 120);
  const subject = (input.subject ?? "").trim().slice(0, 60) || null;
  const cards = input.cards
    .map((c) => ({
      front: c.front.trim().slice(0, 500),
      back: c.back.trim().slice(0, 2000),
    }))
    .filter((c) => c.front && c.back);

  if (!title) return { ok: false, error: "Title is required." };
  if (cards.length < 1) return { ok: false, error: "Add at least one card." };

  await db.flashcardDeck.create({
    data: {
      userId,
      title,
      subject,
      sourceType: "manual",
      flashcards: { create: cards },
    },
  });
  revalidatePath("/flashcards");
  return { ok: true };
}

export async function deleteDeck(deckId: string): Promise<{ ok: boolean; error?: string }> {
  const userId = await requireUser();
  const deck = await db.flashcardDeck.findFirst({ where: { id: deckId, userId } });
  if (!deck) return { ok: false, error: "Deck not found." };

  await db.flashcardDeck.delete({ where: { id: deckId } });
  PipelineLogger.info("flashcards", "Deck deleted", { deckId, userId });
  revalidatePath("/flashcards");
  return { ok: true };
}
