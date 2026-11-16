# Application access, deployment, and data

## Which link should I use?

- **Use the application:** https://centring-dashboard-demo.loftyninja.chatgpt.site/
- **Read or clone all application source:** https://github.com/Bhola-Rice/centring-website/tree/main/dashboard
- **Marketing site:** https://centring-kiwi.loftyninja.chatgpt.site/

GitHub displays source code, not the running application. The dashboard's UI, API handlers, assets, tests, schema and build scripts are all in `dashboard/` on `main`. The earlier marketing handoff is on `staging`.

## Team access and first migration

Use the existing workspace login at the application URL. Team members using that same login share documents, applications, tasks, saved opportunities, reports, discussions, and organisation details. Individual member accounts, invites, role permissions and concurrent document co-editing are not yet available.

Each browser with earlier work must open the cloud status in the header and select **Upload this device's work** once. This preserves existing shared records and adds missing local records. If a document ID already exists, it uploads a separate local copy. Keep the original browser data until the status confirms cloud saving. A browser on a different machine cannot automatically retrieve another machine's unuploaded files.

Click **Sync and refresh** when the header says team updates are available. Independent workspace edits can merge; same-field conflicts keep the local work for review. Document conflicts offer **Save local edits as copies**. Original file bytes are preserved.

## Storage locations

| Data | Storage |
|---|---|
| Source, fonts, images, tests, schema, guides | GitHub `dashboard/` plus Sites source history |
| Original uploads and document versions | Private R2 object storage, binding `BUCKET` |
| Current document/workspace version pointers | D1 `cloud_records`, binding `DB` |
| Confirmed organisation/project answers | D1 `nonprofit_knowledge` |
| Local offline copies and unsynced changes | IndexedDB and localStorage in the browser |
| Personal profile/photo, chat history and unsent replies | Browser-local |
| API keys, authentication secrets | Hosting runtime secrets, never GitHub |

Storage routes require authentication and isolate keys by account. The current shared login deliberately maps to one workspace. Files are limited to 10 MB each, record payloads to 4 MB, and workspaces to 500 stored record IDs. These are an initial shared-workspace implementation, not a claim of enterprise scale or guaranteed recovery.

## Backups and recovery

The header's **Download backup** exports this browser's loaded documents (including original bytes), workspace state, and retained pre-migration state as JSON. Refresh first to include team updates. This export is private customer data: store it securely, never commit it. It does not include provider secrets or the separate D1 knowledge table. There is no in-app backup import yet; retain exports for administrator-assisted recovery.

Every cloud record write stores an immutable R2 JSON version. A D1 pointer selects the current version; deletion creates a tombstone without purging prior objects. An administrator with storage access can locate the account's `versions/{kind}/{recordId}/` objects, inspect the correct version, and restore it through an authenticated version-checked record PUT. Blob references resolve under that same account's `files/` prefix. Do not manually change an owner prefix. Recovery should be tested on a separate workspace before altering live records.

Deployment rollback changes code only. It does not rewind customer data. Provision independent D1 exports and object-store backups/retention before relying on this for production-critical records. Current retained versions protect against accidental edits but are not an independent disaster-recovery backup.

## Development and deployment

```sh
git clone https://github.com/Bhola-Rice/centring-website.git
cd centring-website/dashboard
npm ci
npm test
npm run build
npm run dev
```

Use Node.js 24+. Development data goes in ignored `.sites-runtime/` and never reaches production. Copy `.env.example` for optional local provider configuration. Do not copy live secrets or customer files into the repo.

1. Branch from current `main`; make focused changes in `dashboard/`.
2. Run tests and build, then open a PR. GitHub Actions checks dashboard changes and retains a build artifact.
3. Merge reviewed source. Publication remains an explicit Sites operation; a GitHub merge alone does not publish.
4. Use the Sites source workflow to push that exact source, package `dist/`, save a version, and deploy it to project `appgprj_6af2758b377c81919295eacece5cab1c`.
5. Preserve `.openai/hosting.json`, DB/BUCKET bindings, runtime secrets and the existing audience. Deployment applies the checked-in Drizzle migrations. Do not provision a second site accidentally.
6. Record the GitHub commit, Sites source commit/version and prior working version in release notes. Verify sign-in, document save/reload, workspace save, and account isolation.

GitHub collaborators need repository write permission to contribute. Production publishing access is separate. A clone includes everything needed to build the code, but intentionally excludes live private documents, database contents, credentials, node_modules and generated dist. The repository is public.
