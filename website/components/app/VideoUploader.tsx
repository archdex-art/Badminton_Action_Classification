"use client";

import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";

const ACCEPTED = ["video/mp4", "video/quicktime", "video/webm"];
const MAX_BYTES = 50 * 1024 * 1024;

type Status = "idle" | "uploading" | "analyzing" | "done" | "error";
type Prediction = { action: string; confidence: number };

export function VideoUploader() {
  const router = useRouter();
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [results, setResults] = useState<Prediction[] | null>(null);
  const [drag, setDrag] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handle = useCallback(async (file: File) => {
    if (!ACCEPTED.includes(file.type)) {
      setError("Unsupported format — use MP4, MOV, or WebM.");
      setStatus("error");
      return;
    }
    if (file.size === 0 || file.size > MAX_BYTES) {
      setError("File must be between 1 byte and 50 MB.");
      setStatus("error");
      return;
    }
    setError(null);
    setResults(null);
    setFileName(file.name.replace(/[^\w.\- ]+/g, "_").slice(0, 64));
    try {
      setStatus("uploading");
      const form = new FormData();
      form.append("clip", file);
      await new Promise((r) => setTimeout(r, 500));
      setStatus("analyzing");
      const res = await fetch("/api/classify", { method: "POST", body: form });
      if (!res.ok) throw new Error("Classification failed.");
      const data = (await res.json()) as { predictions: Prediction[] };
      setResults(data.predictions);
      setStatus("done");
      // Refresh the server-rendered "Your videos" / dashboard lists.
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
      setStatus("error");
    }
  }, []);

  const busy = status === "uploading" || status === "analyzing";

  return (
    <div className="rounded-2xl border bg-surface p-5 shadow-card md:p-6">
      <div
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => { e.preventDefault(); setDrag(false); const f = e.dataTransfer.files?.[0]; if (f) handle(f); }}
        className={`flex min-h-[220px] flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 text-center transition-colors ${
          drag ? "border-accent bg-accent/5" : "border-line/15"
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED.join(",")}
          className="sr-only"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handle(f); }}
        />
        <AnimatePresence mode="wait">
          {status === "done" && results ? (
            <motion.div key="done" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-sm">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-success/10 px-3 py-1 text-xs font-medium text-success">
                <span className="h-1.5 w-1.5 rounded-full bg-success" /> {fileName}
              </div>
              <ul className="space-y-3 text-left">
                {results.map((p, i) => (
                  <li key={p.action}>
                    <div className="flex items-baseline justify-between text-sm">
                      <span className={i === 0 ? "font-semibold text-ink" : "text-muted"}>{p.action}</span>
                      <span className="font-mono text-ink">{p.confidence.toFixed(1)}%</span>
                    </div>
                    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-elevated">
                      <motion.div className="h-full rounded-full bg-gradient-to-r from-indigo to-cyan" initial={{ width: 0 }} animate={{ width: `${p.confidence}%` }} transition={{ duration: 0.8, delay: i * 0.08 }} />
                    </div>
                  </li>
                ))}
              </ul>
              <button type="button" onClick={() => { setStatus("idle"); setResults(null); }} className="mt-5 rounded-full border px-4 py-2 text-sm font-medium text-ink hover:bg-elevated">
                Analyze another
              </button>
            </motion.div>
          ) : busy ? (
            <motion.div key="busy" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center">
              <span className="h-12 w-12 animate-spin rounded-full border-2 border-accent/30 border-t-accent" />
              <p className="mt-4 font-mono text-sm text-accent">
                {status === "uploading" ? "Uploading…" : "Extracting skeletons · classifying…"}
              </p>
              <p className="mt-1 text-xs text-muted">{fileName}</p>
            </motion.div>
          ) : (
            <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center">
              <span className="grid h-14 w-14 place-items-center rounded-2xl bg-elevated text-indigo dark:text-cyan">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M12 16V4M7 9l5-5 5 5M5 20h14" /></svg>
              </span>
              <p className="mt-4 font-display text-lg font-semibold text-ink">Drag & drop a clip</p>
              <p className="mt-1 text-sm text-muted">MP4, MOV or WebM · up to 50 MB</p>
              <button type="button" onClick={() => inputRef.current?.click()} className="mt-5 rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-canvas">
                Choose file
              </button>
              {error && <p className="mt-3 text-sm text-red-500" role="alert">{error}</p>}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <p className="mt-3 text-center font-mono text-[11px] text-muted">
        Validated client + server · simulated inference in this demo
      </p>
    </div>
  );
}
