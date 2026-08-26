"use server";

import { headers } from "next/headers";
import { auth } from "@/server/lib/auth";
import { db } from "@/server/db/client";

export async function getFlashcardDecks() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return [];

  return db.flashcardDeck.findMany({
    where: { userId: session.user.id },
    include: { _count: { select: { cards: true } } },
    orderBy: { updatedAt: "desc" },
  });
}

export async function getFlashcardDeck(deckId: string) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return null;

  return db.flashcardDeck.findFirst({
    where: { id: deckId, userId: session.user.id },
    include: { cards: { orderBy: { createdAt: "asc" } } },
  });
}

export async function createDeck(
  title: string,
  description: string,
  subject: string
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return { success: false, error: "Unauthorized" };

  const clean = title.trim();
  if (!clean) return { success: false, error: "Title is required" };
  if (clean.length > 100) return { success: false, error: "Title too long" };

  try {
    const deck = await db.flashcardDeck.create({
      data: {
        userId: session.user.id,
        title: clean,
        description: description.trim() || null,
        subject: subject.trim() || null,
      },
    });
    return { success: true, deckId: deck.id };
  } catch (err) {
    console.error("[CREATE_DECK]", err);
    return { success: false, error: "Failed to create deck" };
  }
}

export async function updateDeck(
  deckId: string,
  title: string,
  description: string,
  subject: string
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return { success: false, error: "Unauthorized" };

  try {
    const existing = await db.flashcardDeck.findFirst({
      where: { id: deckId, userId: session.user.id },
    });
    if (!existing) return { success: false, error: "Deck not found" };

    await db.flashcardDeck.update({
      where: { id: deckId },
      data: {
        title: title.trim() || existing.title,
        description: description.trim() || null,
        subject: subject.trim() || null,
      },
    });
    return { success: true };
  } catch (err) {
    console.error("[UPDATE_DECK]", err);
    return { success: false, error: "Failed to update deck" };
  }
}

export async function deleteDeck(deckId: string) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return { success: false };

  try {
    await db.flashcardDeck.deleteMany({
      where: { id: deckId, userId: session.user.id },
    });
    return { success: true };
  } catch (err) {
    console.error("[DELETE_DECK]", err);
    return { success: false };
  }
}

export async function addCard(deckId: string, front: string, back: string) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return { success: false, error: "Unauthorized" };

  const f = front.trim();
  const b = back.trim();
  if (!f) return { success: false, error: "Front side is required" };
  if (!b) return { success: false, error: "Back side is required" };

  try {
    const existing = await db.flashcardDeck.findFirst({
      where: { id: deckId, userId: session.user.id },
    });
    if (!existing) return { success: false, error: "Deck not found" };

    await db.flashcard.create({
      data: { deckId, front: f, back: b },
    });
    await db.flashcardDeck.update({
      where: { id: deckId },
      data: { cardCount: { increment: 1 } },
    });
    return { success: true };
  } catch (err) {
    console.error("[ADD_CARD]", err);
    return { success: false, error: "Failed to add card" };
  }
}

export async function updateCard(
  cardId: string,
  front: string,
  back: string
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return { success: false, error: "Unauthorized" };

  try {
    const card = await db.flashcard.findFirst({
      where: { id: cardId },
      include: { deck: { select: { userId: true } } },
    });
    if (!card || card.deck.userId !== session.user.id) {
      return { success: false, error: "Card not found" };
    }

    await db.flashcard.update({
      where: { id: cardId },
      data: { front: front.trim(), back: back.trim() },
    });
    return { success: true };
  } catch (err) {
    console.error("[UPDATE_CARD]", err);
    return { success: false, error: "Failed to update card" };
  }
}

export async function deleteCard(cardId: string) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return { success: false };

  try {
    const card = await db.flashcard.findFirst({
      where: { id: cardId },
      include: { deck: { select: { id: true, userId: true } } },
    });
    if (!card || card.deck.userId !== session.user.id) {
      return { success: false };
    }

    await db.flashcard.delete({ where: { id: cardId } });
    await db.flashcardDeck.update({
      where: { id: card.deck.id },
      data: { cardCount: { decrement: 1 } },
    });
    return { success: true };
  } catch (err) {
    console.error("[DELETE_CARD]", err);
    return { success: false };
  }
}

export async function reviewCard(cardId: string, correct: boolean) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return { success: false };

  try {
    const card = await db.flashcard.findFirst({
      where: { id: cardId },
      include: { deck: { select: { userId: true } } },
    });
    if (!card || card.deck.userId !== session.user.id) {
      return { success: false };
    }

    const newStreak = correct ? card.streak + 1 : 0;
    const intervalMinutes = correct
      ? Math.min(1440 * Math.pow(2, newStreak), 10080)
      : 5;
    const nextReview = new Date(Date.now() + intervalMinutes * 60 * 1000);

    await db.flashcard.update({
      where: { id: cardId },
      data: {
        streak: newStreak,
        difficulty: correct ? card.difficulty : card.difficulty + 1,
        lastReviewed: new Date(),
        nextReview,
      },
    });
    return { success: true };
  } catch (err) {
    console.error("[REVIEW_CARD]", err);
    return { success: false };
  }
}
