"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  getFlashcardDecks,
  createDeck,
  deleteDeck,
} from "./actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { FloatingLabelInput } from "@/components/ui/floating-label-input";
import { Spinner } from "@/components/ui/spinner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  PlusIcon,
  TrashIcon,
  BookOpenIcon,
  LayersIcon,
  BrainIcon,
} from "lucide-react";

type Deck = {
  id: string;
  title: string;
  description: string | null;
  subject: string | null;
  cardCount: number;
  createdAt: string;
  updatedAt: string;
};

export default function FlashcardsPage() {
  const [decks, setDecks] = useState<Deck[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newSubject, setNewSubject] = useState("");
  const [creating, setCreating] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await getFlashcardDecks();
      setDecks(data as Deck[]);
    } catch {
      toast.error("Failed to load decks");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleCreate() {
    if (!newTitle.trim()) return;
    setCreating(true);
    const result = await createDeck(newTitle, newDesc, newSubject);
    setCreating(false);
    if (result.success) {
      toast.success("Deck created!");
      setShowCreate(false);
      setNewTitle("");
      setNewDesc("");
      setNewSubject("");
      load();
    } else {
      toast.error(result.error);
    }
  }

  async function handleDelete() {
    if (!deleteId) return;
    setDeleting(true);
    const result = await deleteDeck(deleteId);
    setDeleting(false);
    if (result.success) {
      toast.success("Deck deleted");
      setDeleteId(null);
      load();
    } else {
      toast.error("Failed to delete deck");
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Spinner size={32} />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6 pt-8 pb-24 md:pt-0 md:pb-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Flashcards</h1>
          <p className="text-sm text-muted-foreground">
            Create decks, add cards, and study smarter
          </p>
        </div>
        <Button onClick={() => setShowCreate(true)} size="sm">
          <PlusIcon className="mr-1.5 h-4 w-4" />
          New Deck
        </Button>
      </div>

      {decks.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <BrainIcon className="mb-4 h-12 w-12 text-muted-foreground/40" />
            <h3 className="text-lg font-medium">No decks yet</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Create your first flashcard deck to start studying
            </p>
            <Button
              onClick={() => setShowCreate(true)}
              className="mt-4"
              size="sm"
            >
              <PlusIcon className="mr-1.5 h-4 w-4" />
              Create Deck
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {decks.map((deck) => (
            <Card
              key={deck.id}
              className="group transition-colors hover:border-primary/30"
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <Link href={`/flashcards/${deck.id}`} className="flex-1 min-w-0">
                    <h3 className="font-semibold truncate">{deck.title}</h3>
                    {deck.description && (
                      <p className="mt-0.5 text-sm text-muted-foreground truncate">
                        {deck.description}
                      </p>
                    )}
                    <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <LayersIcon className="h-3.5 w-3.5" />
                        {deck.cardCount} card{deck.cardCount !== 1 ? "s" : ""}
                      </span>
                      {deck.subject && (
                        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-primary">
                          {deck.subject}
                        </span>
                      )}
                    </div>
                  </Link>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Link href={`/flashcards/${deck.id}/study`}>
                      <Button variant="ghost" size="icon-sm" title="Study">
                        <BookOpenIcon className="h-4 w-4" />
                      </Button>
                    </Link>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      title="Delete"
                      onClick={() => setDeleteId(deck.id)}
                    >
                      <TrashIcon className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Flashcard Deck</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <FloatingLabelInput
              label="Deck title"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
            />
            <FloatingLabelInput
              label="Description (optional)"
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
            />
            <FloatingLabelInput
              label="Subject (optional)"
              value={newSubject}
              onChange={(e) => setNewSubject(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button
              onClick={handleCreate}
              disabled={!newTitle.trim() || creating}
            >
              {creating ? <Spinner size={16} className="mr-2" /> : null}
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete deck?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            This will permanently delete this deck and all its cards.
          </p>
          <DialogFooter>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? <Spinner size={16} className="mr-2" /> : null}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
