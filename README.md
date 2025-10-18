# Subsentinel Monorepo

Subsentinel tracks your recurring subscriptions and emits calendar-only reminders so you can stay on free-tier infra.

## Packages

- `apps/web`: Next.js 15 dashboard using the App Router, Tailwind CSS, shadcn-inspired UI primitives, TanStack Query, and Valibot.
- `packages/db`: Prisma schema and client.
- `packages/ui`: Shared component library (currently only `Button`).
- `adapters/*`: Integration points for Postgres, FX, and key-value caches.
- `infra/`: Local Docker Compose, deployment notes, and security guidance.

## Getting Started

```bash
pnpm install
pnpm dev
```

The first run seeds a demo user (`demo@subsentinel.app`). Create subscriptions from `/subscriptions/new` and subscribe to your calendar feed at `/calendar`.

## Tests

- `pnpm test:unit` runs Vitest for time math and ICS generation.
- `pnpm test:e2e` runs Playwright smoke tests that add a subscription and verify calendar token rotation.
