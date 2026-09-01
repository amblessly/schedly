# Schedly Free-Tier Limits

> **Last Updated: August 2026** — Quotas change frequently. Verify with provider documentation before deployment.

## Overview

Schedly operates on a **$0/month** budget. Every service has free-tier limits. This document tracks what's available, what consumes the quota, the bottleneck risk, how Schedly minimizes usage, and the fallback strategy.

---

## 1. AI Providers

### Google AI Studio (Gemini)

| Attribute | Detail |
|---|---|
| **Free allowance** | ~1,500 requests/day per key (varies by model and region) |
| **Models available (free)** | gemini-2.0-flash-exp, gemini-2.5-flash, gemini-3.5-flash, gemini-3.6-flash |
| **Vision (free)** | Yes — all flash models support image input |
| **What consumes quota** | Every `generateContent` API call counts, including 429s and 503s |
| **Potential bottleneck** | 1,500 req/day shared across all users. With 425 users, that's ~3-4 uploads/user/day before exhaustion |
| **How Schedly minimizes** | Default pipeline uses free OCR (tesseract.js). AI only used when `OPENROUTER_AI_FALLBACK=true` or as explicit fallback. Perceptual image hash caching skips re-uploads. |
| **Fallback strategy** | OpenRouter → Groq → Bytez → Tesseract.js OCR → User review |
| **Key management** | Multiple keys (`GEMINI_API_KEY`, `_2` … `_10`) stack the budget multiplicatively |
| **Documentation** | https://ai.google.dev/pricing |

### OpenRouter

| Attribute | Detail |
|---|---|
| **Free allowance** | ~50 requests/day per free-model key (exact limit set by each model's page) |
| **Free models** | google/gemma-4-26b-a4b-it:free, nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free, google/gemini-2.0-flash-exp:free (and many more) |
| **Vision (free)** | gemma-4-26b-a4b-it:free supports images; nemotron does not |
| **What consumes quota** | Every chat completions request to a free model |
| **Potential bottleneck** | 50 req/day is very low. A single user doing 10 uploads exhausts one key. Multiple keys are essential. |
| **How Schedly minimizes** | OpenRouter is only used as a fallback after Gemini/Groq/Bytez. `OPENROUTER_DISABLED=true` rests the quota automatically. Free-tier only — no billing risk. |
| **Fallback strategy** | When exhausted → Next Gemini key → Next Groq key → Bytez → Tesseract.js |
| **Key management** | `OPENROUTER_API_KEY`, `_2` … `_10`. Each key tried in order on failure. |
| **Auto-disable** | When `OPENROUTER_DISABLED=true`, OpenRouter is skipped until `x-ratelimit-reset` passes or midnight UTC |
| **Documentation** | https://openrouter.ai/limits |

### Groq

| Attribute | Detail |
|---|---|
| **Free allowance** | 30 requests/minute per key, ~14,400 requests/day |
| **Free models** | llama-3.3-70b-versatile, qwen/qwen3-30b-a3b, and many more (text only, no free vision) |
| **Vision (free)** | No free vision models — Groq deprecated llama-3.2-90b-vision-preview |
| **What consumes quota** | Every chat completions API call |
| **Potential bottleneck** | 30 RPM limit is generous but per-key. Use multiple keys for headroom. |
| **How Schedly minimizes** | Groq used only for text-only operations (validation, suggestions). Never for vision. Only processed when Groq keys are configured. |
| **Fallback strategy** | Gemini → OpenRouter → User review |
| **Key management** | `GROQ_API_KEY`, `_2` … `_10` |
| **Documentation** | https://console.groq.com/docs/rate-limits |

### Bytez

| Attribute | Detail |
|---|---|
| **Free allowance** | $1 credits/month (open models up to 7B params) |
| **Free models** | google/gemma-3-4b-it, Qwen/Qwen2.5-7B-Instruct, and 221,000+ open models |
| **Vision (free)** | Some vision models available but account must have model access |
| **What consumes quota** | Every API call consumes credits ($0.0002-$0.002 per 1K tokens typical for open models) |
| **Potential bottleneck** | $1/month depletes quickly at scale. Currently DISABLED in code because all model IDs return 404 — model access must be enabled in the account. |
| **How Schedly minimizes** | Bytez is only tried if `BYTEZ_API_KEY` is configured AND vision models are available. Falls through to Gemini/Groq/OpenRouter automatically. |
| **Fallback strategy** | Gemini → OpenRouter → Tesseract.js |
| **Key management** | `BYTEZ_API_KEY`, `_2` … `_10` |
| **Documentation** | https://docs.bytez.com |

### Tesseract.js (Local OCR)

| Attribute | Detail |
|---|---|
| **Free allowance** | Unlimited — runs locally in the browser/Node.js |
| **What consumes quota** | CPU time (client/server) — no external quota |
| **Potential bottleneck** | Slower than AI vision models; accuracy varies on complex layouts |
| **How Schedly minimizes** | Primary extraction method when no AI fallback is configured. Fast, deterministic, free. |
| **Fallback strategy** | AI vision model → User review |

---

## 2. Infrastructure

### Vercel Hobby / Free

| Attribute | Detail |
|---|---|
| **Free allowance** | 100 hours/month compute (hobby), unlimited deployments |
| **Function timeout** | 10 seconds standard, up to 300 seconds with `maxDuration` export |
| **Request body limit** | 4.5MB (API routes), 12MB with `serverActions.bodySizeLimit` |
| **Response limit** | No hard limit but must complete within `maxDuration` |
| **What consumes quota** | Every request to Vercel servers counts toward 100 hours/month |
| **Potential bottleneck** | 100 hours = ~3.3 hours/day. With ~425 users, this could exhaust quickly during peak hours. |
| **How Schedly minimizes** | Short responses, minimal server-side processing, client-side caching |
| **Fallback strategy** | Upgrade to Vercel Pro or self-host |
| **Documentation** | https://vercel.com/docs/concepts/functions/execution-time |

### Neon PostgreSQL (Free Tier)

| Attribute | Detail |
|---|---|
| **Free allowance** | 0.5 GB storage, 5 projects, shared CPU, 10 concurrent connections |
| **Network egress** | ~6 GB/month included |
| **What consumes quota** | Every query returns data over the network — `SELECT *` wastes bandwidth |
| **Potential bottleneck** | Network egress is the most likely cap. Each schedule/class lookup is small but multiplied by 425 users adds up. |
| **How Schedly minimizes** | Column selection (never `SELECT *`), batched queries, connection pooling via Prisma, minimal data transfer |
| **Fallback strategy** | Reduce query frequency, implement response caching, upgrade to Neon paid tier |
| **Documentation** | https://neon.tech/docs/introduction |

### Backblaze B2

| Attribute | Detail |
|---|---|
| **Free allowance** | 1 GB storage, 1 GB/day download, 2,500 Class C uploads/day, 2,500 Class B downloads/day |
| **Class B (download)** | $0.01 per GB after free tier |
| **Class C (upload)** | $0.01 per GB after free tier |
| **What consumes quota** | Every schedule image upload (Class C), every image served/viewed (Class B download) |
| **Potential bottleneck** | 2,500 uploads/day and 2,500 downloads/day are generous but 425 active users uploading photos daily could approach limits |
| **How Schedly minimizes** | Images are B2-private. Served via `/api/upload/{id}/file` (Class B). Thumbnails could use lower resolution. Failed upload cleanup prevents orphaned objects. |
| **Fallback strategy** | Vercel Blob (has its own free tier), database fallback (with size limits) |
| **Documentation** | https://www.backblaze.com/cloud-storage/pricing |

### Redis (BullMQ Queue)

| Attribute | Detail |
|---|---|
| **Free allowance** | Upstash Redis free tier: 10,000 commands/day, 1 database, 30 max concurrent connections |
| **What consumes quota** | Job enqueue/dequeue, rate limit checks |
| **Potential bottleneck** | Upstash free tier is tight — 10,000 commands/day = ~116/minute. 425 users × 1 flashcard request = 425 commands, which is 3x the daily limit if all hit at once. |
| **How Schedly minimizes** | Queue used only for large async operations. Small extractions (OCR) are synchronous. Rate limiting prevents burst consumption. |
| **Fallback strategy** | In-memory queue (dev mode), or Redis Cloud free tier |
| **Documentation** | https://upstash.com/docs/redis/overall/limitations |

### Resend (Email)

| Attribute | Detail |
|---|---|
| **Free allowance** | 3,000 emails/month on free plan |
| **What consumes quota** | Verification emails, password resets, notification emails |
| **Potential bottleneck** | 3,000/month = ~100/day. With 425 users, if each triggers 2 emails/month, that's ~850 emails/month — well within limits. |
| **How Schedly minimizes** | Email sent only for verification, password reset, and critical notifications. Duplicate emails prevented via cooldown. |
| **Fallback strategy** | Lower email frequency, upgrade to paid Resend plan |
| **Documentation** | https://resend.com/pricing |

### Upstash QStash (Scheduled Reminders)

| Attribute | Detail |
|---|---|
| **Free allowance** | 10,000 messages/day |
| **What consumes quota** | Each scheduled class reminder sent via QStash |
| **Potential bottleneck** | 10,000/day = ~416/hour. Each user with 5 classes × 2 reminders/day = 10 messages/user/day. 425 users = 4,250 messages/day — still within limits. |
| **How Schedly minimizes** | Deduplicated reminders, daily digest option, client-side notifications for immediate reminders |
| **Fallback strategy** | Local service-worker alarms (works while app is open), daily cron job (no QStash needed) |
| **Documentation** | https://upstash.com/docs/qstash/get-started/introduction |

---

## 3. AI Usage Minimization Strategy

### Layered Approach (Fastest to Slowest)

```
1. Perceptual Hash Cache (instant, free)
   └── Same image re-upload → return cached result
   
2. Direct Text Extraction (free, fast)
   └── PDF with selectable text → pdfjs-dist (no AI)
   
3. Local OCR (free, moderate)
   └── Scanned image → Tesseract.js
   
4. Free Vision AI (free, slow)
   └── Complex image → Gemini (1,500/day)
       → Groq text-only (30/min) — never vision
       → OpenRouter (50/day per key) — fallback only
       → Bytez ($1/month) — last resort

5. User Review (free, user-time)
   └── Low-confidence result → review screen
```

### Per-Task Optimization

| Task | Primary | Secondary | Fallback |
|---|---|---|---|
| Timetable (clear image) | OCR | Gemini vision | OpenRouter |
| Timetable (complex layout) | Gemini vision | OpenRouter | User review |
| Flashcards (PDF text) | Gemini text | OpenRouter | — |
| Flashcards (image) | Gemini vision | OpenRouter | — |
| Syllabus (PDF text) | Gemini text | OpenRouter | — |
| Syllabus (image) | Gemini vision | — | User review |

---

## 4. Daily Budget Estimates

Based on 425 users:

| Scenario | AI Requests/Day | Status |
|---|---|---|
| All users upload 1 schedule/day (OCR only) | 0 | ✅ Safe |
| All users upload 1 schedule/day (AI fallback) | 425 | ✅ Gemini: 1,500/day limit — fine |
| All users generate 5 flashcards/day | 2,125 | ⚠️ Gemini: ~1.4 days of quota |
| All users generate syllabus 1x/day | 425 | ✅ Gemini: 1,500/day limit — fine |
| Mixed usage peak | ~3,000 | 🔴 Approaching limits |

**Recommendation**: Enable AI fallback only when needed. Keep OCR as primary. Multiple AI keys are essential for scale.

---

## 5. Key Rotation Strategy

When a key is exhausted:

```
Gemini Key 1 → 429 / RESOURCE_EXHAUSTED
    ↓
Cooldown (15 minutes minimum)
    ↓
Gemini Key 2 (if available)
    ↓
... continue through all keys
    ↓
OpenRouter (50/day — reserve for emergencies)
    ↓
Tesseract.js OCR
    ↓
User review
```

Keys are never "round-robined" — each key stays in use until it fails, then all other keys are tried before returning to the exhausted key.
