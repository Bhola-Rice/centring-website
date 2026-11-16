# Document review and grant drafting

Open a document and choose **Review edits**, or ask Beedy to suggest edits with the document attached. Suggestions come from the live AI connection and appear inside the working document: removed wording is struck through and additions are highlighted. Select a highlight to see its reason and Accept/Reject controls. Use Accept all or Reject all to review a batch; Preview accepted version shows the proposed result without changing decisions. Accepted text appears immediately in the document. Review history includes Undo acceptance. The original upload is never overwritten.

For DOCX, accepted changes are applied to `word/document.xml` in a separate package. Unchanged run text and run/paragraph properties are retained; all other package entries (styles, media, headers, footers, relationships) are copied unchanged. New wording inherits the run where the change starts. Text length may change pagination. Paragraphs containing fields, tracked changes, hyperlinks, embedded drawings, or complex inline structures are excluded from editing. Browser preview fonts/page breaks may differ from Word. Export the edited Word file for final review.

For PDF and image uploads, the original visual preview remains intact. Suggested wording is accepted into a separate text draft, downloadable as TXT. This does not rewrite text inside a PDF or scan, and is not an exact-layout PDF editing service. The review log can also be downloaded.

From an official grant detail, choose **Create grant draft**. Enter the organisation mission and programme description, and optionally select a supporting document. The initial DOCX contains the mission, programme description, grant reference and placeholders for missing facts. Beedy then suggests grounded wording for review. It does not determine eligibility or submit applications. The selected supporting document is included as AI context for that draft.

Documents, suggestions, accepted decisions and working copies persist in IndexedDB in this browser. They are not synced across team members or devices. API access remains server-authenticated; keys never enter browser assets. Every edit must match its exact current paragraph before acceptance. Stale suggestions and unsafe targets are rejected rather than overwriting newer text.

Checks: document-tool validation, stale/duplicate changes, accept/reject/undo, run boundaries, original package preservation, PDF page references, mission-first drafting, and existing workspace/auth tests. Browser QA covers live suggestions, Word preview/download, saved-grant drafting, persistence after reload and mobile review at 390px.

Copy was revised using Impeccable's clarify and craft guidance, retaining Centring's Sentient typography, white/kiwi-green palette and existing glass surfaces. Guidance: https://github.com/pbakaus/impeccable/tree/main/.agents/skills/impeccable

## Import an opportunity and begin work

Ask Beedy to import an official Grants.gov opportunity (use its numeric ID or find it with the federal search). With a document selected, Beedy returns an **Import and analyse** card. The server fetches the notice rather than trusting model-authored grant fields. Clicking the card refreshes the notice again, upserts it into the browser shortlist, adds its known deadline to the calendar, and links it to that document. Importing an existing ID refreshes it rather than duplicating it. An unknown document or unavailable official notice blocks the import.

The follow-up compares the uploaded source with the official notice. It saves a cited working brief under **Grant analysis**: fit to confirm, requirements, deadlines, missing details, mission/programme wording, and next steps. A prior analysis is AI output, not primary evidence. The original file is never rewritten by this workflow. Analysis can be appended to draft notes (with undo), used for reviewable paragraph suggestions, or used to start a separate Word draft. A selected supporting document is sufficient to start drafting; unknown mission or programme details stay marked for review. Submitted applications are not sent or changed.

These records remain browser-local. The demo does not synchronise uploads or imported notices between teammates’ devices. PDF wording changes remain separate text drafts; Word review retains the existing working-copy safeguards.


## Saved notice documents

Importing now creates a separate DOCX snapshot named “[Grant title] — grant notice.docx” in Documents, automatically marked Saved. The matching opportunity is also upserted under Saved opportunities. The notice includes the official description, eligibility, award range, listed deadline and notes, source URL, and retrieval date. It is not a download of the funder’s full application packet. The attached programme document is retained unchanged as supporting context. Analysis is stored with the new notice document. Reimporting the same official ID reuses the existing document, preserves its original snapshot and working edits, and refreshes its opportunity metadata.

The opportunity detail also has Import to Documents / Open saved document. Older chat cards already marked imported offer Save notice to Documents so existing saved opportunities can gain a document without asking again. Files remain in this browser; no team-wide document sync is implied.

## Account organisation context

The existing BeedyRootKiwi demo login loads a server-owned, versioned Committee for Children profile. It follows the account across sessions and devices; it does not depend on the browser’s local organisation name. Its researched mission, programmes, audiences, fit themes, sources, and known gaps are shown in Settings. Every Beedy request receives the trusted profile, including document review and opportunity analysis. New grant drafts use its known mission.

This is a public-research demo persona, not an official Committee for Children account. The existing team, awards and arts records are demo data, not CFC history. Uploaded documents remain their own evidence: Beedy must flag another organisation’s content rather than silently convert it into CFC facts. Website context does not establish grant eligibility, budgets, partners, registrations or project outcomes. Those details must be provided and checked.

The profile is maintained in worker/organisation.mjs and deployed with the site. This account-level persistence does not add shared document storage: uploads, reviews and drafts still reside in each browser.

Review interaction research: Google Docs official guidance, https://support.google.com/docs/answer/6033474?hl=en (suggestions in context, individual decisions and accept/reject all). Organisation sources: https://www.cfchildren.org/about-us/, https://www.cfchildren.org/programs/, https://www.cfchildren.org/. Reviewed 10 November 2026.
