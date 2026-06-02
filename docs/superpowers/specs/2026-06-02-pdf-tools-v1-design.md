# PDF Tools V1 Design

## Goal

Add a private PDF tools suite to the existing Personal Tool Hub. The suite should provide the most useful Smallpdf-style PDF operations for personal use while staying realistic for the current Express + Docker app.

## Selected Scope

PDF Tools V1 includes seven tools:

1. Merge PDF
   - Upload 2-10 PDF files.
   - Output one merged PDF.

2. Split PDF
   - Upload one PDF.
   - User enters one or more page ranges separated by semicolons, for example `1-3;4-6;7`.
   - Output a zip file containing one PDF per range.

3. Rotate PDF
   - Upload one PDF.
   - User chooses 90, 180, or 270 degrees.
   - User can rotate all pages or a page range.
   - Output one PDF.

4. Delete Pages
   - Upload one PDF.
   - User enters pages/ranges to remove, for example `2,5-7`.
   - Output one PDF with remaining pages.

5. Extract Pages
   - Upload one PDF.
   - User enters pages/ranges to keep, for example `1,3-5`.
   - Output one PDF with selected pages.

6. Compress PDF
   - Upload one PDF.
   - Backend calls Ghostscript.
   - User chooses compression profile: screen, ebook, printer, or prepress.
   - Output one compressed PDF.

7. PDF Info
   - Upload one PDF.
   - Show page count, file size, PDF title, author, subject, creator, producer, creation date, and modification date when available.
   - No output file.

## Out Of Scope

- PDF to Word, Excel, or PowerPoint.
- Word, Excel, or PowerPoint to PDF.
- OCR.
- Signing, redaction, form filling, watermarking, crop, page numbering, unlock/protect.
- Browser camera/scanner workflow.
- Persistent file history.
- Public anonymous access.

## Architecture

Keep the existing Tool Hub architecture:

- Express backend.
- Static browser frontend.
- Password auth through the existing cookie middleware.
- Docker deployment.

Add a PDF backend subsystem under `src/tools/pdf/`.

Backend dependencies:

- `multer` for authenticated multipart upload handling.
- `pdf-lib` for PDF page manipulation and metadata reading.
- `archiver` for split output zip files.
- Ghostscript installed by Dockerfile for compression.

Backend route:

- `POST /api/tools/pdf/:action`
- Protected by existing `auth.requireAuth`.
- Multipart form field for files: `files`.
- Text fields:
  - `ranges` for split/delete/extract/rotate page selection.
  - `degrees` for rotate.
  - `profile` for compress.
- File actions respond with binary download.
- Info action responds with JSON.

Frontend:

- Add a `PDF` navigation entry and dashboard tile.
- Add one PDF tool view with an internal action grid.
- Each PDF action has a compact form.
- The frontend submits multipart requests with `FormData`.
- File responses are downloaded through a Blob URL.
- Info responses are rendered as a summary panel.

## Limits And Safety

- All PDF routes require login.
- Default maximum upload size: 50 MB per file.
- Merge accepts at most 10 files.
- All uploaded and generated files are stored under request-scoped temp directories.
- Temp files are removed after response completion.
- Page ranges are validated before operations.
- Compression gracefully reports `PDF_GHOSTSCRIPT_UNAVAILABLE` when Ghostscript is not installed or not on `PATH`.

## Error Codes

- `PDF_ACTION_UNKNOWN`
- `PDF_FILE_REQUIRED`
- `PDF_FILES_REQUIRED`
- `PDF_TOO_MANY_FILES`
- `PDF_ONLY_ALLOWED`
- `PDF_RANGE_REQUIRED`
- `PDF_RANGE_INVALID`
- `PDF_RANGE_OUT_OF_BOUNDS`
- `PDF_ROTATION_INVALID`
- `PDF_PROFILE_INVALID`
- `PDF_GHOSTSCRIPT_UNAVAILABLE`
- `PDF_PROCESSING_FAILED`

## Testing

Backend unit tests:

- Page range parser accepts valid ranges.
- Page range parser rejects malformed ranges.
- Page range parser rejects pages outside the PDF page count.
- PDF operations produce valid output PDFs.
- Split creates a zip result descriptor.
- PDF info returns page count and size.
- Compress command builds the expected Ghostscript arguments with a fake runner.

API tests:

- PDF routes require auth.
- Unknown PDF action returns `PDF_ACTION_UNKNOWN`.
- Merge route calls PDF service and returns a file download.
- Info route calls PDF service and returns JSON.

Frontend static tests:

- HTML includes PDF nav item, dashboard tile, and PDF tool view.
- Frontend entrypoint imports the PDF tool initializer.

Manual verification:

- Login and navigate to PDF.
- Each of the seven actions shows the right form fields.
- Merge, extract, delete, rotate, split, and info work on a small sample PDF.
- Compress works in Docker where Ghostscript is installed.
- Docker image builds and serves the new suite.
