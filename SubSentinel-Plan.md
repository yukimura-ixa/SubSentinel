# SubSentinel Product & Engineering Plan

## Table of Contents
1. [Market Context & Risks](#1-market-context--risks)
2. [Solution Concepts](#2-solution-concepts)
3. [Chosen MVP](#3-chosen-mvp)
4. [User Experience Spec](#4-user-experience-spec)
5. [Architecture](#5-architecture)
6. [APIs](#6-apis)
7. [Data Model](#7-data-model)
8. [DevOps & Delivery](#8-devops--delivery)
9. [Test Plan & Acceptance Criteria](#9-test-plan--acceptance-criteria)
10. [Roadmap](#10-roadmap)
11. [README Skeleton](#11-readme-skeleton)
12. [Unknowns](#12-unknowns)

---

## 1. Market Context & Risks
### Current Alternatives
- Bank and card SMS/email alerts (coarse, often late).
- Manual spreadsheets or Notion templates.
- General budgeting apps (YNAB, Copilot, Mint alumni) that prioritize category budgets, not renewal timing.
- Calendar reminders created manually by users.

### Key Risks
- Violating third-party terms of service when sourcing data (stay manual or OAuth only).
- Exposed calendar feeds could leak spending data; enforce long-lived tokens and rotation.
- Calendar clients may sync infrequently; communicate expected latency and validate ICS security headers.

## 2. Solution Concepts
| Idea | Value | Effort | Risk |
| --- | --- | --- | --- |
| Manual tracker with smart predictions (recurrence templates, churn prompts). | High clarity into renewals without external APIs. | Medium (recurrence math + UX). | Low (no external dependencies). |
| **Private ICS/webcal feed per user** with token (no auth prompts). | High—auto notifications in native calendar. | Medium (ICS generator, token management). | Medium (URL leakage, calendar cache variance). |
| "Add to Calendar" one-click buttons (Google/Outlook/iCal) per subscription. | Medium—users can cherry-pick events. | Low (generate single ICS files). | Low. |
| Optional **Google Calendar API** push (OAuth) as later phase. | High convenience for Google-heavy users. | High (OAuth consent, quota). | Medium (scope review, compliance). |
| Calendar **VALARM −PT48H** for reminders; snooze by shifting dates. | High direct impact on surprise reductions. | Medium (per-user settings, ICS regeneration). | Low. |
| Free-tier deployment variant (no monthly infra cost). | Necessary to stay hobby-budget friendly. | Low (Vercel/Supabase config). | Low. |
| Lightweight retention nudges (badge showing days since last review). | Medium—drives dashboard visits toward 60% retention. | Low. | Low. |
| FX auto-conversion using ECB or exchangerate.host (cached). | Medium for multi-currency clarity. | Medium. | Medium (rate limits, accuracy). |

## 3. Chosen MVP
### Focus Areas
- Manual tracker + ICS feed notifications + dashboard align with problem statement and success metrics.
- Approach avoids risky integrations and fits free-tier hosting constraints.

### Deferred Items
- Google Calendar push (OAuth) and FX automation: higher complexity and compliance needs with limited incremental value for initial release.

### Scope Table
| Must-have | Nice-to-have | Stretch |
| --- | --- | --- |
| Subscription CRUD with validation, dashboard summary, per-user ICS feed with −48h VALARM, spend aggregation, manual currency entry, settings for timezone/currency, ICS token rotation, retention analytics, basic auth. | Multi-currency display with cached FX, dashboard filters (by category), "Add to Calendar" one-offs, warning badges for missing data, data export (CSV). | Google Calendar push, Patreon API integration (if feasible), CalDAV endpoint, snooze/reschedule flows, retention nudges automation. |

## 4. User Experience Spec
### Add/Edit Subscription Flow
- Triggered via dashboard modal or dedicated page.
- Fields: service (autocomplete + free text), price (decimal), currency (ISO 4217 select, default from settings), billing cycle (monthly/annual/custom interval), next charge date (date picker), notes (optional).
- Valibot enforces required fields, positive amounts, future dates, and valid cycles.
- Saving performs optimistic update via TanStack Query; show error toast on validation failure.

### Dashboard
- Above-the-fold cards: total monthly spend (convert using default currency; assumption: manual rate until FX feature), next 30-day upcoming charges (ascending), warning badges for expired next date or missing price, retention tracker (“Last reviewed X days ago”).
- Provide quick actions to edit or duplicate subscriptions.

### Calendar Page
- Explain subscription steps for Google/Apple/Outlook.
- Display `webcal://` link with copy button and regenerate-token CTA (with confirmation).
- Offer test event preview (next upcoming event details) and note sync-frequency expectations.

### Settings
- Default currency (default THB), timezone (Asia/Bangkok), alarm lead time (48h default, slider 24–168h).
- Rotate ICS token button, data export (CSV), and delete-account controls.
- Valibot validation required; destructive actions require re-auth.

### Accessibility
- Keyboard navigable modals, visible focus rings, color palette meeting 4.5:1 contrast.
- Respect `prefers-reduced-motion`; use `aria-live` for toast notifications.

## 5. Architecture
SubSentinel adopts a hexagonal (ports-and-adapters) architecture within a Next.js 15 codebase to isolate business rules from delivery and infrastructure concerns.

### Domain Core
- Pure TypeScript modules encapsulate subscription aggregates, billing cycle calculators, valuation utilities, and alarm lead-time policies.
- Domain services expose interfaces such as `SubscriptionService`, `CalendarFeedService`, and `RetentionAnalyticsService`; these define ports used by the application layer.
- Validation schemas (Valibot) live alongside domain models to keep constraints consistent across adapters.

### Application Layer
- Use cases (command/query handlers) orchestrate domain operations; examples: `CreateSubscriptionCommand`, `RotateIcsTokenCommand`, `ListUpcomingRenewalsQuery`.
- Handlers depend only on domain interfaces and ports, returning DTOs consumed by delivery adapters (API routes, server actions).
- TanStack Query hooks call application services through a narrow facade that maps React query keys to handlers.

### Adapter Layer
- **Inbound**: Next.js server actions, RESTful API routes, and React components adapt HTTP/UI events into command/query payloads before invoking the application layer.
- **Outbound**: Infrastructure adapters implement domain ports—examples include `SupabaseSubscriptionRepository`, `SupabaseSettingsRepository`, `IcsCalendarGenerator`, and `UpstashRateLimiter`.
- Dependency-injection factories provide per-request configuration, keeping adapters stateless and testable.

### Notifications (Calendar)
- `GET /calendar/{publicToken}.ics` server route resolves via inbound adapter, loads domain projections, and delegates to `IcsCalendarGenerator` adapter.
- URLs include 128-bit random tokens stored per user; support `webcal://` mapping.
- Each `VEVENT` includes `VALARM` with `TRIGGER:-PT{leadHours}H` (default 48). Document calendar cache caveats.

### Data & Storage
- Supabase (Postgres 15) free tier preferred; Neon as fallback.
- Tables: `users`, `subscriptions`, `events_projection`, `settings`.
- Supabase SQL migrations (or Drizzle) managed in repo; `events_projection` stores next occurrence and hash to reduce recomputation.
- Repository adapters encapsulate Supabase queries, providing in-memory implementations for tests.

### Authentication & Authorization
- Supabase Auth with email-based magic links.
- Adapter validates tokens and maps Supabase user IDs to domain identities.
- Store minimal scopes to enable future Google Calendar integration.

### Background Jobs & Caching
- Optional Cloudflare Cron triggers `/api/projections/refresh` nightly to warm caches through application-layer batch handler.
- Upstash Redis (rate limiting) or Cloudflare KV for ICS ETag caching and FX rates.
- Adapters satisfy domain caching interfaces to remain swappable.

### Security Posture
- Enable row-level security (RLS) per user; ICS token rotation invalidates previous tokens.
- Rate-limit POST/PATCH/DELETE endpoints.
- Avoid storing third-party credentials; log access for auditing.
- Enforce HTTPS-only cookies, strict Content Security Policy, and adapter-level guardrails (e.g., consistent audit logging port).

## 6. APIs
```ts
// Envelopes
interface ApiSuccess<T> { success: true; data: T; }
interface ApiError { success: false; error: { code: string; message: string; details?: unknown }; }

// Valibot schemas
import { object, string, number, enumType, date, optional, union, literal, minValue, maxLength } from 'valibot';

const CycleEnum = enumType(['monthly', 'yearly', 'custom']);
const subscriptionInputSchema = object({
  service: string([maxLength(120)]),
  amount: number([minValue(0.01)]),
  currency: string([maxLength(3)]),
  // ...
});

// POST /api/subscriptions
// body: subscriptionInputSchema
// returns ApiSuccess<Subscription>

// PATCH /api/subscriptions/:id
// body: partial subscriptionInputSchema (Valibot partial)
// returns ApiSuccess<Subscription>

// DELETE /api/subscriptions/:id
// returns ApiSuccess<{ id: string }>

// GET /calendar/{token}.ics
// headers: Cache-Control: no-store, ETag per generation
// returns text/calendar payload generated from validated projections
```

```ts
// Types
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

## 7. Data Model
- **User** (`id` PK, `email` unique, `tz`, `currency`, `ics_token`, `created_at`).
- **Subscription** (`id` PK, `user_id` FK→User, `service`, `amount`, `currency`, `cycle`, `interval_count`, `next_charge_date`, `notes`, timestamps).
- **Settings** (`user_id` PK/FK, `default_alarm_hours`, `fx_source`, `created_at`, `updated_at`).
- **EventsProjection** (`subscription_id` PK/FK, `next_occurrence`, `last_emitted_hash`, `updated_at`).

## 8. DevOps & Delivery
### Delivery Practices
- Backlog grooming with user stories and technical tasks (Linear or GitHub Projects); link each item to domain ports to reinforce hexagonal decisions.
- Weekly iteration goals with mid-week validation demos; close iterations with domain architecture review to catch adapter creep or accidental coupling.
- Require one reviewer per PR, focusing on port/adapter boundaries and unit coverage for domain services.

### Platform & Tooling
- **Host**: Vercel Hobby (Next.js, serverless functions). Alternate: Cloudflare Pages + Workers if cold starts matter.
- **Database**: Supabase Free tier (Auth + Postgres). Maintain SQL migrations in repo; automate via `pnpm supabase db push` in CI.
- **CI/CD**: GitHub Actions running `pnpm lint`, `pnpm test`, `pnpm typecheck`, and Playwright smoke tests for main routes. Add `pnpm test:domain` job to keep hexagonal core fast.
- **Environment Management**: `.env.example` for Supabase keys, auth secrets, ICS base URL. Use Vercel env secrets sync. Introduce `config/application.ts` to map env vars into typed config consumed by dependency factories.
- **Observability**: Lightweight logging via Vercel and Supabase logs. `/api/health` returns service + DB connectivity. Optionally instrument domain events with Sentry breadcrumbs and structured logs emitted through an outbound `AuditLogger` port.

## 9. Test Plan & Acceptance Criteria
- **ICS reminder accuracy**: Given a subscription in Asia/Bangkok, when a user subscribes to `webcal://…`, ICS shows events with `VALARM:-PT48H` and correct local times.
- **Recurring logic**: February→March transitions or 31-day gaps maintain correct monthly cycles (use `date-fns` `addMonths` with same-day fallback).
- **Token rotation**: Rotating ICS token invalidates previous link (404 on next request) while new link works immediately.
- **CRUD propagation**: Add/edit/delete subscription actions reflect in ICS feed on next fetch (`Cache-Control: max-age=300`, ETag mismatch forces refresh).
- **Retention metric**: Dashboard views counted toward 4-week rolling retention metric when users visit weekly.

## 10. Roadmap
| Week | Focus | Key Deliverables |
| --- | --- | --- |
| Week 1 | Foundations | Project scaffolding, hexagonal directory layout (`/domain`, `/application`, `/inbound`, `/outbound`), initial domain models and Valibot schemas, Supabase migrations, subscription repository adapter, CRUD commands exposed via server actions with smoke tests. |
| Week 2 | Experience + ICS | Dashboard UI backed by `ListUpcomingRenewalsQuery`, full ICS generation flow, token rotation command, domain unit tests, and repository contract tests. |
| Week 3 | Enhancements | Optional FX display via outbound rate adapter, caching strategy (ETag + Upstash), optimized TanStack Query invalidation, Playwright end-to-end scenarios covering CRUD-to-ICS propagation. |
| Week 4 | Integrations & Polish | Integration spikes (Patreon API feasibility, Google Calendar push boundaries), adapter performance measurement, onboarding docs emphasizing hexagonal best practices. |

## 11. README Skeleton
```markdown
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

## 12. Unknowns
- Accessibility of Patreon or other consumer-facing APIs for patrons without scraping—requires research.
- User appetite for manual entry vs OAuth-based import—validate via interviews or landing page survey.
- FX rate accuracy for multi-currency; identify acceptable free provider (assumption: ECB daily rates viable).
