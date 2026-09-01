# Schedly Production AI + Free-Tier Architecture Overhaul

You are working on the existing **Schedly** production codebase.

Schedly is a student timetable and study productivity application with approximately **425 users** and is currently being prepared for a new production deployment.

The project must operate under an extremely strict constraint:

> **Target operating cost: $0/month.**

Do not introduce paid services, paid AI APIs, paid infrastructure, or unnecessary third-party dependencies.

The goal is not merely to make the application work locally. The goal is to make the new deployment **stable, quota-aware, fast, token-efficient, fault-tolerant, and safe for a real user base**.

---

# 1. CRITICAL RULE: INSPECT BEFORE MODIFYING

Before changing anything:

1. Inspect the entire existing project architecture.
2. Inspect `package.json`.
3. Inspect `prisma/schema.prisma`.
4. Inspect all existing upload routes.
5. Inspect all AI services/providers.
6. Inspect the current timetable extraction flow.
7. Inspect the current flashcard generation flow.
8. Inspect the current syllabus generation flow.
9. Inspect file/PDF processing.
10. Inspect the existing OCR implementation.
11. Inspect all environment-variable references.
12. Inspect queue/job-processing code.
13. Inspect authentication.
14. Inspect storage handling.
15. Inspect existing Vercel configuration.
16. Inspect existing API routes.
17. Inspect existing error handling.
18. Inspect existing rate limiting.
19. Inspect existing caching.
20. Inspect existing tests.

Do NOT rewrite the application from scratch.

Preserve working functionality.

Make the smallest architectural changes necessary to achieve the requirements below.

---

# 2. CURRENT INFRASTRUCTURE

The project is intended to remain on a $0 infrastructure stack.

Existing services include:

```text
Hosting:
Vercel Hobby

Database:
Neon PostgreSQL

Object/File Storage:
Backblaze B2

Email:
Resend

Authentication:
Better Auth

Push Notifications:
Firebase / Web Push

Queue:
Redis / existing queue implementation

AI:
Multiple providers already configured

OCR:
Existing Tesseract.js implementation
```

Do not replace these services unless there is a concrete technical reason.

Do not introduce a paid replacement.

---

# 3. AI ARCHITECTURE

The existing application has multiple AI providers.

The AI system must be redesigned into a **central provider abstraction**.

Do NOT allow individual features to independently implement:

```text
fetch()
API key rotation
retry logic
rate limiting
fallbacks
JSON parsing
error handling
```

Instead create a centralized AI layer.

Recommended architecture:

```text
src/server/ai/
    ├── ai.service.ts
    ├── ai.types.ts
    ├── provider-manager.ts
    ├── providers/
    │   ├── gemini.provider.ts
    │   ├── bytez.provider.ts
    │   ├── groq.provider.ts
    │   └── openrouter.provider.ts
    ├── key-manager.ts
    ├── quota-manager.ts
    ├── retry-manager.ts
    ├── response-parser.ts
    ├── token-budget.ts
    └── model-router.ts
```

Adapt this structure to the existing codebase rather than blindly creating duplicate systems.

---

# 4. ZERO-DOLLAR FIRST POLICY

The AI architecture must follow:

```text
$0 provider
    ↓
available free quota
    ↓
fastest suitable model
    ↓
fallback provider
    ↓
local/free OCR
    ↓
user review
```

Never intentionally select a paid model when a suitable free model exists.

Never automatically upgrade to a paid provider.

Never silently cause billing.

If a provider requires billing to continue, treat it as unavailable.

---

# 5. NEVER HARD-CODE API KEYS

All API keys must come from environment variables.

Never:

- hard-code keys
- expose keys to the browser
- send keys in client-side JavaScript
- log keys
- store keys in the database
- commit keys to Git
- include actual keys in source code

Use environment variables such as:

```text
GEMINI_API_KEY
GEMINI_API_KEY_2
...

BYTEZ_API_KEY
BYTEZ_API_KEY_2
...

GROQ_API_KEY
GROQ_API_KEY_2
...

OPENROUTER_API_KEY
OPENROUTER_API_KEY_2
...
```

Automatically discover configured keys from the environment.

Do not require developers to manually edit code every time a key is added or removed.

---

# 6. API KEY ROTATION

Implement safe provider key rotation.

Do NOT simply rotate:

```text
key1 → key2 → key3 → key4
```

on every request.

Instead track:

```text
provider
key identifier
health
last successful request
last failure
rate limited status
temporary cooldown
estimated quota status
```

Use a cooldown mechanism.

Example:

```text
Gemini Key 1
    ↓
429
    ↓
cooldown

Gemini Key 2
    ↓
success
    ↓
continue using
```

When a key fails because of quota/rate limiting, temporarily remove it from the active pool.

Do not repeatedly hammer an exhausted key.

---

# 7. PROVIDER ROUTING

Implement task-aware routing.

Different tasks require different models.

Create task types:

```text
TIMETABLE_EXTRACTION
FLASHCARD_GENERATION
SYLLABUS_GENERATION
DOCUMENT_SUMMARY
TEXT_EXTRACTION
GENERAL_AI
```

The router should choose the cheapest suitable model/provider.

Example:

```text
TIMETABLE_IMAGE
    ↓
vision-capable free model
```

```text
FLASHCARD_FROM_TEXT
    ↓
fast text model
```

```text
SYLLABUS_FROM_DOCUMENT
    ↓
document-capable/vision model when necessary
```

Do not use a large reasoning model for simple text transformations.

---

# 8. MODEL SELECTION

Before implementing model names, inspect the current provider documentation and the application's currently configured models.

Do not assume old model names are still available.

The system must support configuration such as:

```text
AI_TIMETABLE_MODEL
AI_FLASHCARD_MODEL
AI_SYLLABUS_MODEL
AI_TEXT_MODEL
```

with safe defaults.

Prefer:

1. free tier
2. fast model
3. multimodal support when required
4. sufficient output quality
5. low token consumption

Do not use an expensive/high-reasoning model for simple extraction.

---

# 9. GEMINI FREE-TIER OPTIMIZATION

Gemini is one of the preferred providers for multimodal extraction when its current free-tier availability permits it.

Use current documented free-tier limits rather than hard-coding assumptions.

Google currently documents free input/output tokens for selected models and free-tier model availability. Verify the current limits at implementation time.

Do not assume a specific RPD value remains permanently unchanged.

The application should react dynamically to:

```text
429
RESOURCE_EXHAUSTED
quota errors
rate limit errors
temporary provider errors
```

instead of assuming a fixed daily number.

---

# 10. TOKEN MINIMIZATION

This is extremely important.

Every AI request must be designed to use the minimum necessary tokens.

Do NOT send:

- unnecessary system prompts
- repeated instructions
- entire database records
- unnecessary metadata
- duplicate OCR output
- previous AI responses
- unrelated user content

For structured extraction, use compact instructions.

Prefer:

```text
IMAGE
+
short task-specific schema
+
strict JSON requirement
```

instead of a massive prompt.

---

# 11. STRICT JSON OUTPUT

Whenever the AI is generating structured data, require JSON.

Example:

```json
{
  "schedule": [
    {
      "day": "Monday",
      "startTime": "08:00",
      "endTime": "09:30",
      "subject": "CCS 101",
      "room": "204"
    }
  ]
}
```

Do not ask the model to explain its answer.

Do not ask for Markdown.

Do not ask for conversational text.

Do not ask for reasoning.

Only request the required fields.

Validate the response against a schema before accepting it.

If malformed:

```text
parse
→ repair only when safe
→ otherwise retry/fallback
```

Never blindly `JSON.parse()` untrusted model output without validation.

---

# 12. TIMETABLE EXTRACTION

Timetable extraction must prioritize accuracy.

Use this architecture:

```text
Timetable image
      ↓
Image preprocessing
      ↓
Primary vision-capable AI provider
      ↓
Strict schedule JSON
      ↓
Schema validation
      ↓
Confidence / sanity checks
      ↓
Review UI
```

The existing Tesseract.js OCR system should remain available as a **free local fallback**, not necessarily the primary extraction method.

Do not force Tesseract to solve complex layouts if a free vision model can do it more accurately.

---

# 13. TIMETABLE PROMPT

Create a short, optimized timetable extraction prompt.

The model should:

- identify days
- identify subjects
- identify start/end times
- identify rooms
- handle different timetable layouts
- preserve uncertain text
- never invent information
- return strict JSON
- return empty/null values when information is missing

Do NOT ask the model to explain how it interpreted the image.

Do NOT request chain-of-thought.

Do NOT request reasoning.

---

# 14. TIMETABLE VALIDATION

After AI extraction:

Validate:

```text
day
startTime
endTime
subject
room
```

Check:

- valid day
- valid time
- start < end
- no impossible values
- no duplicate schedule entries
- subject exists
- no obviously hallucinated data

If something is invalid, mark it for user review.

Never silently invent or repair important schedule information.

---

# 15. FLASHCARD GENERATION

Optimize flashcard generation for low token usage.

Flow:

```text
Upload file/PDF
      ↓
Extract text
      ↓
Clean text
      ↓
Remove duplicate/irrelevant content
      ↓
Chunk intelligently
      ↓
AI generates flashcards
      ↓
Validate
      ↓
Save
```

Do NOT send an entire huge document to the model if only a portion is required.

Implement sensible chunking.

Avoid overlapping chunks unnecessarily.

Avoid regenerating flashcards for already processed content.

---

# 16. FLASHCARD JSON

Use a strict compact schema.

Example:

```json
{
  "flashcards": [
    {
      "question": "...",
      "answer": "..."
    }
  ]
}
```

Do not generate explanations, introductions, or Markdown.

Validate the number of flashcards.

Prevent duplicate cards.

Avoid extremely long answers.

---

# 17. SYLLABUS GENERATION

For:

```text
Upload PDF/file
      ↓
Extract content
      ↓
AI structure detection
      ↓
Syllabus JSON
      ↓
Validation
      ↓
Review
      ↓
Save
```

Do not send unnecessary raw document metadata to the model.

Extract only relevant content.

If the PDF already contains machine-readable text, use that instead of vision.

Only use vision/document AI when necessary.

This significantly reduces AI usage.

---

# 18. FILE PROCESSING STRATEGY

Determine the file type before using AI.

Example:

```text
TXT
→ direct text extraction

DOCX
→ direct document extraction

PDF with selectable text
→ direct PDF text extraction

Scanned PDF
→ OCR / vision

Image
→ vision/OCR
```

Never send a text-based PDF to a vision model unnecessarily.

This is one of the most important ways to reduce AI consumption.

---

# 19. DOCUMENT DEDUPLICATION

Before sending a document to AI:

Calculate a content hash.

Example:

```text
SHA-256(document content)
```

Store processing metadata.

If the exact same file has already been processed for the same task/configuration:

```text
return cached result
```

instead of making another AI request.

Do not cache private user content across users unless the data model explicitly guarantees proper authorization and isolation.

---

# 20. AI RESPONSE CACHE

For safe deterministic operations, implement caching.

Cache key should include:

```text
content hash
task
model
prompt version
parser version
```

Example:

```text
hash + timetable-v3 + model-x
```

If the prompt or parser changes, the cache should naturally invalidate.

---

# 21. RATE LIMITING

Protect the application from abuse.

Implement application-level rate limits for AI-heavy operations.

Examples:

```text
Timetable extraction
Flashcard generation
Syllabus generation
```

Do not allow one user to consume the entire free-tier quota.

Use:

```text
user ID
IP
operation
time window
```

where appropriate.

Do not rely only on provider rate limits.

---

# 22. REQUEST DEDUPLICATION

Prevent accidental duplicate requests.

Example:

```text
User clicks Generate
       ↓
Request starts
       ↓
Button disabled
       ↓
Second request blocked
```

Also implement server-side idempotency where possible.

If the same request is already processing:

```text
return existing job/request
```

instead of starting another AI call.

---

# 23. RETRY STRATEGY

Do NOT blindly retry every error.

Retry only transient errors:

```text
429
5xx
network timeout
temporary provider failure
```

Use exponential backoff with jitter.

Do not retry:

```text
invalid API key
invalid request
unsupported model
malformed input
```

When one provider fails:

```text
Provider A
   ↓
temporary failure
   ↓
Provider B
```

Do not retry Provider A five times before trying another healthy provider.

---

# 24. TIMEOUTS

Every external AI request must have a timeout.

Never allow a request to hang indefinitely.

The timeout should be appropriate to the operation:

```text
simple text → short timeout
image extraction → moderate timeout
large document → longer timeout
```

Respect Vercel's current function/runtime constraints.

---

# 25. VERCEL SAFETY

The new deployment is running on Vercel Hobby / free infrastructure.

Before deployment, inspect:

- function runtime
- maximum duration
- request body limits
- response limits
- serverless limitations
- environment variables
- build configuration

Do not build long-running AI workloads directly into a synchronous request if they can exceed Vercel's runtime.

For large document processing, use the existing queue architecture where appropriate.

Do not introduce an expensive queue provider.

---

# 26. QUEUE STRATEGY

Inspect the existing Redis/BullMQ implementation.

Do not automatically remove it.

Determine which tasks actually require asynchronous processing.

Good candidates:

```text
large PDF processing
large flashcard generation
large syllabus processing
bulk document processing
```

Small operations can remain synchronous if they consistently complete within the deployment limits.

The queue must not cause duplicate AI requests.

---

# 27. STORAGE ARCHITECTURE

Keep large files out of Neon.

Use:

```text
Backblaze B2 → actual files
Neon → metadata
```

Do NOT store large binary files or base64 document contents in PostgreSQL unless absolutely necessary.

Store:

```text
file ID
user ID
B2 object key
mime type
size
hash
createdAt
processing status
```

This minimizes database transfer.

---

# 28. DATABASE NETWORK OPTIMIZATION

Neon free-tier network usage must be protected.

Avoid:

```text
SELECT *
```

when unnecessary.

Select only required columns.

Avoid repeated database queries.

Batch operations when appropriate.

Do not repeatedly fetch the same user/file metadata during one AI request.

Use transactions only when required.

---

# 29. BACKBLAZE B2

Keep B2 as the primary object storage.

Before deployment:

- verify bucket configuration
- verify CORS
- verify private/public access strategy
- verify upload limits
- verify object cleanup
- verify failed-upload cleanup

Never expose application keys to the browser.

Use server-side signed URLs or controlled access where required.

---

# 30. RESEND

Keep email usage within the current free tier.

Do not send unnecessary emails.

Prevent duplicate verification emails.

Implement cooldowns.

Queue email if appropriate.

Never send an email repeatedly because of frontend retries.

---

# 31. OBSERVABILITY

Create an AI usage/health monitoring system.

Track:

```text
provider
model
task
success
failure
status code
latency
estimated tokens if available
key identifier (never actual key)
fallback used
createdAt
```

Do NOT store API keys.

Do NOT store sensitive user documents in logs.

Do NOT log complete prompts containing private documents.

---

# 32. AI PROVIDER HEALTH

Create provider health state:

```text
HEALTHY
DEGRADED
RATE_LIMITED
QUOTA_EXHAUSTED
AUTH_FAILED
DISABLED
```

Example:

```text
Gemini
  Key 1 → quota exhausted
  Key 2 → healthy
  Key 3 → rate limited

Bytez
  healthy

Groq
  healthy
```

The router should automatically avoid unhealthy keys/providers.

---

# 33. DAILY QUOTA AWARENESS

Do not assume API keys provide unlimited capacity.

Track provider responses.

When a provider returns a quota error:

```text
mark key/provider temporarily unavailable
```

If the provider exposes reset information, use it.

If no reset information is available, use a conservative cooldown.

Do not continuously retry exhausted providers.

---

# 34. FALLBACK PRIORITY

Use task-specific fallback chains.

Example:

```text
TIMETABLE:

Free Vision Provider
      ↓
Second Free Vision Provider
      ↓
Tesseract.js
      ↓
Review UI
```

```text
TEXT:

Fast Free Text Model
      ↓
Second Free Text Model
      ↓
Local deterministic processing
```

```text
DOCUMENT:

Direct text extraction
      ↓
Free AI
      ↓
OCR only if required
```

Do not use a vision model when direct text extraction is sufficient.

---

# 35. NO MULTI-ACCOUNT QUOTA BYPASS

Do not implement any mechanism intended to bypass provider limits through:

- fake accounts
- unauthorized account sharing
- artificial account rotation
- identity manipulation
- hidden quota circumvention

Use only provider-supported API keys and quotas.

---

# 36. ENVIRONMENT VARIABLES

Do not commit `.env`.

Update `.env.example` with placeholders only.

Example:

```text
GEMINI_API_KEY=
GEMINI_API_KEY_2=

BYTEZ_API_KEY=
BYTEZ_API_KEY_2=

GROQ_API_KEY=
GROQ_API_KEY_2=

OPENROUTER_API_KEY=
OPENROUTER_API_KEY_2=
```

Also document:

```text
AI_TIMETABLE_MODEL=
AI_FLASHCARD_MODEL=
AI_SYLLABUS_MODEL=
AI_TEXT_MODEL=
```

and relevant feature flags.

Never place real secrets in `.env.example`.

---

# 37. SECRET SECURITY AUDIT

Before final deployment, search the entire repository for:

```text
sk-
AIza
gsk_
Bearer
DATABASE_URL=
PRIVATE_KEY
API_KEY=
SECRET=
```

Ensure no actual secrets exist in:

- source code
- README
- Git history
- test fixtures
- client bundles
- logs
- documentation

If secrets are found, remove them.

Assume any previously exposed secrets are compromised and require rotation.

---

# 38. CLIENT SECURITY

AI provider keys must NEVER be included in:

```text
NEXT_PUBLIC_*
```

Only genuinely public configuration may use `NEXT_PUBLIC_`.

All AI calls must originate server-side.

The browser should call:

```text
/api/...
```

not:

```text
Gemini directly
Groq directly
OpenRouter directly
```

---

# 39. ERROR UX

Users should never see:

```text
429 RESOURCE_EXHAUSTED
OPENROUTER_ERROR
GEMINI_API_ERROR
```

Instead show useful messages:

```text
We're processing your file. Please try again in a moment.
```

or:

```text
We couldn't fully process this file automatically.
Please review the highlighted items.
```

Do not expose provider details or internal architecture.

---

# 40. AI FALLBACK UX

If the primary provider fails:

```text
User should not need to retry manually.
```

The backend should automatically attempt an appropriate fallback.

Example:

```text
Gemini
 ↓
429
 ↓
Bytez
 ↓
success
```

Only show an error after all safe fallbacks fail.

---

# 41. PERFORMANCE TARGETS

Optimize for:

### Timetable

Target:

```text
fast upload
→ fast AI extraction
→ immediate review
```

### Flashcards

Use asynchronous processing for large documents.

### Syllabus

Use direct document extraction before AI.

The application should never perform unnecessary AI calls.

---

# 42. TOKEN BUDGETS

Implement per-task output limits.

For example:

```text
TIMETABLE:
small JSON only

FLASHCARDS:
configured maximum cards

SYLLABUS:
only required structured fields

TEXT:
short output unless explicitly requested
```

Never let a model generate unlimited output.

---

# 43. PROMPT VERSIONING

Store prompt versions in code.

Example:

```text
TIMETABLE_PROMPT_VERSION = "v3"
FLASHCARD_PROMPT_VERSION = "v2"
SYLLABUS_PROMPT_VERSION = "v2"
```

Include prompt version in cache keys.

This makes future changes safe and debuggable.

---

# 44. TESTING

Create automated tests for:

### AI

- valid response
- malformed JSON
- empty response
- timeout
- 429
- 500
- invalid key
- provider unavailable
- fallback
- key cooldown

### Timetable

- clear image
- different layouts
- missing room
- missing time
- multiple classes
- unusual subject names

### Documents

- TXT
- DOCX
- text PDF
- scanned PDF
- large PDF

### Flashcards

- duplicate content
- empty content
- long content

### Syllabus

- structured PDF
- unstructured document
- scanned document

---

# 45. PRODUCTION LOAD TEST

Before Wednesday deployment, simulate realistic usage.

Do not spam external AI providers.

Use mocked provider responses for load testing.

Test:

```text
multiple simultaneous uploads
multiple users generating flashcards
multiple users processing PDFs
provider failure
provider quota exhaustion
database failure
storage failure
```

Verify that one provider outage does not take down the entire application.

---

# 46. DEPLOYMENT CHECKLIST

Before production deployment:

```text
[ ] npm run build passes
[ ] TypeScript passes
[ ] Prisma schema validated
[ ] Database migration tested
[ ] Vercel environment variables configured
[ ] No secrets committed
[ ] AI keys rotated after exposure
[ ] B2 upload tested
[ ] B2 download tested
[ ] Email tested
[ ] Authentication tested
[ ] Google OAuth tested
[ ] GitHub OAuth tested
[ ] Timetable tested
[ ] Flashcards tested
[ ] Syllabus tested
[ ] AI fallback tested
[ ] 429 handling tested
[ ] Timeout handling tested
[ ] Database error handling tested
[ ] File upload limits tested
[ ] Rate limiting tested
[ ] Queue tested
[ ] Duplicate request protection tested
[ ] Production URL tested
```

---

# 47. CRITICAL DEPLOYMENT REQUIREMENT

The previous deployment was paused.

This new deployment must be treated as a **fresh production deployment**, but the application must remain within the free-tier capabilities of every service.

Do not assume that a service can handle unlimited usage simply because it has a free tier.

Identify all likely free-tier bottlenecks.

Create a `FREE_TIER_LIMITS.md` file documenting:

```text
Service
Free allowance
What consumes quota
Potential bottleneck
How Schedly minimizes usage
Fallback strategy
```

Do not invent quotas. Use current official provider documentation when documenting limits.

---

# 48. ZERO-DOLLAR ARCHITECTURE

The final architecture should look like:

```text
                         SCHEDLY
                            │
                         Vercel
                            │
              ┌─────────────┼─────────────┐
              │             │             │
           Neon            B2          Resend
              │             │             │
              └─────────────┼─────────────┘
                            │
                       AI Gateway
                            │
          ┌─────────────────┼─────────────────┐
          │                 │                 │
       Gemini            Bytez            Groq/OpenRouter
          │                 │                 │
          └─────────────────┼─────────────────┘
                            │
                       Tesseract.js
                        free fallback
```

The exact provider order must be determined from current model availability, capabilities, latency, and free-tier status.

---

# 49. MOST IMPORTANT OPTIMIZATION

Do not treat every upload as an AI problem.

Use this decision tree:

```text
What did the user upload?
          │
          ├── Text file
          │      ↓
          │   Local parser
          │
          ├── Text PDF
          │      ↓
          │   Local PDF extraction
          │
          ├── DOCX
          │      ↓
          │   Local DOCX extraction
          │
          ├── Image timetable
          │      ↓
          │   Free vision AI
          │
          └── Scanned PDF
                 ↓
             OCR / Vision
```

Only use AI where AI is actually necessary.

---

# 50. FINAL OBJECTIVE

The final Schedly system should achieve:

```text
                    USER
                     │
                     ↓
                   UPLOAD
                     │
                     ↓
              FILE TYPE DETECTION
                     │
          ┌──────────┴──────────┐
          ↓                     ↓
    Local extraction        AI required
          │                     │
          │              Provider Router
          │                     │
          │          ┌──────────┼──────────┐
          │          ↓          ↓          ↓
          │       Gemini      Bytez    Other free
          │          │          │       provider
          │          └──────────┼──────────┘
          │                     ↓
          │                 Validation
          │                     ↓
          └─────────────────────┘
                                ↓
                         Review / Preview
                                ↓
                              SAVE
```

The system must prioritize:

1. **$0 operating cost**
2. **Reliability**
3. **Fast response**
4. **Low token consumption**
5. **Free-tier quota preservation**
6. **Automatic provider fallback**
7. **No duplicate AI requests**
8. **No unnecessary AI requests**
9. **Secure API key handling**
10. **Vercel compatibility**
11. **Neon network/bandwidth conservation**
12. **B2 storage conservation**
13. **Production-grade error handling**
14. **User-friendly recovery**
15. **Maintainability**

Do not claim that the system is production-ready merely because the build passes.

Run the complete checklist, inspect the actual code paths, test the real upload flows, and identify anything that could cause the new deployment to fail, exceed a free-tier limit, expose a secret, or generate unnecessary AI requests.

Do not remove existing working functionality unless there is a clear replacement and regression test.

At the end, provide:

1. Files created
2. Files modified
3. Architecture changes
4. AI provider routing
5. Free-tier protection mechanisms
6. Token optimization mechanisms
7. Caching mechanisms
8. Rate limiting
9. Fallback behavior
10. Database/storage optimizations
11. Tests executed
12. Remaining risks
13. Exact environment variables required
14. Production deployment checklist

The final implementation must be **production-oriented, $0-first, quota-aware, secure, fast, and compatible with the existing Schedly codebase.**