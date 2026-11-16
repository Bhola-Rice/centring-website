# Beedy connection and implementation notes

## Current state

Live OpenAI inference was activated on 10 November 2026 through a Sites runtime secret. Browser checks verified document questions and real Grants.gov discovery. The public dashboard now uses the owner-configured shared demo username/password before the workspace and AI requests; the sample Sarah profile is not authentication. Automated tests use a simulated provider where stated.

## Connection setup

1. Enable OpenAI Developers in Codex and ask to connect this dashboard's Beedy agent. Follow that plugin's API-key setup and approval flow.
2. Store `OPENAI_API_KEY` as a secret in this Site's runtime environment through the supported Sites environment tools. Optional `OPENAI_MODEL` defaults to `gpt-5.4-mini`. Never put the key in browser code, a hosting manifest, chat, or Git.
3. Open Beedy. Guests see Sign in to Centring, which returns to the same page and preserves the unsent question. Status checks both server configuration and visitor identity. A successful chat verifies provider access.
4. Test: “Which deadlines need attention this week?”, then “Assign the budget task to Sarah.” Review the proposed assignment, apply it, check Team tasks and Calendar, then undo it.

For local development, put server values in an ignored `.env` file based on `.env.example`, then run `node --env-file=.env scripts/dev.mjs`. Local preview binds to loopback and injects a development identity. Do not use that adapter as a public server.

## What Beedy can do

Beedy reads a fresh snapshot of this browser's tasks, applications, opportunities, calendar, readiness, report and team. The message and selected records are sent to OpenAI through a server endpoint with `store:false`; the key stays server-side. This setting does not replace the provider's applicable data-retention policies. The official public Grants.gov catalog is connected for read-only live search and notice details. Private foundation databases and shared team storage are not connected.

Allowed tools can propose task creation, assignment, dates, notes and status; application owners, planning dates and notes; and readiness checkboxes. They cannot submit grants, confirm awards or receipt of funds, send messages, delete arbitrary records or run code. Dedicated manual forms remain responsible for submission/award/receipt tracking.

The server and browser validate field names, record IDs, teammates and dates. The browser requires review and Apply change. A record fingerprint rejects stale suggestions; duplicate apply is prevented. Undo only succeeds if the item has not changed since applying. Existing edits are preserved. Dates and notes do not imply external verification.

The endpoint requires the Site's trusted signed-in identity and same-origin requests. The Site is public; AI chat still requires a trusted signed-in identity. Request size, conversation length, tool turns and update counts are bounded. The in-memory per-isolate rate counter is best-effort abuse reduction, not a global spending cap. Set provider budget limits before expanding access; shared production use needs durable rate limiting and server-owned records.

## Source map

- `worker/agent.mjs`: Responses API, tool loop, authentication and request validation.
- `web/agent-protocol.mjs`: shared update validation and state application.
- `web/app.js`: context snapshots, chat, review/apply/undo and chart interactions.
- `scripts/build.mjs`: embeds browser assets and server code in the deployable Worker.
- `tests/agent.test.mjs`, `tests/workspace.test.cjs`: simulated-provider, validation and workspace regression checks.

API references: [OpenAI function calling](https://developers.openai.com/api/docs/guides/function-calling), [model documentation](https://developers.openai.com/api/docs/models/gpt-5.4-mini), [Cloudflare Workers guidance](https://developers.cloudflare.com/workers/best-practices/workers-best-practices/).

## Beedy asset

`web/assets/beedy-cutout.png` was edited from the supplied original Beedy image using the built-in image-generation tool. It has real transparent alpha, with the paper background and caption removed. The original is retained in source; only the cutout is shipped in the browser bundle.

Exact edit prompt:

> Precise image edit, one production-ready transparent PNG mascot asset for a web app. Edit target is the supplied original Beedy kiwi illustration. Remove ONLY the off-white paper background and the entire word 'Beedy' beneath the bird. Retain the exact bird design, orange-brown textured feathers, dark outlines, long yellow beak, feet, friendly face and bright kiwi-green bow tie. Preserve pose, proportions, and hand-drawn character. Isolate the full bird on a truly transparent alpha background, crisp clean antialiased edges with NO white or gray halo, no paper rectangle, no drop shadow, no text. Frame reasonably tightly with about 5% transparent padding around the entire silhouette; do not crop beak or feet. Do not redesign or add anything.

## Federal grant discovery

Beedy now has `search_federal_grants` and `get_federal_grant` tools. These use the official public Grants.gov API and require no Grants.gov key. They work through the model tool loop once OPENAI_API_KEY is configured. Tests exercise the tool loop with a simulated model; no live inference is claimed until actual provider access is verified.

The Opportunities page works independently of AI. Users can search by topic, choose open/forecast and applicant categories, inspect notices, follow official links or search the opportunity number on Simpler.Grants.gov. Saving adds a snapshot and its stated date to the browser calendar. Use Update saved details after reopening a notice to refresh that snapshot and calendar date. Forecast dates remain labeled tentative.

Only public topic searches go to Grants.gov, not source document bytes. Beedy is instructed to omit private names/contact information from searches, use actual current dates for live notices, inspect detail before explaining eligibility, and cite official URLs. Keyword matching and applicant-type filters do not establish eligibility. Full notices and attachments still need review. Federal search is not an exhaustive search of foundation/local funding.

References: https://www.grants.gov/api/api-guide and https://simpler.grants.gov/developers. Simpler's separate API requires its own key; this build does not claim to use it.

## Document and page context

Opening Beedy in Grant studio automatically selects that document. A selector lets visitors switch files or choose No document from any page. The visibly selected source is sent only on message submission; the selection follows across navigation. Uploaded originals remain in browser IndexedDB and are not modified or shared with other visitors. Graeme must upload/select his own file in the same browser; the owner's files are not shared remotely.

The server receives the complete extracted source up to the existing 120,000-character document limit (formerly only 20,000), plus up to 40,000 characters of the working draft with explicit truncation flags. Page labels and OCR warnings are preserved. It reads extracted text, not the original binary file or visual layout. Scanned/unreadable pages still require OCR. The current route, calendar selection, task/application filters, profile, discussion excerpts and plugin preview states are inspectable. Discussion excerpts are bounded and flagged partial. Only the selected document contains source text; the library provides filenames for selection, not unrestricted access to every upload.

Edits to tasks/application planning/readiness remain reviewable proposals. Document/report/discussion wording can be suggested in chat but is not silently written. Plugin preferences do not grant mailbox access.

## Shared demo sign-in

`/signin` is the branded login page. `BEEDY_DEMO_AUTH` is a secret JSON object containing the username, a random salt, and a PBKDF2-SHA256 password verifier (100,000 iterations). No plaintext password is stored in source or runtime settings. `BEEDY_DEMO_SESSION_SECRET` signs 8-hour HttpOnly, Secure, SameSite=Strict cookies. Login/logout require same-origin POSTs; failed login attempts are bounded per client IP in each Worker isolate. These in-memory limits are best-effort, not durable account lockouts. Changing the signing secret revokes existing demo sessions.

With demo auth configured, the root page redirects unauthenticated visitors to sign-in and Beedy accepts the signed demo session instead of requiring ChatGPT identity. The normal platform-identity path remains for deployments without demo credentials. Sign out is in the account dropdown. This is shared demo access, not individual accounts, shared document storage or per-person roles; uploads stay in each visitor’s browser.
