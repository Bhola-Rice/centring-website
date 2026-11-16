# Application drafting

Documents → Draft application and Create application draft on an opportunity now generate a **new applicant response**, rather than editing a funder notice.

The setup separates four inputs:
- Server-owned organisation profile, plus the confirmed mission.
- Project details entered by the user.
- Funder application questions from an uploaded file or pasted text. A current Grants.gov notice is fetched when an official opportunity is selected.
- A separately selected supporting document about the applicant.

The existing authenticated AI endpoint returns structured application answers, an eligibility/fit assessment, word limits, exact evidence quotations, and missing information. Sources remain unchanged. The new DOCX application is saved and starred in browser-local Documents. Answers can be edited, approved, reopened and exported as a Word draft. Editing an approved answer reopens it. Outstanding confirmations, unresolved placeholders and over-limit answers prevent approval.

A grant listing is often not a full application packet. Inferred headings or questions without an exact source quotation make the result a clearly labelled provisional working draft. The system does not follow arbitrary external attachment URLs or fill funder web portals. Export is a separate structured Word document with question headings and answers, not a replacement of the original form layout. Source PDF/DOCX files retain their original formatting.

The generated answers and sources are kept in IndexedDB on the browser where generation occurs. They are not cross-device shared storage. Requests use the existing server-held API key and authenticated organisation binding. No application is submitted by generation or approval.

The chat agent can prepare an application setup card. It cannot rewrite an imported funder notice through the paragraph editing tool.
