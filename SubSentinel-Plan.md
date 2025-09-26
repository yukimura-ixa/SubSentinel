# SubSentinel Product & Engineering Plan

## 1) Competitive Scan (brief)
- **Current alternatives**: Bank and card SMS/email alerts (coarse, often late); manual spreadsheets or Notion templates; general budgeting apps (YNAB, Copilot, Mint alumni) that focus on spend categories, not renewal timing; calendar reminders users create manually.
- **Risks**: Violating third-party ToS when sourcing data (must stay manual/OAuth only). Sharing calendar feeds could leak spend data if webcal URLs are exposed; ensure long tokens + rotation. Calendars may sync infrequently; communicate expected latency and validate ICS security headers.

## 2) Solution Concepts (Brainstorm)
| Idea | Value | Effort | Risk |
| --- | --- | --- | --- |
| Manual tracker with smart predictions (recurrence templates, churn prompts). | High clarity into renewals without external APIs. | Medium (recurrence math + UX). | Low (no external dependencies). |
| **Private ICS/webcal feed per user** with token (no auth prompts). | High—auto notifications in native calendar. | Medium (ics generator, token mgmt). | Medium (URL leakage, calendar cache variance). |
| “Add to Calendar” one-click buttons (Google/Outlook/iCal) per subscription. | Medium—users can cherry-pick events. | Low (generate single ICS files). | Low. |
| Optional **Google Calendar API** push (OAuth) as later phase. | High convenience for Google-heavy users. | High (OAuth consent, quota). | Medium (scope review, compliance). |
| Calendar **VALARM −PT48H** for reminders; snooze by shifting dates. | High direct impact on surprise reductions. | Medium (per-user settings, ICS regeneration). | Low. |
| Free-tier deployment variant (no monthly infra cost). | Necessary to stay hobby-budget friendly. | Low (Vercel/Supabase config). | Low. |
| Lightweight retention nudges (badge showing days since last review). | Medium—drives dashboard visits toward 60% retention. | Low. | Low. |
| FX auto-conversion using ECB or exchangerate.host (cached). | Medium for multi-currency clarity. | Medium. | Medium (rate limits, accuracy). |

## 3) Chosen MVP (why this, not others)
- **Manual tracker + ICS feed notifications + dashboard** align directly with the problem statement and success metrics, require no ToS-risky integrations, and fit free-tier hosting.
- Deferred: Google Calendar push (OAuth) and FX automation add complexity and compliance needs without blocking core value.

### Scope Table
| Must-have | Nice-to-have | Stretch |
| --- | --- | --- |
| Subscription CRUD with validation, dashboard summary, per-user ICS feed with −48h VALARM, spend aggregation, manual currency entry, settings for timezone/currency, ICS token rotate, analytics for retention metric, basic auth. | Multi-currency display with cached FX, dashboard filters (by category), “Add to Calendar” one-offs, warning badges for missing data, data export (CSV). | Google Calendar push, Patreon API integration (if feasible), CalDAV endpoint, snooze/reschedule flows, retention nudges automation.

## 4) UX Spec (lean but explicit)
- **Add/Edit Subscription Flow**: Modal or dedicated page from dashboard. Fields—service (autocomplete list + free text), price (decimal), currency (ISO 4217 select, default from settings), billing cycle (enum: monthly/annual/custom interval), next charge date (date picker), notes (optional). Valibot enforces required fields, positive amounts, future dates, cycle validity. On save, optimistic update via TanStack Query; error toast if validation fails.
- **Dashboard**: Above-the-fold cards—Total monthly spend (convert using default currency, mark `Assumption: use manual rate until FX feature`), next 30-day upcoming charges list (sorted ascending), warning badges for expired next date or missing price, retention tracker (“Last reviewed X days ago”). Provide quick actions to edit/duplicate subscriptions.
- **Calendar Page**: Explain subscription process for Google/Apple/Outlook; display `webcal://` link with copy button and regenerate token CTA (with confirmation). Provide test event preview (next upcoming event details) and note sync frequency expectations.
- **Settings**: Fields for default currency (default THB), timezone (Asia/Bangkok default), alarm lead time (48h default, slider 24–168h), rotate ICS token button, data export (CSV) and delete account controls. Apply Valibot validation and require re-auth for destructive actions.
- **Accessibility**: Keyboard navigable modals, focus rings, color palette meeting 4.5:1 contrast, prefers-reduced-motion media query to disable heavy transitions, aria-live for toast notifications.

## 5) Architecture (Next.js 15, Valibot, free-first)
- **Frontend + API**: Next.js 15 App Router with TypeScript, Tailwind, shadcn/ui components, TanStack Query for client caching, server actions validated with Valibot. RLS-friendly data access via Supabase client or direct Postgres driver using pooled connection string.
- **Notifications (Calendar only)**: `GET /calendar/{publicToken}.ics` server route generates ICS on demand from projections. URL includes 128-bit random token stored per user; support `webcal://` scheme mapping. Each `VEVENT` includes `VALARM` with `TRIGGER:-PT{leadHours}H` defaulting to 48. Document calendar cache caveats.
- **Data**: Supabase (Postgres 15) Free tier preferred; alternative Neon. Tables `users`, `subscriptions`, `events_projection`, `settings`. Use Supabase SQL migrations (or Drizzle). `events_projection` stores next occurrence and hash to reduce recomputation.
- **Auth**: Auth.js with magic-link email (Supabase Auth or Resend? but non-goal to send email? Need magic link -> `Assumption: Supabase Auth email magic links acceptable on free tier`). Minimal scopes stored for future Google Calendar integration.
- **Background Jobs**: None required. Optional Cloudflare Cron (free) hitting `/api/projections/refresh` nightly to warm caches.
- **Cache/KV**: Upstash Redis free tier (rate limiting) or Cloudflare KV for ICS ETag caching and FX rates. Ensure idempotent operations.
- **Security**: Enable RLS per user; ICS token rotation invalidates previous tokens. Rate-limit POST/PATCH/DELETE. Avoid storing third-party credentials; log access for auditing. Use HTTPS-only cookies, Content Security Policy tightened.

## 6) APIs (TypeScript + Valibot)
```ts
// envelopes
interface ApiSuccess<T> { success: true; data: T; }
interface ApiError { success: false; error: { code: string; message: string; details?: unknown }; }

// Valibot schemas
import { object, string, number, enumType, date, optional, union, literal, minValue, maxLength } from 'valibot';

const CycleEnum = enumType(['monthly', 'yearly', 'custom']);
const subscriptionInputSchema = object({
  service: string([maxLength(120)]),
  amount: number([minValue(0.01)]),
  currency: string([maxLength(3)]),
  cycle: CycleEnum,
  interval_count: optional(number([minValue(1)])),
  next_charge_date: string(), // ISO date
  notes: optional(string([maxLength(500)])),
});
const subscriptionIdParam = string();

// Routes
// POST /api/subscriptions
// body: subscriptionInputSchema
// returns ApiSuccess<{ subscription: Subscription }>
// GET /api/subscriptions
// returns ApiSuccess<{ subscriptions: Subscription[] }>
// PATCH /api/subscriptions/:id
// body: partial subscriptionInputSchema (Valibot partial)
// DELETE /api/subscriptions/:id
// returns ApiSuccess<{ id: string }>

// GET /calendar/{token}.ics
// headers: Cache-Control: no-store, ETag per generation
// returns text/calendar payload generated from validated projections
```

_Type Definitions_
```ts
interface Subscription {
  id: string;
  userId: string;
  service: string;
  amount: number;
  currency: string;
  cycle: 'monthly' | 'yearly' | 'custom';
  intervalCount?: number;
  nextChargeDate: string; // ISO date
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

interface Settings {
  userId: string;
  timezone: string;
  defaultCurrency: string;
  defaultAlarmHours: number;
}
```

## 7) Data Model (ERD sketch)
- **User**(`id` PK, `email` unique, `tz`, `currency`, `ics_token`, `created_at`)
- **Subscription**(`id` PK, `user_id` FK→User, `service`, `amount`, `currency`, `cycle`, `interval_count`, `next_charge_date`, `notes`, timestamps)
- **Settings**(`user_id` PK/FK, `default_alarm_hours`, `fx_source`, `created_at`, `updated_at`)
- **EventsProjection**(`subscription_id` PK/FK, `next_occurrence`, `last_emitted_hash`, `updated_at`)

## 8) DevOps & Delivery (free tiers)
- **Host**: Primary Vercel Hobby (Next.js, serverless functions). Alternate: Cloudflare Pages + Workers if cold start issues.
- **Database**: Supabase Free tier (includes Auth + Postgres). Maintain SQL migrations in repo.
- **CI/CD**: GitHub Actions running `pnpm lint`, `pnpm test`, `pnpm typecheck`, Playwright smoke on main routes.
- **Env Mgmt**: `.env.example` for Supabase keys, auth secrets, ICS base URL. Use Vercel env secrets sync.
- **Observability**: Lightweight logging via Vercel, Supabase logs. `/api/health` returns service + DB connectivity. Use Sentry (free) optionally.

## 9) Test Plan & Acceptance Criteria
- **ICS reminder accuracy**: Given a subscription in Asia/Bangkok, when user subscribes to `webcal://…`, then ICS shows events with `VALARM:-PT48H` and correct local times.
- **Recurring logic**: Given February→March transitions or 31-day gaps, then monthly cycles compute next charge correctly (use date-fns `addMonths` with same-day fallback).
- **Token rotation**: Given user rotates ICS token, then previous link returns 404 within next request; new link immediately valid.
- **CRUD propagation**: Given add/edit/delete subscription, then ICS feed reflects changes on next fetch (Cache-Control: max-age=300, ETag mismatch forces refresh).
- **Retention metric**: Given user views dashboard weekly, retention tracker counts them toward 4-week rolling metric.

## 10) Roadmap (small-first)
- **Week 1**: Set up repo, schema migrations, Auth, subscription CRUD API/UI, baseline ICS endpoint.
- **Week 2**: Dashboard UI with spend summary, ICS token rotation, analytics instrumentation for retention metric.
- **Week 3**: Optional FX display (cached), performance polish (TanStack Query caching), Playwright e2e.
- **Week 4**: Research Patreon patron APIs, spike Google Calendar push feasibility, document learnings.

## 11) README Skeleton
```
# SubSentinel

## Overview
Brief on problem + solution (manual tracking + calendar alerts).

## Getting Started
- Requirements: Node 20+, pnpm.
- Clone & install: `pnpm install`.
- Copy `.env.example` → `.env.local` and fill Supabase, Auth secrets, ICS base URL.
- Run dev: `pnpm dev`.

## Database
- Supabase setup steps.
- Running migrations.

## Calendar Notifications
- How to find personal `webcal://` link.
- Supported clients (Google, Apple, Outlook).
- Steps to subscribe and expected sync timings.

## Deployment
- Vercel Hobby deployment instructions.
- Environment variables on Vercel.

## Testing
- Commands for lint, test, typecheck, Playwright smoke.

## Demo Checklist
- GIF capturing add subscription, dashboard update, calendar subscription.

## Contributing
- Coding standards (Valibot validation, TypeScript strict).
- Issue templates placeholder.
```

## Unknowns
- Are Patreon or other consumer-facing APIs accessible for patrons without scraping? Need research.
- Will users accept manual entry vs OAuth-based import? Validate via user interviews or landing page survey.
- FX rate accuracy for multi-currency—identify acceptable free provider (Assumption: ECB daily rates viable).

