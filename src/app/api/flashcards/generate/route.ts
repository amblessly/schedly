import { NextRequest, NextResponse } from "next/server";
import { getSessionCookie } from "better-auth/cookies";
import { auth } from "@/server/lib/auth";
import { checkRateLimitDb, detectImageMime, validateCsrf } from "@/server/lib/security";
import { storeImage } from "@/server/services/file-store.service";
import { PipelineLogger } from "@/server/lib/structured-logger";
import { generateFlashcardsFromImage, generateFlashcardsFromText } from "@/server/lib/flashcards-ai";
import { PDFParse } from "pdf-parse";

const MAX_FILE_BYTES = 20 * 1024 * 1024; // 20 MB (mirrors upload.service)
const MAX_PDF_PAGES = 40;

function jsonError(message: string, status: number, details?: Record<string, string[]>) {
  return NextResponse.json({ error: message, details }, { status });
}

export async function POST(request: NextRequest) {
  const sessionCookie = getSessionCookie(request);
  if (!sessionCookie) return jsonError("Unauthorized", 401);
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user?.id) return jsonError("Unauthorized", 401);
  if (!session.user.isAdmin) {
    return jsonError("Flashcards are in internal testing.", 403);
  }

  if (!validateCsrf(request)) return jsonError("Invalid CSRF token", 403);

  const limit = await checkRateLimitDb(`flashcards:${session.user.id}`, 5, 60_000);
  if (!limit.allowed) {
    return jsonError("Too many requests. Try again in a minute.", 429);
  }

  const formData = await request.formData();
  const title = String(formData.get("title") || "Untitled Deck").trim().slice(0, 120);
  const subject = String(formData.get("subject") || "").trim().slice(0, 60) || null;
  const pastedText = String(formData.get("text") || "").trim();
  const file = formData.get("file");

  let sourceType: "text" | "pdf" | "image" = "text";
  let cards = [];
  let model = "";

  if (file && file instanceof File) {
    if (file.size === 0) return jsonError("The file is empty.", 400);
    if (file.size > MAX_FILE_BYTES) return jsonError("File is too large (max 20MB).", 400);

    const buffer = Buffer.from(await file.arrayBuffer());
    const imageMime = detectImageMime(buffer);

    if (imageMime) {
      // --- Image: AI vision extraction (same content policy as uploads) ---
      sourceType = "image";
      await storeImage(session.user.id, buffer, imageMime, title || "flashcard-source", {
        folder: "flashcards",
      });
      const result = await generateFlashcardsFromImage(
        buffer.toString("base64"),
        imageMime,
        title
      );
      cards = result.cards;
      model = result.model;
    } else if (buffer[0] === 0x25 && buffer[1] === 0x50) {
      // --- PDF: text extraction, then text-mode generation ---
      sourceType = "pdf";
      await storeImage(session.user.id, buffer, "application/pdf", title || "flashcard-source", {
        folder: "flashcards",
      });
      let text = "";
      try {
        const parser = new PDFParse({ data: buffer });
        const result = await parser.getText({
          first: MAX_PDF_PAGES,
          pageJoiner: "\n\n",
        });
        await parser.destroy();
        text = result.text;
      } catch (err) {
        PipelineLogger.warn("flashcards", "PDF parse failed", {}, err);
        return jsonError(
          "Could not read text from this PDF (it may be scanned/image-based). Try uploading a photo instead.",
          422
        );
      }
      if (!text.trim()) {
        return jsonError(
          "No readable text found in the PDF (it may be scanned). Try uploading a photo instead.",
          422
        );
      }
      const result = await generateFlashcardsFromText(text, title);
      cards = result.cards;
      model = result.model;
    } else {
      return jsonError("Unsupported file type. Upload a PDF or an image (JPEG, PNG, GIF, WebP, BMP).", 400);
    }
  } else if (pastedText) {
    sourceType = "text";
    const result = await generateFlashcardsFromText(pastedText, title);
    cards = result.cards;
    model = result.model;
  } else {
    return jsonError("Upload a file or paste your notes to generate flashcards.", 400);
  }

  if (!cards.length) return jsonError("AI returned no usable flashcards. Try again.", 502);

  const { db } = await import("@/server/db/client");
  const deck = await db.flashcardDeck.create({
    data: {
      userId: session.user.id,
      title: title || "Untitled Deck",
      subject,
      sourceType,
      flashcards: {
        create: cards.map((c) => ({ front: c.front, back: c.back })),
      },
    },
    include: { _count: { select: { flashcards: true } } },
  });

  PipelineLogger.info("flashcards", "Deck created", {
    userId: session.user.id,
    deckId: deck.id,
    sourceType,
    cards: cards.length,
    model,
  });

  return NextResponse.json({
    deckId: deck.id,
    cards: cards.length,
    model,
  });
}
