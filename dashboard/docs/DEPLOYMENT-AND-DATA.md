# Source, deployments, and saved data

## Current source and deployment

The dashboard is separate from the marketing site. Its Sites project is
`appgprj_6af2758b377c81919295eacece5cab1c` and it is published at
https://centring-dashboard-demo.loftyninja.chatgpt.site/.

The working checkout is `work/centring-dashboard` in this Codex workspace.
Sites keeps a remote Git source history plus versioned deployment archives.
The supported Sites source workflow commits and pushes the exact source before
publishing. This checkout has no permanent GitHub remote configured.

## What is stored where

- Code, bundled fonts/images, schemas and build instructions: Git source and Sites deployment versions.
- Uploaded originals, document text, drafts and review state: browser IndexedDB (`centring-documents`). These are not a cloud document backup.
- Tasks, application records, saved opportunities, discussions and other workspace state: browser localStorage (`centring-demo-v1`).
- Confirmed project and organisation answers: server D1 table `nonprofit_knowledge`, scoped by the authenticated account. The base Committee for Children profile is defined in server source.
- Provider API keys and authentication secrets: hosting runtime configuration; local development values are ignored `.env` files. Never commit these to GitHub.

Clearing browser data or changing browser/device can lose access to browser-only records. A source backup cannot restore those records. Download important original and edited documents from Documents now. The current discussion/workspace is not a fully synced multi-user database.

## GitHub source and deployment workflow

The public repository is https://github.com/Bhola-Rice/centring-website.
Dashboard source lives under `dashboard/` on `main` after the initial pull request
is merged. The existing marketing handoff remains on `staging`.

1. Pull current `main`, create a focused branch, and edit `dashboard/`.
2. Run `npm ci`, `npm test`, and `npm run build` inside that folder.
3. Push the branch and open a pull request. Dashboard CI runs on relevant changes
   and retains a downloadable build artifact for 14 days.
4. Merge reviewed changes to `main`. Publish that source through the existing
   Sites workflow, preserving the project ID above and its runtime configuration.
5. Record the GitHub commit, Sites source commit, published version and previous
   working version in release notes. Keep the prior version for rollback.

GitHub pushes and merges do not automatically publish to Sites. The artifact is
a build output, not a database or secrets backup. Hosting access is required to
publish; contributors do not get production credentials by cloning the repository.

Track source, bundled assets, tests, schema/migrations, manifests and documentation.
Never commit `.env.local`, provider keys, session secrets, customer documents,
local runtime databases, installed dependencies or generated `dist/`.

## Durable customer data is a separate next step

Before real team-wide use, migrate documents to private object storage and
workspace records to an authenticated database with per-organisation membership,
access checks, audit history, backups and a tested restore process. Include an
explicit import/export path for existing browser data. GitHub holds code, never
customer grant documents or credentials. Configure database/object-storage backup
and retention separately from deployment rollback.
