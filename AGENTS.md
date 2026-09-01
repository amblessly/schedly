<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

<!-- BEGIN:security -->
# Security Guidelines

## Secrets
- **NEVER commit `.env` or `.env.local`** — they contain live production secrets
- Only `.env.example` with placeholder values should be tracked
- Real secrets are injected via Vercel dashboard env vars in production

## Middleware
- `src/middleware.ts` handles route protection (auth redirects, admin blocking, email verification)
- Do NOT rename this file — Next.js only loads `middleware.ts`

## CSP
- `next.config.ts` dynamically generates CSP headers
- `'unsafe-eval'` is removed in production — only included for dev
- Rate limiting on upload (10/min) and feedback (5/min) per user

## Upload Security
- Magic byte detection (`src/server/lib/security.ts`) validates actual file content, not just MIME type
- Allowed formats: JPEG, PNG, GIF, WebP, BMP
- Max file size: 20MB
<!-- END:security -->

<!-- BEGIN:ai-architecture -->
# AI Architecture

Schedly uses a **centralized AI gateway** at `src/server/ai/` for all AI operations.

## Key Files
- `src/server/ai/ai.service.ts` — Central gateway with fallback chain
- `src/server/ai/types.ts` — Task types and configuration
- `src/server/ai/task-router.ts` — Provider/model selection
- `src/server/ai/circuit-breaker.ts` — Per-key provider health tracking
- `src/server/ai/retry-manager.ts` — Exponential backoff with jitter
- `src/server/ai/response-parser.ts` — JSON extraction and repair

## Provider Priority
1. **Gemini** (1,500 req/day/key) — Primary for vision + text
2. **Groq** (14,400 req/day/key) — Text-only, fast
3. **OpenRouter** (50 req/day/key) — Fallback only
4. **Bytez** ($1 credits/month) — Last resort, may be unavailable

## Task Routing
- `TIMETABLE_EXTRACTION` → vision-capable model
- `FLASHCARD_GENERATION` → text model
- `SYLLABUS_GENERATION` → text model
- `SCHEDULE_VALIDATION` → text model

## Key Health Tracking
- Each key has its own circuit breaker state
- Keys are automatically skipped when exhausted
- Circuit breaker auto-resets after cooldown period

## Prompt Versioning
- Prompts are embedded in code with version awareness
- Cache keys include prompt version implicitly via content hash

## Caching
- Perceptual image hash cache (`src/server/lib/image-cache.ts`) — skips re-uploads
- Cache key includes content hash + model + result version

## Rate Limiting
- Application-level rate limits per user per operation
- Provider-level tracking via database counters
- Admin dashboard shows real-time usage at `src/server/services/limits.service.ts`

## Testing
- All AI tests use mocked fetch — no real API calls
- Tests cover: success, fallback, rate limits, malformed JSON, timeouts
- Run: `npm run test:run src/server/ai/`
<!-- END:ai-architecture -->

<!-- BEGIN:deployment-checklist -->
# Production Deployment Checklist

## Pre-Deployment
- [ ] `npm run build` passes
- [ ] `npm run lint` passes (no errors)
- [ ] `npm run typecheck` passes (verify with `npx tsc --noEmit`)
- [ ] `npx prisma db push` or `npx prisma migrate deploy` succeeds
- [ ] All tests pass: `npm run test:run`
- [ ] AI gateway tests pass: `npm run test:run src/server/ai/`
- [ ] No secrets in source code (search for `sk-`, `AIza`, `gsk_`, `Bearer`)
- [ ] `.env` is not committed (`.gitignore` excludes it)

## Environment Variables (Vercel Dashboard)
- [ ] `DATABASE_URL` — Neon PostgreSQL connection string
- [ ] `REDIS_URL` — Redis connection (Upstash or self-hosted)
- [ ] `BETTER_AUTH_SECRET` — 32+ char random secret
- [ ] `BETTER_AUTH_URL` — Production URL
- [ ] `GEMINI_API_KEY` (+ `_2` through `_10`) — Google AI Studio keys
- [ ] `GROQ_API_KEY` (+ `_2` through `_10`) — Groq console keys
- [ ] `OPENROUTER_API_KEY` (+ `_2` through `_10`) — OpenRouter keys
- [ ] `BYTEZ_API_KEY` (+ `_2` through `_10`) — Bytez API keys
- [ ] `RESEND_API_KEY` — Resend API key
- [ ] `RESEND_FROM` — Verified sending address
- [ ] `B2_APPLICATION_KEY_ID` — Backblaze B2 key ID
- [ ] `B2_APPLICATION_KEY` — Backblaze B2 application key
- [ ] `B2_BUCKET` — B2 bucket name
- [ ] `NEXT_PUBLIC_APP_URL` — Production URL
- [ ] `NEXT_PUBLIC_FIREBASE_*` — Firebase client config
- [ ] `FIREBASE_ADMIN_*` — Firebase admin service account
- [ ] `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` — Web push keys
- [ ] `TURNSTILE_SECRET_KEY` — Cloudflare Turnstile
- [ ] AI model overrides (optional): `AI_TIMETABLE_MODEL`, `AI_FLASHCARD_MODEL`, etc.

## Infrastructure Verification
- [ ] Neon PostgreSQL accessible from Vercel
- [ ] Redis accessible from Vercel functions
- [ ] Backblaze B2 bucket exists and CORS is configured
- [ ] Resend domain is verified
- [ ] Firebase project is configured with messaging enabled
- [ ] Cloudflare Turnstile site is registered

## Feature Testing
- [ ] Google OAuth login works
- [ ] GitHub OAuth login works
- [ ] Email/password login works
- [ ] Schedule upload with image works (OCR first)
- [ ] AI extraction fallback works (with AI key configured)
- [ ] Flashcard generation works (PDF + image)
- [ ] Syllabus extraction works (PDF)
- [ ] Timetable review screen loads correctly
- [ ] Class save to database works
- [ ] Push notifications work (Firebase)
- [ ] Email verification works (Resend)
- [ ] Rate limiting is enforced

## AI Fallback Testing
- [ ] Primary provider (Gemini) works
- [ ] Fallback to Groq when Gemini is unavailable
- [ ] Fallback to OpenRouter when Gemini + Groq are unavailable
- [ ] Circuit breaker correctly skips exhausted keys
- [ ] 429 responses trigger cooldown
- [ ] Stale upload (processing > 10 min) marked as failed

## Performance & Safety
- [ ] File upload < 300ms response (deferred processing)
- [ ] Flashcard generation < 90s (maxDuration: 90)
- [ ] Syllabus generation < 300s (maxDuration: 300)
- [ ] Database queries use column selection (no `SELECT *`)
- [ ] Image cache reduces repeated AI calls
- [ ] No sensitive data in logs
- [ ] Error messages don't expose provider details

## Free-Tier Protection
- [ ] AI fallback is NOT the default (OCR is primary)
- [ ] Multiple AI keys configured for Gemini
- [ ] Multiple AI keys configured for OpenRouter
- [ ] Perceptual hash cache is enabled (default)
- [ ] Usage counters are being updated
- [ ] Limits dashboard accessible at `/api/admin/limits`
- [ ] B2 uploads/deletes are tracked
- [ ] Resend emails are tracked

## After Deployment
- [ ] Production URL is set in Vercel environment
- [ ] Vercel Cron is enabled for `/api/cron/reminders`
- [ ] Monitor usage dashboard for first 24 hours
- [ ] Monitor Neon usage for data transfer
- [ ] Monitor B2 bandwidth usage
- [ ] Check for any 5xx errors in Vercel logs
- [ ] Verify all 425 users can log in
- [ ] Check Resend email delivery rates
<!-- END:deployment-checklist -->
