# Centring application

[Open the application](https://centring-dashboard-demo.loftyninja.chatgpt.site/) · [Source repository](https://github.com/Bhola-Rice/centring-website/tree/main/dashboard) · [Deployment and data guide](docs/DEPLOYMENT-AND-DATA.md)

This folder contains the nonprofit workspace: opportunities, applications, documents, Beedy chat and voice, tasks, discussions, calendar, reports, and profile settings. It is separate from the marketing website.

## Run locally

Use Node.js 24 or newer. From this directory:

```sh
npm ci
npm test
npm run build
npm run dev
```

Open http://127.0.0.1:7788. Local development uses a local database and file store under `.sites-runtime/`, with a development identity. It does not load the live team's records. Never expose this development server publicly.

Copy `.env.example` to `.env.local` and supply your own development credentials only if testing provider-backed features. See [Beedy setup](docs/BEEDY-AGENT.md). Secrets and customer files must never enter Git.

## Code map

- `web/`: browser UI, document rendering/editing, chat, voice controls, cloud sync and assets.
- `worker/`: authenticated API handlers, AI tools, grants retrieval, voice, document and workspace storage.
- `db/` and `drizzle/`: database schema and migrations.
- `scripts/`: build and development server, local database and object-storage adapters.
- `tests/`: application, authentication, storage, drafting, formatting and audio lifecycle checks.
- `.openai/hosting.json`: existing Sites project and DB/BUCKET bindings.
- `docs/`: feature behavior, limits, and deployment instructions.

## Shared work

Documents and workspace records sync to the signed-in account. In the hosted application, click the cloud status in the header to import work previously stored in your browser, refresh team changes, or download a backup. Original files remain separate from edited drafts. Same-record conflicts retain local changes for recovery rather than overwriting a teammate's version.

Everyone using the current shared workspace login sees the same cloud records. Personal avatar/settings and Beedy conversation history remain browser-local. Individual member invitations, role permissions, and real-time co-editing are not implemented. A merge to GitHub does not itself publish the application; follow the deployment guide.

Old feature documents may describe their original browser-only behavior. This README and the deployment/data guide describe the current persistence model.

### Funding research in the demo

Every authenticated demo account receives the same public Upbring profile and read-only funding library. Personal project memory and documents continue to use their existing account storage. The library has its own table in the dashboard database. Find grants searches the imported Pharos and Arachne opportunities. The workspace calendar uses saved grant deadlines, application milestones, reports and team tasks. Upbring’s planning inventory is background material.

After applying the dashboard migrations, refresh the local library with a source snapshot:

```sh
python3 scripts/import-funding.py pharos /private/path/to/pharos.db
python3 scripts/import-funding.py arachne /private/path/to/grants.db
```

Each command replaces only that source in one transaction. The input databases are opened read-only. Supply --database to select a migrated SQLite destination. Hosted environments require the same migration and a private data import into their bound database. Keep source snapshots, calendar data and any board materials outside Git and static web assets.
