# Centring website — team review

[Live website](https://centring-kiwi.loftyninja.chatgpt.site/) · [Download complete handoff ZIP](https://github.com/Bhola-Rice/centring-website/releases/download/team-handoff-v1/Centring-Team-Handoff.zip) · [Browse staging files](https://github.com/Bhola-Rice/centring-website/tree/staging)

The complete website, original video, artwork, fonts, reference documents and setup guide are staged on the `staging` branch for team review. Open the repository's Pull requests tab to review the handoff before merging.

## Start working

```sh
git clone --branch staging https://github.com/Bhola-Rice/centring-website.git
cd centring-website/source
npm run install:ci
npm run dev
```

Requires Node.js 22.13 or newer. Use the localhost URL printed in your terminal.
Read `START-HERE.txt` on the staging branch for editing and publishing instructions.

## What lives where

- `source/`: application code, build configuration and deployed assets
- `assets/`: original video, preserved earlier MP4, Beedy artwork and original font package
- `docs/`: supplied Centring reference PDFs
- `START-HERE.txt`: run, edit and publish guide
- Releases: downloadable complete handoff ZIP

This repository is public. Anyone can read and download its source. The owner can invite contributors through **Settings → Collaborators**. Publishing access and runtime secrets are separate.

The `staging` branch is a review branch, not a separate hosted staging website. GitHub pushes and PR merges do not automatically publish to the live Site. Publishing is a separate authorized Sites step documented in the guide.

## Dashboard

The nonprofit dashboard is maintained separately in [`dashboard/`](dashboard/). See its [run guide](dashboard/README.md) and [deployment/data guide](dashboard/docs/DEPLOYMENT-AND-DATA.md). Dashboard changes are tested and built by GitHub Actions. The marketing handoff remains on `staging`.
