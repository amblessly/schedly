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
