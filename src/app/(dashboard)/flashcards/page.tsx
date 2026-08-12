import { getDecks } from "./actions";
import { FlashcardsClient } from "./flashcards-client";

export const metadata = {
  title: "Flashcards",
};

export const dynamic = "force-dynamic";

export default async function FlashcardsPage() {
  const decks = await getDecks();
  return <FlashcardsClient initialDecks={decks} />;
}