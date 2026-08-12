"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  Layers, Plus, Trash2, Sparkles, FileText, Image as ImageIcon,
  StickyNote, CheckCircle2, XCircle, RotateCcw, ArrowRight, ArrowLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { authFetch } from "@/lib/auth-fetch";
import { createManualDeck, deleteDeck, getDeck, getDecks } from "./actions";

type DeckSummaryWithCount = Awaited<ReturnType<typeof getDecks>>[number];

interface ReviewCard {
  id: string;
  front: string;
  back: string;
}

type CreateMode = "text" | "file" | "manual";

export function FlashcardsClient({ initialDecks }: { initialDecks: DeckSummaryWithCount[] }) {
  const [decks, setDecks] = useState<DeckSummaryWithCount[]>(initialDecks);
  const [createOpen, setCreateOpen] = useState(false);
  const [mode, setMode] = useState<CreateMode>("text");
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("");
  const [pastedText, setPastedText] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [generating, setGenerating] = useState(false);
  const [reviewing, setReviewing] = useState(false);
  const [reviewCards, setReviewCards] = useState<ReviewCard[]>([]);
  const [reviewDeckTitle, setReviewDeckTitle] = useState("");

  const [manualRows, setManualRows] = useState<{ front: string; back: string }[]>([
    { front: "", back: "" },
  ]);

  const resetCreate = () => {
    setCreateOpen(false);
    setMode("text");
    setTitle("");
    setSubject("");
    setPastedText("");
    setSelectedFile(null);
    setManualRows([{ front: "", back: "" }]);
  };

  const handleGenerate = async () => {
    if (!title.trim()) {
      toast.error("Give your deck a title first.");
      return;
    }
    if (mode === "text" && !pastedText.trim()) {
      toast.error("Paste your notes first.");
      return;
    }
    if (mode === "file" && !selectedFile) {
      toast.error("Choose a PDF or image file first.");
      return;
    }
    setGenerating(true);
    try {
      const form = new FormData();
      form.append("title", title.trim());
      if (subject.trim()) form.append("subject", subject.trim());
      if (mode === "text") form.append("text", pastedText);
      if (mode === "file" && selectedFile) form.append("file", selectedFile);

      const res = await authFetch("/api/flashcards/generate", {
        method: "POST",
        headers: { "x-csrf-protection": "1" },
        body: form,
      });

      if (res.status === 429) {
        toast.error("Too fast! Wait a minute between generations.");
        return;
      }
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        toast.error(data?.error || "Generation failed. Try again.");
        return;
      }

      const data = await res.json();
      toast.success(`Made ${data.cards} flashcards!`);
      resetCreate();
      setDecks(await getDecks());
    } catch {
      toast.error("Something went wrong. Try again.");
    } finally {
      setGenerating(false);
    }
  };

  const handleManualCreate = async () => {
    const cards = manualRows.filter((r) => r.front.trim() && r.back.trim());
    const res = await createManualDeck({ title, subject, cards });
    if (!res.ok) {
      toast.error(res.error || "Could not create deck.");
      return;
    }
    toast.success("Deck created!");
    resetCreate();
    setDecks(await getDecks());
  };

  const handleDelete = async (deckId: string, deckTitle: string) => {
    if (!window.confirm(`Delete "${deckTitle}" and all its cards?`)) return;
    const res = await deleteDeck(deckId);
    if (!res.ok) {
      toast.error(res.error || "Could not delete deck.");
      return;
    }
    toast.success("Deck deleted.");
    setDecks(await getDecks());
  };

  const openReview = async (deckId: string) => {
    const deck = await getDeck(deckId);
    if (!deck || deck.cards.length === 0) {
      toast.error("This deck has no cards yet.");
      return;
    }
    setReviewCards(deck.cards);
    setReviewDeckTitle(deck.title);
    setReviewing(true);
  };

  return (
    <div className="mx-auto max-w-4xl pt-8 md:pt-0">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 sm:mb-8">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            <Layers className="h-6 w-6 text-primary" />
            Flashcards
          </h1>
          <p className="mt-1 text-sm text-muted-foreground sm:text-base">
            Turn your notes, PDFs, or photos into review flashcards
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)} className="h-11 px-4 font-medium">
          <Plus className="mr-1.5 h-4 w-4" /> New Deck
        </Button>
      </div>

      {decks.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border/60 bg-card/30 px-6 py-16 text-center">
          <StickyNote className="mb-3 h-8 w-8 text-muted-foreground/40" />
          <h3 className="text-lg font-semibold text-foreground">No decks yet</h3>
          <p className="mt-1 max-w-xs text-sm text-muted-foreground leading-relaxed">
            Create your first deck — paste notes, upload a PDF, or snap a photo of a handout.
          </p>
          <Button className="mt-5 h-11 px-6 font-medium" onClick={() => setCreateOpen(true)}>
            <Sparkles className="mr-2 h-4 w-4" /> Create with AI
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {decks.map((deck) => (
            <div key={deck.id} className="rounded-2xl border border-border/50 bg-card p-4 transition-colors hover:border-primary/30">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="truncate font-semibold text-foreground">{deck.title}</h3>
                  {deck.subject && (
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">{deck.subject}</p>
                  )}
                </div>
                <button
                  onClick={() => handleDelete(deck.id, deck.title)}
                  className="rounded-lg p-1.5 text-muted-foreground/60 transition-colors hover:bg-destructive/10 hover:text-destructive"
                  aria-label="Delete deck"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              <div className="mt-3 flex items-center gap-2">
                <Badge variant="secondary" className="tabular-nums">
                  {deck.cardCount} cards
                </Badge>
                <Badge variant="outline" className="text-muted-foreground">
                  {deck.sourceType === "pdf" ? (
                    <FileText className="mr-1 h-3 w-3" />
                  ) : deck.sourceType === "image" ? (
                    <ImageIcon className="mr-1 h-3 w-3" />
                  ) : deck.sourceType === "text" ? (
                    <Sparkles className="mr-1 h-3 w-3" />
                  ) : (
                    <StickyNote className="mr-1 h-3 w-3" />
                  )}
                  {deck.sourceType === "manual" ? "Manual" : "AI"}
                </Badge>
              </div>
              <Button className="mt-4 w-full" variant="outline" onClick={() => openReview(deck.id)}>
                Review deck
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* ===== Create deck dialog ===== */}
      <Dialog open={createOpen} onOpenChange={(open) => (open ? setCreateOpen(true) : resetCreate())}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>New Flashcard Deck</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-1 rounded-xl bg-muted p-1">
              {(
                [
                  { id: "text", label: "Paste Notes", icon: Sparkles },
                  { id: "file", label: "PDF / Photo", icon: FileText },
                  { id: "manual", label: "Manual", icon: StickyNote },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setMode(tab.id)}
                  className={`flex items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-xs font-medium transition-colors ${
                    mode === tab.id
                      ? "bg-card text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <tab.icon className="h-3.5 w-3.5" />
                  {tab.label}
                </button>
              ))}
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground">Title</label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Photosynthesis Review"
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Subject (optional)</label>
              <Input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="e.g. Biology"
                className="mt-1"
              />
            </div>

            {mode === "text" && (
              <div>
                <label className="text-xs font-medium text-muted-foreground">
                  Your notes (the AI reads these and makes Q&A cards)
                </label>
                <Textarea
                  value={pastedText}
                  onChange={(e) => setPastedText(e.target.value)}
                  placeholder="Paste your study notes, reviewer, or lecture text here..."
                  rows={8}
                  className="mt-1"
                />
              </div>
            )}

            {mode === "file" && (
              <div>
                <label className="text-xs font-medium text-muted-foreground">
                  PDF or image of your notes
                </label>
                <div className="mt-1 flex flex-col items-center justify-center rounded-xl border border-dashed border-border/60 bg-muted/30 px-4 py-8 text-center">
                  {selectedFile ? (
                    <>
                      <p className="max-w-full truncate text-sm font-medium text-foreground">
                        {selectedFile.name}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="mt-3"
                        onClick={() => setSelectedFile(null)}
                      >
                        Remove
                      </Button>
                    </>
                  ) : (
                    <>
                      <FileText className="mb-2 h-8 w-8 text-muted-foreground/40" />
                      <p className="text-sm text-muted-foreground">PDF, or photo of a handout</p>
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-3"
                        onClick={() => document.getElementById("flashcard-file")?.click()}
                      >
                        Choose file
                      </Button>
                    </>
                  )}
                  <input
                    id="flashcard-file"
                    type="file"
                    accept="application/pdf,image/*"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) setSelectedFile(f);
                    }}
                  />
                </div>
              </div>
            )}

            {mode === "manual" && (
              <div className="space-y-2">
                {manualRows.map((row, i) => (
                  <div key={i} className="grid grid-cols-2 gap-2">
                    <Input
                      value={row.front}
                      onChange={(e) =>
                        setManualRows((rows) =>
                          rows.map((r, j) => (j === i ? { ...r, front: e.target.value } : r))
                        )
                      }
                      placeholder="Question"
                    />
                    <Input
                      value={row.back}
                      onChange={(e) =>
                        setManualRows((rows) =>
                          rows.map((r, j) => (j === i ? { ...r, back: e.target.value } : r))
                        )
                      }
                      placeholder="Answer"
                    />
                  </div>
                ))}
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-primary"
                  onClick={() => setManualRows((rows) => [...rows, { front: "", back: "" }])}
                >
                  <Plus className="mr-1 h-3.5 w-3.5" /> Add card
                </Button>
              </div>
            )}

            <Button
              className="w-full h-11"
              disabled={generating}
              onClick={mode === "manual" ? handleManualCreate : handleGenerate}
            >
              {generating ? (
                <>
                  <Spinner size={16} color="currentColor" /> AI is making your flashcards…
                </>
              ) : mode === "manual" ? (
                "Create deck"
              ) : (
                <>
                  <Sparkles className="mr-1.5 h-4 w-4" /> Generate flashcards
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ===== Review dialog ===== */}
      <ReviewDialog
        open={reviewing}
        onClose={() => setReviewing(false)}
        title={reviewDeckTitle}
        cards={reviewCards}
      />
    </div>
  );
}

function ReviewDialog({
  open,
  onClose,
  title,
  cards,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  cards: ReviewCard[];
}) {
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [known, setKnown] = useState<Set<string>>(new Set());
  const [done, setDone] = useState(false);

  const total = cards.length;
  const knownCount = known.size;

  const handleVerdict = (wasKnown: boolean) => {
    const card = cards[index];
    if (!card) return;
    const next = new Set(known);
    if (wasKnown) next.add(card.id);
    else next.delete(card.id);
    setKnown(next);
    if (index + 1 >= total) {
      setDone(true);
    } else {
      setIndex(index + 1);
      setFlipped(false);
    }
  };

  const restart = () => {
    setIndex(0);
    setFlipped(false);
    setKnown(new Set());
    setDone(false);
  };

  const close = () => {
    restart();
    onClose();
  };

  const current = cards[index];

  return (
    <Dialog open={open} onOpenChange={(o) => (o ? undefined : close())}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="truncate pr-8">{title}</DialogTitle>
        </DialogHeader>

        {!done && current ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>
                Card {index + 1} of {total}
              </span>
              <span className="font-medium tabular-nums">{knownCount} known</span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${((index + (flipped ? 1 : 0)) / total) * 100}%` }}
              />
            </div>

            <button
              onClick={() => setFlipped((f) => !f)}
              className="flex min-h-56 w-full flex-col items-center justify-center rounded-2xl border border-border/60 bg-card p-6 text-center shadow-sm transition-transform active:scale-[0.99]"
            >
              {flipped ? (
                <>
                  <span className="mb-3 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
                    Answer
                  </span>
                  <p className="whitespace-pre-wrap text-base leading-relaxed text-foreground">
                    {current.back}
                  </p>
                </>
              ) : (
                <>
                  <span className="mb-3 rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Question
                  </span>
                  <p className="text-base font-medium leading-relaxed text-foreground">
                    {current.front}
                  </p>
                </>
              )}
              <span className="mt-5 text-xs text-muted-foreground/70">
                Tap to flip
              </span>
            </button>

            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1 h-11"
                onClick={() => handleVerdict(false)}
              >
                <XCircle className="mr-1.5 h-4 w-4 text-destructive" /> Hindi ko alam
              </Button>
              <Button className="flex-1 h-11" onClick={() => handleVerdict(true)}>
                <CheckCircle2 className="mr-1.5 h-4 w-4" /> Alam ko
              </Button>
            </div>

            <div className="flex justify-center">
              <Button variant="ghost" size="sm" onClick={restart}>
                <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Restart
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4 py-4 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              <CheckCircle2 className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-foreground">Done reviewing!</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                You knew{" "}
                <span className="font-semibold tabular-nums text-foreground">
                  {knownCount} of {total}
                </span>{" "}
                cards
              </p>
            </div>
            {knownCount < total && (
              <p className="text-sm text-muted-foreground">
                Review the {total - knownCount} you missed, then try again. Repetition = memory.
              </p>
            )}
            <div className="flex justify-center gap-2">
              <Button variant="outline" onClick={close}>
                <ArrowLeft className="mr-1.5 h-4 w-4" /> Back to decks
              </Button>
              <Button onClick={restart}>
                <ArrowRight className="mr-1.5 h-4 w-4" /> Review again
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
