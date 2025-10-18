# Infra & Deployment

## Local development

1. Copy `.env.example` to `.env` in the repo root and adjust secrets.
2. Start Postgres: `docker compose -f infra/docker-compose.yml up -d`.
3. Run Prisma migrations: `pnpm prisma migrate dev --schema packages/db/prisma/schema.prisma`.
4. Launch the web app: `pnpm dev` and open http://localhost:3000.

## Deploying to Vercel

- Connect the repo and set environment variables (`DATABASE_URL`, `NEXTAUTH_SECRET`, `BASE_URL`).
- Add a Neon or Supabase connection string for Postgres.
- Configure `pnpm install` and `pnpm build` as the build command.
- Enable `Serverless` target; the ICS route uses HTTP caching to stay within the free tier.

## Deploying to Cloudflare Pages/Workers

- Use `wrangler.toml` (not included) to map environment variables.
- Build with `pnpm build` and deploy the `.next` output using Next-on-Pages.
- Ensure the calendar route is cached at the edge for 300 seconds to prevent hammering the database.

## Subscribing to the calendar

1. Open the dashboard calendar page at `/calendar`.
2. Copy the `webcal://` link using the copy button.
3. Paste into your calendar app (Google Calendar: Other Calendars → From URL; Apple Calendar: File → New Calendar Subscription).
4. Calendar apps will poll every few hours; the 48-hour reminder is delivered via `VALARM` in the ICS feed—no email service required.
