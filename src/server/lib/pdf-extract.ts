/**
 * PDF text extraction using pdfjs-dist (legacy Node build).
 *
 * Why not pdf-parse?
 *   pdf-parse@2.x bundles pdfjs-dist which expects browser globals like
 *   `DOMMatrix`. On Vercel's Node runtime those globals are not defined, so
 *   the import throws `ReferenceError: DOMMatrix is not defined` and the
 *   upload fails. Importing pdfjs-dist's legacy build directly avoids the
 *   browser-only code path.
 */
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

// Use require() so pdfjs-dist is treated as a Node module and not bundled
// by Vercel (it's already in serverExternalPackages-style usage).
// eslint-disable-next-line @typescript-eslint/no-var-requires
const pdfjs: any = require("pdfjs-dist/legacy/build/pdf.mjs");

export interface PdfTextResult {
  text: string;
  numPages: number;
}

/**
 * Extract plain text from a PDF buffer. Returns the concatenated text from
 * all pages, separated by blank lines.
 */
export async function extractPdfText(buffer: Buffer): Promise<PdfTextResult> {
  // Disable worker — running the worker in Node requires a separate file
  // resolution path that Vercel's bundler doesn't always preserve. Single-
  // thread parsing is fine for syllabus/flashcard use cases (<50 pages).
  pdfjs.GlobalWorkerOptions.workerSrc = "";

  const loadingTask = pdfjs.getDocument({
    data: new Uint8Array(buffer),
    useSystemFonts: true,
    isEvalSupported: false,
    disableFontFace: true,
  });

  const doc = await loadingTask.promise;
  const numPages = doc.numPages;
  const pages: string[] = [];

  for (let i = 1; i <= numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    const text = content.items
      .map((item: { str?: string }) => (item.str ?? ""))
      .join(" ");
    pages.push(text);
    page.cleanup();
  }

  await doc.cleanup();
  await doc.destroy();

  return {
    text: pages.join("\n\n").trim(),
    numPages,
  };
}
