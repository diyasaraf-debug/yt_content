import { useEffect, useState, useRef } from "react";
import { Loader2, Plus, X, AlertCircle, Tag, Upload } from "lucide-react";
import { getVideo, getKeywords, addKeywords, updateKeywordType, deleteKeyword } from "../lib/api";
import { useApp } from "../context/AppContext";
import type { Keyword, Video, KeywordType } from "../types";
import { KW_TYPE_COLORS, KW_TYPE_LABELS } from "../lib/utils";

const TYPES: KeywordType[] = ["primary", "secondary", "long_tail"];

export function KeywordsPage() {
  const { activeVideoId, setStep, triggerRefresh } = useApp();
  const [video, setVideo] = useState<Video | null>(null);
  const [keywords, setKeywords] = useState<Keyword[]>([]);
  const [loading, setLoading] = useState(true);
  const [bulkText, setBulkText] = useState("");
  const [adding, setAdding] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!activeVideoId) return;
    setLoading(true);
    Promise.all([getVideo(activeVideoId), getKeywords(activeVideoId)])
      .then(([v, kws]) => { setVideo(v); setKeywords(kws); })
      .finally(() => setLoading(false));
  }, [activeVideoId]);

  async function handleAddBulk() {
    if (!activeVideoId || !bulkText.trim()) return;
    setAdding(true);
    const updated = await addKeywords(activeVideoId, { text: bulkText });
    setKeywords(updated);
    setBulkText("");
    setAdding(false);
    triggerRefresh();
  }

  async function handleTypeChange(kw: Keyword, newType: KeywordType) {
    if (!activeVideoId) return;
    const updated = await updateKeywordType(activeVideoId, kw.id, newType);
    setKeywords((prev) => prev.map((k) => (k.id === kw.id ? updated : k)));
  }

  async function handleDelete(kw: Keyword) {
    if (!activeVideoId) return;
    setDeletingId(kw.id);
    await deleteKeyword(activeVideoId, kw.id);
    setKeywords((prev) => prev.filter((k) => k.id !== kw.id));
    setDeletingId(null);
    triggerRefresh();
  }

  async function handleCsvUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !activeVideoId) return;
    const text = await file.text();
    const updated = await addKeywords(activeVideoId, { text });
    setKeywords(updated);
    triggerRefresh();
    if (fileRef.current) fileRef.current.value = "";
  }

  const primaryKws = keywords.filter((k) => k.type === "primary");
  const hasPrimary = primaryKws.length > 0;
  const hasEnough = keywords.length >= 5;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 size={20} className="animate-spin text-editorial-muted" />
      </div>
    );
  }

  const title = video?.approved_title || video?.original_title || "Untitled";

  return (
    <div className="p-8 max-w-3xl">
      <div className="mb-6">
        <p className="section-label mb-1">Step 2</p>
        <h2 className="text-2xl font-serif font-bold text-navy">Keyword Manager</h2>
        <p className="text-sm text-editorial-muted mt-0.5">{title}</p>
      </div>

      {/* Validation warnings */}
      {(!hasEnough || !hasPrimary) && (
        <div className="card p-4 mb-5 bg-amber-50 border-amber-200 space-y-1">
          {!hasEnough && (
            <p className="text-sm text-amber-700 flex items-center gap-2">
              <AlertCircle size={13} /> Add at least 5 keywords ({keywords.length}/5)
            </p>
          )}
          {!hasPrimary && (
            <p className="text-sm text-amber-700 flex items-center gap-2">
              <AlertCircle size={13} /> Mark at least one keyword as Primary
            </p>
          )}
          {!video?.transcript && (
            <p className="text-sm text-amber-700 flex items-center gap-2">
              <AlertCircle size={13} /> No transcript added — AI timestamps will be approximate
            </p>
          )}
        </div>
      )}

      {/* Bulk input */}
      <div className="card p-5 mb-5">
        <label className="block text-xs font-semibold uppercase tracking-widest text-editorial-muted/60 mb-2">
          Add Keywords
        </label>
        <div className="flex gap-2 mb-2">
          <textarea
            value={bulkText}
            onChange={(e) => setBulkText(e.target.value)}
            placeholder={"skin care routine\nbest face wash for oily skin\nniacinamide serum"}
            rows={4}
            className="textarea-field flex-1"
            onKeyDown={(e) => {
              if (e.key === "Enter" && e.metaKey) handleAddBulk();
            }}
          />
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleAddBulk}
            disabled={!bulkText.trim() || adding}
            className="btn-primary flex items-center gap-2"
          >
            {adding ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
            Add Keywords
          </button>
          <label className="btn-secondary flex items-center gap-2 cursor-pointer">
            <Upload size={13} />
            Upload CSV
            <input
              ref={fileRef}
              type="file"
              accept=".csv,.txt"
              className="hidden"
              onChange={handleCsvUpload}
            />
          </label>
          <span className="text-xs text-editorial-muted/50">
            one per line, or comma-separated · ⌘↵ to submit
          </span>
        </div>
      </div>

      {/* Keywords list */}
      <div className="card overflow-hidden">
        <div className="px-5 py-3 border-b border-editorial-border/50 flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-widest text-editorial-muted/60">
            {keywords.length} Keyword{keywords.length !== 1 ? "s" : ""}
          </span>
          <div className="flex gap-3 text-2xs text-editorial-muted/50">
            {TYPES.map((t) => (
              <span key={t} className={`px-2 py-0.5 rounded border ${KW_TYPE_COLORS[t]}`}>
                {KW_TYPE_LABELS[t]}: {keywords.filter((k) => k.type === t).length}
              </span>
            ))}
          </div>
        </div>

        {keywords.length === 0 ? (
          <div className="py-12 text-center text-editorial-muted/40">
            <Tag size={24} className="mx-auto mb-2 opacity-30" />
            <p className="text-sm">No keywords yet. Paste some above.</p>
          </div>
        ) : (
          <div className="divide-y divide-editorial-border/30">
            {keywords.map((kw) => (
              <div
                key={kw.id}
                className="flex items-center gap-3 px-5 py-2.5 hover:bg-cream/40 transition-colors"
              >
                <span className="flex-1 text-sm text-editorial-text font-medium">{kw.text}</span>
                <select
                  value={kw.type}
                  onChange={(e) => handleTypeChange(kw, e.target.value as KeywordType)}
                  className={`text-2xs px-2 py-1 rounded border font-medium cursor-pointer ${KW_TYPE_COLORS[kw.type as KeywordType]} bg-transparent`}
                >
                  {TYPES.map((t) => (
                    <option key={t} value={t}>
                      {KW_TYPE_LABELS[t]}
                    </option>
                  ))}
                </select>
                <button
                  onClick={() => handleDelete(kw)}
                  disabled={deletingId === kw.id}
                  className="text-editorial-muted/30 hover:text-rust transition-colors"
                >
                  {deletingId === kw.id ? (
                    <Loader2 size={13} className="animate-spin" />
                  ) : (
                    <X size={13} />
                  )}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Navigation */}
      {hasEnough && hasPrimary && (
        <div className="mt-5 flex justify-end">
          <button onClick={() => setStep("metadata")} className="btn-rust flex items-center gap-2">
            Continue to Metadata Studio →
          </button>
        </div>
      )}
    </div>
  );
}
