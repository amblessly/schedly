# Schedly v2 — Improvement Plan

> Product strategy + engineering plan to evolve Schedly from **"a schedule scanner"** into **"a complete smart schedule companion."**
>
> PWA-first. Mobile-first. No native Android/iOS APIs required for any feature. No removal of existing features, no full redesign.

Related docs: [`FLOW-STRUCTURE.md`](./FLOW-STRUCTURE.md) · [`architecture.md`](./architecture.md)

---

## Ground Rules (from the brief)

1. Schedly stays a **Progressive Web App**, mobile-first.
2. The **schedule stays the center** of the app — every feature orbits it.
3. **Do not** redesign wholesale, replace architecture, or delete features.
4. Adapt, don't specialize: same core app, personalized per user type.
5. Every feature must work offline where possible, never require native APIs.

---

## Prioritization At a Glance

| # | Improvement | Priority | New DB tables/columns? | Offline? |
|---|---|---|---|---|
| 1 | Multi-Schedule Support | **MVP** | columns on `Schedule` | ✅ |
| 2 | Smart Conflict Detection | **MVP** | none (pure logic) | ✅ |
| 3 | Schedule Insights | **MVP** | none (pure logic) | ✅ |
| 4 | Free Time Analysis | **MVP** | none (pure logic) | ✅ |
| 5 | Calendar Views | **MVP** | none | ✅ |
| 6 | Custom Events | **MVP** | new `Event` table | ✅ (local queue) |
| 7 | Better Dashboard | **MVP** | none (reuses above) | ✅ |
| 8 | Smarter Notifications | V2 | notification types + push keys | ⚠️ (web push offline-free) |
| 9 | Better Schedule Review | **MVP** | none | ✅ |
| 10 | Design Editor | V2 | none | ✅ |
| 11 | Global Search | V2 | none (client + server index) | ⚠️ |
| 12 | Recurring Events | V2 | columns on `Event` | ✅ |
| 13 | Personalization | V2 | `userType` on `User` | ✅ |
| 14 | Gamification | Future | new `Streak`/`Achievement` tables | ✅ |
| — | PWA hardening | **MVP** | none | ✅ (core) |
| — | UI/UX polish | **MVP** | none | ✅ |
| — | Performance | **MVP** | none | ✅ |

---

## MVP Scope (recommended first milestone)

**Theme:** "Everything revolves around the schedule."

1. Multi-Schedule Support (active switch + archive)
2. Smart Conflict Detection
3. Schedule Insights
4. Free Time Analysis
5. Calendar Views (Week / Month / Agenda)
6. Custom Events
7. Better Dashboard
8. Better Schedule Review
9. PWA hardening + UI/UX polish + performance

**V2** then adds: Personalization, Smarter Notifications (web push), Recurring Events, Global Search, Design Editor v2.
**Future:** Gamification.

---

## Improvement 1 — Multi-Schedule Support

### Why it benefits users
Students have semesters; shift workers have morning/night rotations; freelancers have seasonal workloads. A single timeline can't represent "real life." Multiple schedules — with one tap to switch — makes Schedly the one app for all of a person's routines, and instantly surfaces the *relevant* week instead of a merged mess.

### How it fits current architecture
The DB already models multiple schedules: `Schedule` has `title`, `semester`, `academicYear`, `isActive`, and the list page already renders a schedule list. What's missing is the **switching UX**, **archiving**, and making the **active schedule drive the rest of the app** (dashboard, reminders, widget, insights). This is a natural extension, not new architecture.

### Database changes
- Add `Schedule.archived Boolean @default(false)`.
- Add `Schedule.color String?` (distinct card accent per schedule).
- Keep a single `isActive` per user (already the widget/reminder source).

### Frontend changes
- Schedule page: header becomes a **schedule switcher** (chip/picker of all schedules, "Active" badge, archived section).
- List cards get an "Archive" / "Restore" / "Set Active" menu.
- An archived schedule is read-only in `view` phase; a banner prompts "Restore".
- Dashboard, Reminders, Widget, Notifications, Insights all read `activeScheduleId` (derived from `isActive`) — one shared selector/hook.

### Backend changes
- Extend `schedule.service` + actions: `setActiveSchedule`, `archiveSchedule`, `restoreSchedule`.
- `setActiveSchedule` clears other users' schedules' `isActive` in one transaction.
- `getUserSchedules` returns `isActive` + `archived` for the switcher.

### Offline
✅ Fully. The switcher uses already-loaded data; setting active queues via a local pending-actions buffer and syncs when online (see PWA section).

### Priority
**MVP**

---

## Improvement 2 — Smart Conflict Detection

### Why it benefits users
The #1 real pain with any timetable is double-booking. Catching a clash *before saving* (or before a design export) turns a silent data problem into a clear, actionable warning — Schedly earns trust as a "smart" companion.

### How it fits current architecture
`ValidationIssue` already exists in `src/server/services/validation.service.ts` and renders warnings in the review phase (`ScheduleReview`). Conflict detection is a **pure, deterministic function** over `Class[]` — zero new infrastructure, and it reuses the existing warning surface.

### Database changes
None.

### Frontend changes
- New `src/lib/conflicts.ts` with `detectConflicts(classes)` returning typed issues: overlap, duplicate (same subject+time), impossible time (`end <= start`), out-of-range times.
- Review screen: red/amber conflict chips inline on affected rows + a summary banner "3 conflicts detected".
- Save is **allowed but warned** (non-blocking), matching the existing validation UX.

### Backend changes
- `validation.service.ts` gains conflict checks so server-side saving validates the same rules (single source of truth shared by client helper + server service).

### Offline
✅ 100% — pure computation.

### Priority
**MVP**

---

## Improvement 3 — Schedule Insights

### Why it benefits users
People want to *understand* their week at a glance: am I overbooked? Which day is heaviest? Insights make the schedule feel alive and help users make better planning decisions without counting cells themselves.

### How it fits current architecture
All inputs already exist (`Schedule.classes`). Insights are **derived data** — a pure calculation module, consumed by new insight cards on the Dashboard and a dedicated `/schedule` insights strip. No AI needed.

### Database changes
None (computed on demand).

### Frontend changes
- `src/features/insights/` — `computeInsights(classes)` returns: busiest day, lightest day, total weekly hours, free hours, longest class, avg daily workload, weekly utilization %.
- Reusable **InsightCard** component (icon, value, caption, subtle gradient) consistent with theme tokens.
- Dashboard "Today" and Schedule page embed insight cards; an insights section collapses on small screens.

### Backend changes
- Optional: cache last computation on `Schedule` (JSON column) to avoid recompute on every dashboard render — only if profiling shows a need.

### Offline
✅ 100% — computed client-side from already-cached classes.

### Priority
**MVP**

---

## Improvement 4 — Free Time Analysis

### Why it benefits users
"Actually, you have a 2-hour gap every Tuesday" is a genuinely useful, non-obvious insight that helps users book study time, gym time, or side work. It's the kind of "smart" behavior that differentiates Schedly.

### How it fits current architecture
Pure function over `Class[]` (same inputs as Insights). Rule-based, **no AI** — deterministic day-by-day gap analysis. Surfaces inside Insights, Dashboard, and Reminders pages.

### Database changes
None.

### Frontend changes
- `src/features/insights/free-time.ts`: per-day free blocks, recurring free windows (e.g. "Every Tue 1–3 PM"), fully-free days, longest-break-before-next-class.
- Natural-language helper strings + highlight a "Free periods" card on the dashboard.

### Backend changes
None.

### Offline
✅ 100%.

### Priority
**MVP**

---

## Improvement 5 — Calendar Views (Week / Month / Agenda)

### Why it benefits users
A grid timetable is great for classes but poor for deadlines, meetings, and month-scale planning. Week/Month/Agenda views let different users think in different time horizons — without losing the existing timetable.

### How it fits current architecture
The existing `SchedulePreview` grid stays as **"Timetable"** (the default). New views are **new renderers over the same class/event data**, mounted in a view-switcher on `/schedule`. No data model change; events (Improvement 6) plug into the same views.

### Database changes
None (views are pure presentation).

### Frontend changes
- `src/components/calendar/` — `WeekView`, `MonthView`, `AgendaView` (+ a `ViewSwitcher` segmented control).
- Week view = refined timetable with classes + events; Month view = date cells with event dots/items; Agenda = chronological upcoming list.
- View state persisted in `localStorage`.

### Backend changes
None.

### Offline
✅ 100%.

### Priority
**MVP**

---

## Improvement 6 — Custom Events

### Why it benefits users
Students have exams and deadlines; employees have meetings; freelancers have client appointments. Events fill the gap between "classes" and "life" — making the schedule truly personal. This is the biggest single expansion toward a "companion."

### How it fits current architecture
Parallels `Class` but is time-based rather than weekly-grid based. New `Event` model, new `events.service`/repository following the existing layered pattern, new `/events` UI or an "Events" tab. Feeds the same Calendar Views and Dashboard.

### Database changes
New table:

```prisma
model Event {
  id        String   @id @default(uuid())
  userId    String   @map("user_id")
  scheduleId String?  @map("schedule_id")   // optional: tie to a schedule
  title     String
  type      String   @default("event")      // meeting | exam | deadline | birthday | interview | appointment
  location  String?
  notes     String?
  color     String   @default("#3b82f6")
  allDay    Boolean  @default(false)
  startAt   DateTime @map("start_at")
  endAt     DateTime @map("end_at")
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, startAt])
  @@map("events")
}
```

### Frontend changes
- Events CRUD screen (list + create/edit sheet with type picker, color, date/time).
- Events surface on Calendar Views, Dashboard timeline, and Reminders.
- Conflict detection extended to events vs classes.

### Backend changes
- `events.service` (CRUD) + `src/app/api/events/route.ts` (or server actions mirroring the schedule actions pattern).
- Reuse `security.ts` rate limiting + auth checks.

### Offline
✅ Core CRUD queues offline writes (local pending buffer, sync on reconnect). Reads come from the local cache.

### Priority
**MVP** (Events unlock Dashboard, Calendar Views, and Notifications value; consider it the anchor feature.)

---

## Improvement 7 — Better Dashboard

### Why it benefits users
The dashboard is the first screen users see. Turning it into a *smart overview* (what's next, today's plan, what's free) means one glance answers "what's going on today?" — the highest-frequency question.

### How it fits current architecture
Dashboard already shows greeting, next-class countdown, today's timetable, and today's todos. This improvement **composes** existing pieces (insights, free time, events, reminders) into a widget/card layout — reuse over new code. `publishScheduleToWidget` already ties the active schedule to the home-screen widget.

### Database changes
None.

### Frontend changes
- New layout: sticky "Today" hero (date + countdown + next schedule/event) → timeline of today's classes + events → free-time card → today's todos → quick actions (Add class, Add event, Scan new schedule) → insights strip.
- Cards use shared primitives (`Card`, `Badge`) + theme tokens; each widget lazy-loads so the hero paints first.

### Backend changes
- Optional: single aggregate endpoint `GET /api/dashboard` batching schedules+events+todos+notifications to avoid N requests — only if network profiling shows a win.

### Offline
✅ 100% from cached data.

### Priority
**MVP**

---

## Improvement 8 — Smarter Notifications

### Why it benefits users
Proactive nudges ("Class in 30 min", "No events today", "Busy day tomorrow") are the difference between an app you open and an app that helps you. Users stop missing things.

### How it fits current architecture
`Notification` model + `NotificationType` enum exist; the notifications page currently derives cards client-side. Reminders (`Reminder` model, `minutesBefore`, `isActive`) exist but are wired to classes only. This improvement adds **generation logic** (scheduling-aware) + **web push** where supported, extending existing surfaces rather than replacing them.

### Database changes
- Extend `NotificationType` enum: `event_reminder`, `daily_brief`, `free_day`, `busy_day`.
- Add `Notification.sentAt DateTime?` + `Notification.payload Json?`.
- Web push: `User.pushSubscriptions Json?` (or new `PushSubscription` table) storing VAPID subscriptions.

### Frontend changes
- Notifications page gains server-backed list (type icons, filters).
- New push-permission prompt gated behind onboarding/install; subscribe via the existing service worker.

### Backend changes
- `notification.service`: compute "next event"/"busy day"/"free day" digests from the active schedule + events; schedule cron/Vercel Cron job (or `waitUntil` after saves) to materialize `Notification` rows and trigger web push (web-push lib + VAPID envs).
- Respect `Reminder.minutesBefore`.

### Offline
⚠️ **In-app notifications:** ✅ offline (computed locally). **Web push:** needs network; works even when the app is closed on supported browsers.

### Priority
**Version 2** (web push + cron infra is heavier; local in-app alerts can ship earlier as a sliver).

---

## Improvement 9 — Better Schedule Review

### Why it benefits users
Review is the most error-prone screen (AI made mistakes; users must correct them). Faster bulk editing, instant conflict feedback, and undo reduce friction and error — directly improving the core product promise.

### How it fits current architecture
Extends `ScheduleReview` (editable class table) + `validation.service.ts`. Undo/redo and shortcuts are pure frontend state; conflicts reuse Improvement 2. The review already persists to `sessionStorage` — keep that.

### Database changes
None.

### Frontend changes
- **Bulk edit:** select rows (checkboxes) → bulk color, bulk day add/remove, bulk time-shift.
- **Quick color assignment:** color swatch row on each row + drag-to-apply.
- **Undo/redo:** history stack around the editing reducer (shared with the design editor if possible).
- **Keyboard shortcuts** (desktop): `Tab`/arrows between fields, `Space` toggle selection, `Cmd/Ctrl+Z`/`Shift+Cmd+Z` undo/redo, `Cmd/Ctrl+S` save.
- Inline conflict/duplicate chips (from Improvement 2).

### Backend changes
None (validation service already shared).

### Offline
✅ 100%.

### Priority
**MVP**

---

## Improvement 10 — Design Editor

### Why it benefits users
The shareable timetable is how users show off schedules — "professional appearance" matters for printing and sharing to teachers/employers/clients.

### How it fits current architecture
Extends the existing editor (`schedule-design-editor.tsx`) and its `design-state`/sessionStorage pattern. Adds templates/presets as data, not new infra. Export already uses html2canvas-pro.

### Database changes
None (designs stay session-based; optionally persist to Blob later).

### Frontend changes
- **Templates/preset layouts:** 4–6 curated preset layouts (classic, modern-minimal, compact, bold, academia, night) stored as data and applied to the canvas.
- **Typography:** font-pair picker (limited set, loaded via `next/font` to avoid layout shift).
- **More palettes:** extend color presets; gradient accents.
- **Rounded modern cards:** default class-block styling becomes softer; option to toggle sharp corners.
- **Export improvements:** sizing presets (phone wallpaper, A4, social), transparent/theme backgrounds, higher DPI.

### Backend changes
None.

### Offline
✅ 100%.

### Priority
**Version 2**

---

## Improvement 11 — Global Search

### Why it benefits users
Users hunt for "the class in Room 204" or "my Marketing notes." One instant search across schedules, events, todos, notes, teachers, and rooms saves minutes daily and feels premium.

### How it fits current architecture
Schedules/events are server-backed; todos/notes are localStorage. A hybrid index: search server data via a query endpoint + local data in-memory on the client, merged into one ranked result list. Instant client-side for local stores; debounced fetch for server stores.

### Database changes
None (basic `LIKE`/case-insensitive queries are enough at this scale; move to Postgres full-text/pg_trgm only if needed).

### Frontend changes
- Search trigger (top-right magnifier) → full-screen search sheet.
- Result groups: Schedules, Classes, Events, Todos, Notes; highlight matched text; keyboard navigation (desktop).

### Backend changes
- `GET /api/search?q=` — searches user's schedules, classes, events (auth + rate-limited). Todo/notes filtered client-side.

### Offline
⚠️ Server-backed results need network (cached last-index can degrade gracefully); todos/notes search is fully offline.

### Priority
**Version 2**

---

## Improvement 12 — Recurring Events

### Why it benefits users
Weekly classes are the norm, but meetings every 2 weeks or monthly deadlines need recurrence. Without it, users duplicate events or give up. Rule-based expansion (RRULE-lite) keeps it predictable.

### How it fits current architecture
Extends the `Event` model with recurrence fields. A pure expansion function generates occurrences for the visible calendar window — deterministic, offline-friendly, no AI. The timetable/events stay canonical.

### Database changes
On `Event`:

```prisma
recurrence  String?  // "weekly" | "biweekly" | "monthly" | "custom"
interval    Int?     @default(1)
until       DateTime?
daysOfWeek  Int[]?   // for custom/weekly (1=Mon .. 7=Sun)
```

### Frontend changes
- Recurrence picker in the event form (frequency, interval, end).
- Calendar views render expanded occurrences; "edit this occurrence vs all" choice.

### Backend changes
- `events.service` expansion util `src/lib/recurrence.ts` used by both client and server (single source of truth).

### Offline
✅ 100%.

### Priority
**Version 2**

---

## Improvement 13 — Personalization (user type)

### Why it benefits users
A teacher and a freelancer have different vocabulary and priorities. Adapting labels, onboarding, and default reminders (subjects vs meetings vs client appointments) makes Schedly feel built for *you*, not just students — expanding the market without splitting the codebase.

### How it fits current architecture
`User` already has unused profile fields (`school`, `course`, `year`). Adding `userType` and branching the **onboarding** + **label/config layer** keeps one app with adaptive surfaces. No separate apps or routes.

### Database changes
- `User.userType String?` (`student | teacher | employee | freelancer | other`).
- Reuse existing `school/course/year`.

### Frontend changes
- Onboarding Step 1 gains a "Who are you?" picker.
- A `userType` config map drives: default class field labels (subject vs course vs shift), default reminders, quick-action labels, onboarding copy. Settings lets users change it later.
- Only relevant sections appear (e.g., a freelancer isn't pushed "school reminders").

### Backend changes
- `use-auth`/session payload includes `userType`; settings action to update it.

### Offline
✅ 100%.

### Priority
**Version 2** (ties into onboarding rework)

---

## Improvement 14 — Gamification (lightweight)

### Why it benefits users
A small streak/badge system gives light motivation without gamifying everything. Users feel a sense of progress and consistency — but it's optional and non-intrusive.

### How it fits current architecture
New lightweight tables + a `Streaks`/`Achievements` module consumed by a small dashboard card and a settings toggle. No points economy, no levels, no Duolingo-style loops.

### Database changes
```prisma
model UserStreak {
  id          String   @id @default(uuid())
  userId      String   @map("user_id")
  current     Int      @default(0)
  longest     Int      @default(0)
  lastSeen    DateTime? @map("last_seen")
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  @@unique([userId])
}

model Achievement {
  id        String   @id @default(uuid())
  userId    String   @map("user_id")
  key       String            // "first_schedule" | "week_complete" | "streak_3" | "streak_7" ...
  unlockedAt DateTime @default(now()) @map("unlocked_at")
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  @@unique([userId, key])
}
```

### Frontend changes
- Dashboard "Streak" card (flame + day count) + "Recent achievements" row.
- Settings toggle: "Show streaks & achievements" (default on, one tap to hide).
- Toast when an achievement unlocks.

### Backend changes
- `streaks.service`: increment on a daily app use heartbeat; award achievements via simple rules; all idempotent.
- Guard with rate limiting (cheap, abuse-resilient).

### Offline
✅ 100% (heartbeat queues locally, syncs later).

### Priority
**Future Release**

---

## PWA Improvements (cross-cutting)

### Why it benefits users
A PWA that feels native — offline, installable, instant, smooth — removes the last reasons to miss Schedly. Offline support is also the biggest trust signal for students on campus with poor connectivity.

### How it fits current architecture
Schedly is already PWA-capable (manifest, install prompt, service-worker-adjacent `Warmup`, Capacitor shell for Android). This hardening is incremental: better caching, offline shell, install polish, and background sync — all web APIs, no native code.

### Changes
| Area | Change | Offline |
|---|---|---|
| **Offline shell** | App-shell-first caching; offline fallback page ("You're offline — showing saved data"); cached schedule/events/todos/notes render from `localStorage`/`IndexedDB` | ✅ |
| **Data layer** | Local-first store: `IndexedDB` mirror of schedules/events + pending-write queue; sync on `online` event / Background Sync API where supported | ✅ |
| **Background sync** | `sync` event flushes pending writes (new events, streaks) | ⚠️ where supported |
| **Install experience** | Better `beforeinstallprompt` UI; iOS instructions; "Add to Home Screen" already in onboarding — polish it | ✅ |
| **Splash screen** | Manifest `screenshots`/theme-color + branded splash (no native splash needed) | ✅ |
| **Caching** | Strategy: stale-while-revalidate for API JSON; cache-first for static assets; versioned caches | ✅ |
| **Loading & transitions** | Shared route-transition wrapper (subtle fade/slide), skeleton screens everywhere, prefetch main routes | ✅ |
| **Native-feel nav** | Gesture-friendly back, active-press feedback, `ScrollRestoration`, drawer/bottom-nav motion tuned | ✅ |

### Priority
**MVP** (offline shell + local-first data + install polish). Background sync is an enhancement layer.

---

## UI/UX Goals (cross-cutting)

**Principles applied to every screen:** consistent spacing scale, clear hierarchy, theme-token-driven color, tasteful spring/fade motion (150–250ms), large touch targets, WCAG AA contrast, reduced-motion support, `prefers-reduced-motion` respected.

- **Design tokens:** extend the existing theme system with semantic spacing/radius/shadow tokens so new widgets (insight cards, event sheets) look native to Schedly.
- **Empty states:** every section gets a friendly, purposeful empty state (icon + copy + action) — no bare "No items."
- **Loading:** skeletons, not spinners, for layout-aware content.
- **Accessibility:** labeled icon buttons, keyboard navigation on desktop, focus-visible rings, screen-reader-friendly timetables.

### Priority
**MVP** (it's free polish layered on the MVP features)

---

## Performance (cross-cutting)

- Lazy-load the design editor, music player, and month view (dynamic `import`), keeping the dashboard/schedule path lean.
- Keep API calls minimal: batch dashboard reads; debounce search; cache validated AI results (already exists via image hash cache).
- Memoize expensive derived data (insights/free-time/conflict computations) with `useMemo` keyed on the class/event snapshot.
- Audit bundle with `next build` output; keep Lighthouse ≥ 90 across categories.
- Optimize the weekly grid rendering (memo rows; avoid re-render on unrelated state).
- Use the already-present HTML-to-image export lazily.

### Priority
**MVP**

---

## Suggested Rollout Order

1. **MVP milestone:** 1 → 2 → 6 → 3 → 4 → 7 → 9 → 5 (features that compound: schedules + conflicts + events + insights + dashboard). PWA offline shell + UI polish + perf throughout.
2. **Version 2:** 13 (user type) → 12 (recurrence) → 8 (web push notifications) → 11 (search) → 10 (design editor v2).
3. **Future:** 14 (gamification).

---

## Architecture Impact Summary

- **New DB models:** `Event` (MVP), `PushSubscription` (V2), `UserStreak` + `Achievement` (Future).
- **New columns:** `Schedule.archived`, `Schedule.color`, `User.userType`, `Event.recurrence*`, `Notification.sentAt/payload`, enum extensions.
- **New pure-logic modules:** `src/lib/conflicts.ts`, `src/features/insights/`, `src/lib/recurrence.ts`, `src/features/calendar/`.
- **New services:** `events.service`, `notification.service` (materialized digests), `streaks.service`.
- **New endpoints:** `/api/events`, `/api/search`, optional `/api/dashboard`, push subscribe/unsubscribe.
- **Frontend:** schedule switcher, calendar views, dashboard widget grid, events sheets, review bulk-edit, search sheet, onboarding user-type step.
- **Infra:** VAPID keys for web push; optional Vercel Cron for digest generation.

Nothing in this plan requires native Android/iOS APIs — every feature is PWA/web-safe and schedule-centric, preserving Schedly's identity as an AI-powered smart schedule companion.
