# Security Notes

- **Private ICS feeds**: Calendar links use an opaque token stored in `Settings.calendarToken`. Treat it as a bearer credential. Rotate tokens via the `/api/subscriptions/demo` rotation endpoint or the dashboard UI.
- **Token rotation**: Rotation updates the token and invalidates any cached feed within five minutes thanks to the ICS cache headers (`Cache-Control` and `ETag`). Notify users to resubscribe when rotated.
- **Rate limits**: Deploy behind a proxy (Vercel Edge, Cloudflare) with 60 RPM limits for calendar endpoints. Combined with caching, this prevents free-tier abuse from aggressive calendar clients.
- **Data isolation**: Each user owns their own calendar token; avoid sharing tokens between environments. For staging, use separate Postgres schemas or projects.
- **Secrets management**: Store `DATABASE_URL` and `NEXTAUTH_SECRET` using Vercel/Cloudflare secret managers. Never commit actual secrets.
