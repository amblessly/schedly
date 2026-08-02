// One-off data fix: regenerate class short names that contain stray
// parentheses (e.g. "Introduction to Computing (Lec/Lab)" -> "IC(").
// Mirror of src/lib/abbreviations.ts generateShortName (fixed version).
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const STOPWORDS = new Set([
  "to", "in", "the", "of", "a", "an", "and", "for", "with", "on", "ii", "iii", "iv",
]);

function isStopword(w) {
  return STOPWORDS.has(w.toLowerCase());
}

function abbreviateWord(word) {
  const w = word.trim().replace(/[^a-zA-Z0-9]/g, "");
  if (!w) return "";
  if (w.length <= 4) return w;
  const upper = w.match(/[A-Z]/g);
  if (upper && upper.length > 1) {
    return w.slice(0, 5).trim() + ".";
  }
  return w.slice(0, 4) + ".";
}

function significantWord(w) {
  return w.replace(/[^a-z0-9]/gi, "");
}

export function generateShortName(subject) {
  if (!subject || !subject.trim()) return "";
  const raw = subject.trim().replace(/\s+/g, " ");
  const words = raw.split(" ");

  const significant = words.filter(
    (w) => !isStopword(w) && significantWord(w).length > 0
  );
  const sigCount = significant.length;

  if (sigCount === 0) {
    return raw.length <= 12 ? raw : raw.slice(0, 11) + ".";
  }

  if (sigCount >= 3) {
    const initials = significant
      .filter((w) => !/^\(.*\)$/.test(w))
      .map((w) => significantWord(w)[0].toUpperCase())
      .join("");
    if (initials.length >= 2) return initials;
    return significant
      .map((w) => significantWord(w)[0].toUpperCase())
      .join("");
  }

  if (sigCount === 1) {
    const only = significant[0];
    const clean = significantWord(only);
    const numMatch = only.match(/^(.*?)(\s*\d+.*)$/);
    if (numMatch) {
      const base = significantWord(numMatch[1]);
      const tail = numMatch[2].trim().replace(/[^a-z0-9]+$/i, "");
      return (base.length <= 5 ? base : abbreviateWord(base)) + (tail ? " " + tail : "");
    }
    return clean.length <= 6 ? clean : abbreviateWord(clean);
  }

  return words
    .map((w) => {
      if (isStopword(w)) return w;
      const clean = significantWord(w);
      return clean.length <= 4 ? clean : abbreviateWord(clean);
    })
    .join(" ");
}

const { default: pg } = await import("pg");
const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();

try {
  const { rows } = await client.query(
    `SELECT id, subject, short_name FROM classes
     WHERE short_name IS NULL OR short_name LIKE '%(%' OR short_name LIKE '%)%'`
  );

  let changed = 0;
  let skipped = 0;
  for (const row of rows) {
    const next = generateShortName(row.subject);
    if (!next || next === row.short_name) {
      skipped++;
      continue;
    }
    await client.query(
      `UPDATE classes SET short_name = $1, updated_at = now() WHERE id = $2`,
      [next, row.id]
    );
    console.log(
      `"${row.short_name ?? "(null)"}" -> "${next}"  (subject: ${row.subject})`
    );
    changed++;
  }

  console.log(`\nDone: ${changed} updated, ${skipped} skipped, ${rows.length} scanned.`);
} finally {
  await client.end();
}
