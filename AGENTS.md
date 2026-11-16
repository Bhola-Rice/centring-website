# Repository boundaries

The dashboard lives in `dashboard/`. The marketing handoff lives on the existing `staging` branch. Do not replace or deploy one as the other.

For dashboard work:
- Start from current GitHub main and use a focused branch/PR.
- Keep changes scoped to dashboard and its workflow/documentation.
- Never commit .env secrets, customer uploads, local databases, node_modules, or generated dist files.
- Run npm test and npm run build from dashboard before pushing.
- Test document editing with Beedy open at desktop, tablet, and mobile widths for layout changes.
- GitHub CI validates/builds only. Publishing uses the existing Sites project; record the exact reviewed source commit and published version.
- Source control is not a backup of browser or server customer data. Do not imply it is.
