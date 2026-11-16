# Grant studio and document reading

The workspace retains Centring's white, kiwi-green and Sentient interface. Document previews use the document's own appearance rather than applying the brand font to its contents.

## Work with a document

1. Open Documents and upload PDF, DOCX, UTF-8 TXT/Markdown, PNG or JPG (one file at a time).
2. Source document opens **Original layout**. PDFs render directly from the original bytes, with page selection and zoom. Word uses a sandboxed layout preview with styles, tables, images, headers and footers. Word pagination and unavailable fonts can differ from Microsoft Word; use a PDF export for exact page appearance. Text files preserve line breaks, and images display unchanged.
3. **Text for Beedy** is a separate reading layer, not a replacement for the original. PDF text is grouped by printed line geometry and labelled by page. Scanned pages automatically use English OCR on this device. PNG/JPG scans also use OCR. Word files with little native text attempt OCR on embedded PNG/JPG images; “Read again with OCR” also checks images in text-rich Word documents. Word image references are labelled as embedded images, not invented page numbers.
4. Use Refresh text & OCR for an older uploaded document. Read again with OCR is available when an existing PDF text layer is garbled. Progress and cancellation are visible. Recognition confidence and unreadable-page warnings are shown; numbers, tables and uncertain text need checking against the original.
5. Write a separate draft, copy source text into it, or build an outline from details you enter. Empty outline fields remain explicit placeholders. These preparation tools do not pretend to generate AI content. Replacing a draft has one-step undo; reading/OCR never replaces a draft.
6. Choose owners and due dates in Preparation plan. Confirm to create tasks in the existing calendar. Reopening does not duplicate tasks; progress counts completed tasks.
7. Export the working draft as TXT. Download Original to obtain the unchanged uploaded file. No format-preserving editing/export or Word add-in is claimed.

## Storage and limits

Files, text and drafts use IndexedDB (`centring-documents`, store `files`) in the visitor's browser. They are not uploaded to the hosting server, shared with teammates or synchronized across devices. Reset demo preserves the library; clearing site data removes it. Download important originals/drafts. Tasks remain in localStorage.

Limits: 10 MB per file, 80 PDF pages, 120,000 extracted characters, 25 MB declared expanded Word size, and 20 embedded Word scan images. OCR rasterization is capped at four million pixels per page and recognition has a 60-second per-operation timeout. PDF reading can be cancelled. OCR currently recognizes printed English; handwriting, low-resolution scans and complex reading order can be unreliable. Images/figures are not semantically interpreted. Original files remain available when a PDF page cannot be read. Password-protected PDFs require an unlocked copy; legacy .doc files require DOCX or PDF export.

PDF.js renders the original pages and extracts native text. Tesseract performs OCR in a browser worker. Mammoth extracts Word text; docx-preview renders Word in an opaque-origin sandbox, sanitized by DOMPurify. The Word frame cannot access parent storage, run document scripts, submit forms, or make network requests. AltChunk HTML is disabled. Vendor libraries and English trained data are served from this site; no third-party OCR upload or CDN is used. CSP permits WebAssembly compilation for the OCR engine, not arbitrary JavaScript eval.

## Beedy

Ask about this document refreshes older extraction first, then attaches one excerpt. Nothing is sent until the visitor sends a message; the chip can be removed. At most 20,000 characters are shared, with explicit truncation. Page/image labels and OCR warnings travel with the text. The server treats document contents as untrusted evidence, asks for citations and warns against asserting unreadable/uncertain content. Raw original bytes are never sent to AI.

The backend still needs OPENAI_API_KEY. Without it, sending is disabled and no fake response is generated. Viewing, OCR, editing, outlines, preparation tasks and downloads work independently. OCR does not require an OpenAI plugin. A live AI document response has not been verified without that connection.

## Maintenance and verification

Pinned libraries: pdfjs-dist 6.5.438, mammoth 1.13.0, tesseract.js/core 7.0.0, @tesseract.js-data/eng 1.0.0, docx-preview 0.4.1, DOMPurify 3.4.17, and JSZip from the lockfile. Committed browser files allow the Node-only build. OCR intentionally uses the compatible, non-SIMD LSTM core to keep the embedded Worker bundle small and support devices without SIMD. English data is from the package's 4.0.0_best_int directory (upstream tessdata_best, Apache 2.0). Standard PDF fonts include their upstream licenses.

Upstream references: https://mozilla.github.io/pdf.js/examples/ ; https://github.com/naptha/tesseract.js/blob/master/docs/api.md ; https://github.com/VolodymyrBaydalka/docxjs ; https://github.com/cure53/DOMPurify ; https://github.com/mwilliamson/mammoth.js .

Checks cover upload limits, geometric line/table extraction, page/OCR context and truncation, outlines, task validation, and existing workspace/agent behavior. Browser verification includes the supplied nine-page PDF, a printed-text scan, a Word heading/table fixture, and an embedded Word scan. No real uploaded document is committed or included in deployment assets.

## Local preview

An error referencing 127.0.0.1:7788 means the page depends on `node scripts/dev.mjs`. Use the published dashboard for normal work. Local and public site storage are separate. Failed PDF reader imports can be retried after connectivity returns.
