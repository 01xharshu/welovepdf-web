# paper

Paper is a precise, privacy-minded PDF editor for the modern web. It brings the familiar calm of a document editor to PDF work: import a document, understand its structure, make direct edits, and export a polished result without losing the details that made the original useful.

## What it does

- A minimal, ShadCN-inspired editor workspace with focused tools and clear hierarchy.
- Client-side PDF rendering and writing: files are processed in the browser and are not uploaded by this app.
- Multi-page viewing, zoom, drag-and-drop import, text overlays, and browser downloads.
- AcroForm inspection with detected native form-field counts.
- Automatic font and text-layer detection designed to preserve the original document’s visual language.
- Page organization tools for crop, rotate, reorder, split, and merge workflows.
- Secure PDF workflows for encryption, decryption, permissions, and protected files.
- Local-first interaction model suited to private documents and Vercel deployment.

The current foundation includes the editor shell, PDF.js rendering, multi-page navigation, zoom, drag-and-drop import, text overlays, AcroForm detection, and a client-side PDF export path powered by pdf-lib. Native form values and full object-level text replacement are the next layer of work.

## How PDF type detection works

Paper can distinguish document characteristics by inspecting the PDF in the browser:

- A PDF with a text layer exposes selectable text and font metadata through its PDF objects. This is typical of exports from Word, Google Docs, design tools, and typeset documents.
- A scanned or image-only PDF contains page images with little or no text content. It needs OCR before its words can become editable; image pixels cannot reveal the original font reliably.
- A fillable PDF contains AcroForm widgets such as text inputs, checkboxes, radio buttons, and dropdowns. Paper detects these native fields separately from ordinary page text.

Font names can be read from embedded font metadata, but exact editing depends on whether the font is embedded, subsetted, licensed for reuse, and supported by the browser/PDF writing engine. When exact replacement is not possible, a safe overlay is preferable to silently changing the source text.

## Design direction

Paper is intentionally quiet: neutral surfaces, small radii, restrained borders, and one blue action color. The interface keeps document work central and moves advanced controls into a contextual properties panel.

## Getting started

```bash
npm install
npm run dev
```

Open `http://localhost:3000` in your browser.

## Deployment

The app is structured for Vercel and does not require a server-side PDF processing service. Connect the repository and use the default Next.js build settings. PDF.js and pdf-lib run in the browser; large files still depend on the user’s available memory and device performance.

## Current boundaries

The client-side foundation can render PDFs, detect native form fields, create text overlays, and export a PDF download. It does not yet perform OCR, replace arbitrary existing text objects in-place, or implement encryption/decryption and page restructuring. Those features require additional browser-compatible PDF object and OCR workflows and should be added without moving document contents to a server.
