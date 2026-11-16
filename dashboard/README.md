# Centring dashboard

Centring's nonprofit funding workspace: grant opportunities, application drafts, document review, team tasks, calendar, and Beedy assistance.

[Open dashboard](https://centring-dashboard-demo.loftyninja.chatgpt.site/)

## Run locally

Use Node.js 24. From the repository root:

```sh
cd dashboard
npm ci
npm test
npm run build
npm run dev
```

Open http://127.0.0.1:7788. Rebuild and restart after code changes. The local preview injects a development identity and must remain bound to localhost.

For AI and voice, copy `.env.example` to `.env.local` and configure your own server credentials. To load that file explicitly:

```sh
node --env-file=.env.local scripts/dev.mjs
```

Never commit credentials. Existing live secrets stay in the hosting runtime; cloning this repository does not copy them. Beedy's configured voice is fixed in the voice implementation; there is no end-user voice selector.

## Edit

- `web/`: interface, fonts, artwork, document tools, and bundled browser libraries.
- `worker/`: authenticated API routes, grant retrieval, AI drafting, voice, organisation context, and saved knowledge.
- `db/` and `drizzle/`: schema and database migrations.
- `tests/`: automated tests and synthetic document fixtures.
- `scripts/`: build and localhost preview.
- `docs/`: feature notes and deployment/data guide.

The chat layout is in `web/workspace-layout.css`, loaded after the other styles. Verify document editing with chat open at desktop, tablet, and phone widths when changing layout.

## Deploy

See [deployment and data](docs/DEPLOYMENT-AND-DATA.md). GitHub Actions tests and builds dashboard changes and keeps a downloadable Worker artifact for 14 days. It **does not publish** the live site. Publish a reviewed commit through the existing Sites project and record the release commit, version, and rollback target.

This dashboard is separate from the marketing website on the `staging` branch. Do not deploy it to the marketing project's identity.

## Data and current limits

Uploaded originals and drafts currently live in browser IndexedDB. Most workspace records live in localStorage. Confirmed organisation/project answers also use server D1 storage. GitHub preserves source code, not these records. Download important documents before clearing browser data. Shared cloud documents, membership controls, and workspace-wide synchronisation require a separate data migration.

The source includes sample records and illustrative assets. It does not submit applications or send team messages. External plugin availability depends on its implemented backend and account configuration.

## Source provenance

Initial GitHub snapshot: live dashboard v41, Sites source commit `94b02e0a3942ee270af5bc8bcb7119521a4a0a00`.
Only tracked source was imported; local secrets, runtime databases, user uploads, installed dependencies, and generated builds were excluded. GitHub-specific documentation and CI were added separately.
