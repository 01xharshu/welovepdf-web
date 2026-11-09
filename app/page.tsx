"use client";
import { useEffect, useRef, useState } from "react";
import {
  AlignCenter,
  AlignLeft,
  ChevronDown,
  Download,
  FileText,
  FolderOpen,
  Highlighter,
  Image,
  LockKeyhole,
  Menu,
  MousePointer2,
  PenLine,
  Plus,
  Redo2,
  RotateCcw,
  Scissors,
  Search,
  Settings2,
  ShieldCheck,
  Type,
  Undo2,
  Upload,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { Button } from "@/components/ui/button";

export default function Home() {
  const input = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [tool, setTool] = useState("select");
  const [pages, setPages] = useState(1);
  const [pageNumber, setPageNumber] = useState(1);
  const [zoom, setZoom] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [dragging, setDragging] = useState(false);
  const [notes, setNotes] = useState<
    { id: number; x: number; y: number; text: string }[]
  >([]);
  const [formFields, setFormFields] = useState(0);
  const [fields, setFields] = useState<
    { name: string; type: string; value: string }[]
  >([]);
  const [exporting, setExporting] = useState(false);
  const [textRuns, setTextRuns] = useState<{ id: number; text: string; original: string; x: number; y: number; width: number; height: number; size: number }[]>([]);
  const pick = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFile(e.target.files?.[0] ?? null);
    setPageNumber(1);
    setNotes([]);
  };
  const inspectFields = (doc: PDFDocument) => {
    const detected = doc
      .getForm()
      .getFields()
      .map((field) => {
        const name = field.getName();
        const type = field.constructor.name
          .replace("PDF", "")
          .replace("Field", "");
        let value = "";
        try {
          const candidate = field as unknown as {
            getText?: () => string;
            isChecked?: () => boolean;
            getSelected?: () => string[];
          };
          if (type === "Text") value = candidate.getText?.() ?? "";
          else if (type === "CheckBox")
            value = candidate.isChecked?.() ? "true" : "false";
          else if (candidate.getSelected)
            value = candidate.getSelected()?.[0] ?? "";
        } catch {}
        return { name, type, value };
      });
    setFields(detected);
    setFormFields(detected.length);
  };
  const updateField = (name: string, value: string) =>
    setFields((items) =>
      items.map((field) => (field.name === name ? { ...field, value } : field)),
    );
  useEffect(() => {
    const label = Array.from(document.querySelectorAll(".panel-label")).find(
      (node) => node.textContent === "Forms",
    );
    const section = label?.parentElement;
    if (!section || !fields.length) return;
    let list = section.querySelector(".form-list");
    if (!list) {
      list = document.createElement("div");
      list.className = "form-list";
      section.appendChild(list);
    }
    list.replaceChildren(
      ...fields.slice(0, 4).map((field) => {
        const wrapper = document.createElement("label");
        wrapper.className = "form-field";
        const title = document.createElement("span");
        title.textContent = `${field.name} (${field.type})`;
        wrapper.appendChild(title);
        if (field.type === "Text") {
          const input = document.createElement("input");
          input.value = field.value;
          input.placeholder = "Enter value";
          input.oninput = () => updateField(field.name, input.value);
          wrapper.appendChild(input);
        }
        return wrapper;
      }),
    );
  }, [fields]);
  const download = async () => {
    if (!file || exporting) return;
    setExporting(true);
    try {
      const pdf = await PDFDocument.load(await file.arrayBuffer());
      const form = pdf.getForm();
      fields.forEach((item) => {
        try {
          const field = form.getField(item.name) as unknown as {
            setText?: (value: string) => void;
            check?: () => void;
            uncheck?: () => void;
        select?: (value: string) => void;
          };
          if (item.type === "Text") field.setText?.(item.value);
          else if (item.type === "CheckBox")
            item.value === "true" ? field.check?.() : field.uncheck?.();
          else field.select?.(item.value);
        } catch {}
      });
      if (notes.length) {
        const font = await pdf.embedFont(StandardFonts.Helvetica);
        const page = pdf.getPages()[pageNumber - 1];
        notes.forEach((note) =>
          page.drawText(note.text, {
            x: note.x / 1.25,
            y: page.getHeight() - note.y / 1.25 - 18,
            size: 12,
            font,
            color: rgb(0.09, 0.1, 0.11),
          }),
        );
      }
      if (textRuns.length) {
        const font = await pdf.embedFont(StandardFonts.Helvetica);
        const page = pdf.getPages()[pageNumber - 1];
        textRuns.filter((run) => run.text !== run.original).forEach((run) => {
          page.drawRectangle({ x: run.x / (1.25 * zoom), y: page.getHeight() - (run.y + run.height) / (1.25 * zoom), width: Math.max(run.width / (1.25 * zoom), 24), height: run.height / (1.25 * zoom) + 4, color: rgb(1, 1, 1) });
          page.drawText(run.text, { x: run.x / (1.25 * zoom), y: page.getHeight() - (run.y + run.height) / (1.25 * zoom), size: run.size / (1.25 * zoom), font, color: rgb(0.09, 0.1, 0.11) });
        });
      }
      const bytes = await pdf.save();
      const safeBytes = new Uint8Array(bytes).buffer as ArrayBuffer;
      const url = URL.createObjectURL(
        new Blob([safeBytes], { type: "application/pdf" }),
      );
      const link = document.createElement("a");
      link.href = url;
      link.download = `paper-${file.name}`;
      link.click();
      URL.revokeObjectURL(url);
    } catch {
      setError("This PDF could not be exported in the browser.");
    } finally {
      setExporting(false);
    }
  };
  const addText = (e: React.MouseEvent<HTMLDivElement>) => {
    if (tool !== "text") return;
    const pageElement = e.currentTarget.querySelector<HTMLElement>(".rendered-page");
    if (!pageElement || !pageElement.contains(e.target as Node)) return;
    const rect = pageElement.getBoundingClientRect();
    setNotes((items) => [
      ...items,
      {
        id: Date.now(),
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
        text: "Type here",
      },
    ]);
  };
  const updateNote = (id: number, text: string) =>
    setNotes((items) => items.map((note) => (note.id === id ? { ...note, text } : note)));
  useEffect(() => {
    if (!file || !canvasRef.current) return;
    let cancelled = false;
    setLoading(true);
    setError("");
    file
      .arrayBuffer()
      .then(async (data) => {
        PDFDocument.load(data)
          .then(inspectFields)
          .catch(() => {
            setFormFields(0);
            setFields([]);
          });
        const pdfjs = await import("pdfjs-dist");
        pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.mjs`;
        const pdf = await pdfjs.getDocument({ data }).promise;
        if (cancelled) return;
        setPages(pdf.numPages);
        const page = await pdf.getPage(pageNumber);
        const viewport = page.getViewport({ scale: 1.25 * zoom });
        const canvas = canvasRef.current;
        if (!canvas) return;
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        await page.render({ canvasContext: canvas.getContext("2d")!, viewport })
          .promise;
        const content = await page.getTextContent();
        const scale = 1.25 * zoom;
        const runs = content.items.filter((item): item is typeof item & { str: string; transform: number[]; width: number } => "str" in item && "transform" in item).map((item, index) => {
          const size = Math.max(Math.abs(item.transform[0]) * scale, 8);
          return { id: index, text: item.str, original: item.str, x: item.transform[4] * scale, y: viewport.height - item.transform[5] * scale - size, width: item.width * scale, height: size + 4, size };
        }).filter((item) => item.text.trim());
        if (!cancelled) setTextRuns(runs);
        if (!cancelled) setLoading(false);
      })
      .catch(() => {
        if (!cancelled) {
          setLoading(false);
          setError("This PDF could not be rendered in the browser.");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [file, pageNumber, zoom]);
  const updateTextRun = (id: number, text: string) => setTextRuns((items) => items.map((item) => item.id === id ? { ...item, text } : item));
  const tools = [
    ["select", MousePointer2],
    ["text", Type],
    ["draw", PenLine],
    ["highlight", Highlighter],
    ["image", Image],
    ["crop", Scissors],
  ] as const;
  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark">P</span> paper
        </div>
        <div className="top-actions">
          <Button variant="outline" size="icon" aria-label="Undo">
            <Undo2 size={15} />
          </Button>
          <Button variant="outline" size="icon" aria-label="Redo">
            <Redo2 size={15} />
          </Button>
          <Button variant="outline" onClick={() => input.current?.click()}>
            <Upload size={14} /> Import PDF
          </Button>
          <Button onClick={download}>
            <Download size={14} /> {exporting ? "Exporting…" : "Export"}
          </Button>
          <input
            ref={input}
            type="file"
            accept="application/pdf"
            hidden
            onChange={pick}
          />
        </div>
      </header>
      <main className="main">
        <aside className="sidebar">
          <p className="eyebrow">Workspace</p>
          <button className="nav-item active">
            <FileText /> Editor
          </button>
          <button className="nav-item">
            <FolderOpen /> Documents
          </button>
          <button className="nav-item">
            <ShieldCheck /> Protected files
          </button>
          <p className="eyebrow" style={{ marginTop: 36 }}>
            Tools
          </p>
          <button className="nav-item">
            <LockKeyhole /> Encrypt PDF
          </button>
          <button className="nav-item">
            <RotateCcw /> Organize pages
          </button>
          <button className="nav-item">
            <Settings2 /> Preferences
          </button>
          {file && (
            <div className="file-card">
              <div className="file-name">{file.name}</div>
              <div className="file-meta">
                {(file.size / 1024 / 1024).toFixed(2)} MB · {pages} page
                {pages !== 1 ? "s" : ""}
              </div>
            </div>
          )}
          {!file && (
            <div className="dropzone" onClick={() => input.current?.click()}>
              <Upload size={16} />
              <br />
              Drop a PDF here
              <br />
              <span style={{ color: "#b0b2b8" }}>or browse files</span>
            </div>
          )}
        </aside>
        <section className="workspace">
          <div className="toolbar">
            <div className="tools">
              {tools.map(([name, Icon]) => (
                <button
                  key={name}
                  aria-label={name}
                  className={"tool " + (tool === name ? "selected" : "")}
                  onClick={() => setTool(name)}
                >
                  <Icon />
                </button>
              ))}
              <span
                style={{ width: 1, background: "#e8e8ea", margin: "6px 7px" }}
              />
              <button
                className="tool"
                onClick={() => setZoom(Math.max(0.5, zoom - 0.1))}
              >
                <ZoomOut />
              </button>
              <span style={{ fontSize: 11, color: "#777", padding: "0 2px" }}>
                {Math.round(zoom * 100)}%
              </span>
              <button
                className="tool"
                onClick={() => setZoom(Math.min(2, zoom + 0.1))}
              >
                <ZoomIn />
              </button>
            </div>
            <div style={{ display: "flex", gap: 4 }}>
              <button
                className="tool"
                onClick={() => setPageNumber(Math.max(1, pageNumber - 1))}
              >
                <ChevronDown style={{ transform: "rotate(90deg)" }} />
              </button>
              <button
                className="tool"
                onClick={() => setPageNumber(Math.min(pages, pageNumber + 1))}
              >
                <ChevronDown style={{ transform: "rotate(-90deg)" }} />
              </button>
              <button className="tool">
                <Menu />
              </button>
            </div>
          </div>
          <div
            className={"canvas " + (dragging ? "dragging" : "")}
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              const dropped = e.dataTransfer.files[0];
              if (dropped?.type === "application/pdf") setFile(dropped);
            }}
            onClick={addText}
          >
            <div className="page-label">
              Page {pageNumber} of {pages}
            </div>
            {file ? (
              <div className="page rendered-page">
                {loading && (
                  <div className="loading-overlay">Rendering page…</div>
                )}
                {error ? (
                  <div className="empty-state">{error}</div>
                ) : (
                  <>
                    <canvas ref={canvasRef} className="pdf-canvas" />
                    {textRuns.map((run) => (
                      <input key={run.id} className="text-run" value={run.text} style={{ left: run.x, top: run.y, width: Math.max(run.width, 24), height: run.height, fontSize: run.size }} onChange={(e) => updateTextRun(run.id, e.target.value)} onClick={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()} />
                    ))}
                    {notes.map((note) => (
                      <input
                        key={note.id}
                        className="text-note"
                        value={note.text}
                        style={{ left: note.x, top: note.y }}
                        onChange={(e) => updateNote(note.id, e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        onMouseDown={(e) => e.stopPropagation()}
                      />
                    ))}
                  </>
                )}
              </div>
            ) : (
              <div className="empty-state">
                <div className="empty-icon">
                  <FileText size={19} />
                </div>
                <div style={{ color: "#50535c", fontWeight: 600 }}>
                  Open a PDF to start editing
                </div>
                Bring your document into focus.
                <br />
                <Button
                  style={{ marginTop: 14 }}
                  onClick={() => input.current?.click()}
                >
                  Choose PDF
                </Button>
              </div>
            )}
          </div>
          <div className="status">
            <span>
              <ShieldCheck size={12} /> Local workspace
            </span>
            <span>
              {loading
                ? "Rendering document…"
                : formFields
                  ? `${formFields} form field${formFields !== 1 ? "s" : ""} detected`
                  : "Local workspace"}
            </span>
            <span>⌘ K for shortcuts</span>
          </div>
        </section>
        <aside className="sidebar right">
          <div className="panel-title">
            Properties{" "}
            <button className="tool">
              <Settings2 size={15} />
            </button>
          </div>
          {file ? (
            <>
              <div className="panel-section">
                <span className="panel-label">Selected tool</span>
                <div className="select">
                  {tool[0].toUpperCase() + tool.slice(1)}
                  <ChevronDown size={14} />
                </div>
              </div>
              <div className="panel-section">
                <span className="panel-label">Typography</span>
                <div className="select">
                  Helvetica Neue <ChevronDown size={14} />
                </div>
                <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                  <div className="select" style={{ width: "50%" }}>
                    12 pt <ChevronDown size={14} />
                  </div>
                  <button className="btn" style={{ padding: "9px" }}>
                    <AlignLeft size={14} />
                  </button>
                  <button className="btn" style={{ padding: "9px" }}>
                    <AlignCenter size={14} />
                  </button>
                </div>
              </div>
              <div className="panel-section">
                <span className="panel-label">Forms</span>
                <div className="select">
                  {formFields
                    ? `${formFields} AcroForm fields`
                    : "No native fields detected"}
                  <ShieldCheck size={14} />
                </div>
              </div>
              <div className="panel-section">
                <span className="panel-label">Color</span>
                <div className="swatches">
                  <span className="swatch" style={{ background: "#17181c" }} />
                  <span className="swatch" style={{ background: "#2d6cdf" }} />
                  <span className="swatch" style={{ background: "#e9a23b" }} />
                  <span className="swatch" style={{ background: "#fff" }} />
                </div>
              </div>
              <div className="panel-section">
                <span className="panel-label">Opacity</span>
                <input className="range" type="range" defaultValue="100" />
              </div>
            </>
          ) : (
            <div className="empty-state" style={{ marginTop: 130 }}>
              <MousePointer2 size={20} />
              <br />
              Select an element on the page
              <br />
              to see its properties.
            </div>
          )}
        </aside>
      </main>
    </div>
  );
}
