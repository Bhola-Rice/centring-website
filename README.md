# Centring application and website

**[Open the Centring application](https://centring-dashboard-demo.loftyninja.chatgpt.site/)**

This repository contains the complete dashboard application in [`dashboard/`](dashboard/): browser UI, Beedy agent and voice, document processing, cloud storage, API handlers, assets, tests, database migrations, and build scripts.

GitHub is where the team reads and changes code. Use the application link above to sign in and work with grants and documents.

## Run the application locally

```sh
git clone https://github.com/Bhola-Rice/centring-website.git
cd centring-website/dashboard
npm ci
npm test
npm run build
npm run dev
```

Use Node.js 24+. Open http://127.0.0.1:7788. Local development has its own data store and does not automatically access the live team's records.

Read the [application guide](dashboard/README.md) and [deployment and data guide](dashboard/docs/DEPLOYMENT-AND-DATA.md) for the code map, team access, migrating browser-only work, backups, and publishing.

## What lives where

- **Application:** [live workspace](https://centring-dashboard-demo.loftyninja.chatgpt.site/) and [`dashboard/` source](dashboard/).
- **Shared documents and records:** private hosting storage behind the workspace sign-in, not this repository.
- **Marketing website:** [live site](https://centring-kiwi.loftyninja.chatgpt.site/), [handoff on staging](https://github.com/Bhola-Rice/centring-website/tree/staging), and [original handoff ZIP](https://github.com/Bhola-Rice/centring-website/releases/download/team-handoff-v1/Centring-Team-Handoff.zip).
- **Deployments:** GitHub Actions tests/builds dashboard changes. Publishing to the existing Sites application is a separate step documented in the deployment guide; merging does not automatically publish.

This repository is public. It intentionally excludes API keys, authentication secrets, customer uploads and runtime databases. Repository contributors can clone and build the application; production publishing permissions are managed separately. Invite contributors through repository Settings → Collaborators.
