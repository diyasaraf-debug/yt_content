import { useEffect, useState } from "react";
import {
  Sparkles,
  Loader2,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  RefreshCw,
} from "lucide-react";
import { getVideo, generateMetadata, saveMetadata } from "../lib/api";
import { useApp } from "../context/AppContext";
import type { Video } from "../types";

function CharCounter({ value, max }: { value: string; max: number }) {
  const len = value.length;
  const over = len > max;
  return (
    <span className={`text-2xs ${over ? "text-rust font-medium" : "text-editorial-muted/50"}`}>
      {len}/{max}
    </span>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }
  return (
    <button onClick={copy} className="btn-ghost flex items-center gap-1 py-1 px-2">
      {copied ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
      <span className="text-2xs">{copied ? "Copied" : "Copy"}</span>
    </button>
  );
}

export function MetadataPage() {
  const { activeVideoId, setStep, triggerRefresh } = useApp();
  const [video, setVideo] = useState<Video | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  const [selectedTitleIdx, setSelectedTitleIdx] = useState(0);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editTimestamps, setEditTimestamps] = useState("");
  const [editTags, setEditTags] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showAllTitles, setShowAllTitles] = useState(false);

  useEffect(() => {
    if (!activeVideoId) return;
    setLoading(true);
    getVideo(activeVideoId)
      .then((v) => {
        setVideo(v);
        prefillFromVideo(v);
      })
      .finally(() => setLoading(false));
  }, [activeVideoId]);

  function prefillFromVideo(v: Video) {
    setEditTitle(v.approved_title || v.generated_titles[0] || "");
    setEditDescription(v.approved_description || v.generated_description || "");
    setEditTimestamps(v.approved_timestamps || v.generated_timestamps || "");
    setEditTags((v.approved_tags?.length ? v.approved_tags : v.generated_tags || []).join(", "));
    setSelectedTitleIdx(0);
  }

  async function handleGenerate() {
    if (!activeVideoId) return;
    setGenerating(true);
    try {
      const result = await generateMetadata(activeVideoId);
      const updated = await getVideo(activeVideoId);
      setVideo(updated);
      setEditTitle(result.titles[0] || "");
      setEditDescription(result.description || "");
      setEditTimestamps(result.timestamps || "");
      setEditTags((result.tags || []).join(", "));
      setSelectedTitleIdx(0);
      triggerRefresh();
    } finally {
      setGenerating(false);
    }
  }

  async function handleSave() {
    if (!activeVideoId) return;
    setSaving(true);
    const tags = editTags
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    await saveMetadata(activeVideoId, {
      approved_title: editTitle,
      approved_description: editDescription,
      approved_timestamps: editTimestamps,
      approved_tags: tags,
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    triggerRefresh();
  }

  function pickTitle(idx: number) {
    setSelectedTitleIdx(idx);
    setEditTitle(video?.generated_titles[idx] || "");
    setShowAllTitles(false);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 size={20} className="animate-spin text-editorial-muted" />
      </div>
    );
  }

  const pageTitle = video?.approved_title || video?.original_title || "Untitled";
  const hasGenerated = (video?.generated_titles.length ?? 0) > 0;

  return (
    <div className="p-8 max-w-3xl">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <p className="section-label mb-1">Step 3</p>
          <h2 className="text-2xl font-serif font-bold text-navy">Metadata Studio</h2>
          <p className="text-sm text-editorial-muted mt-0.5">{pageTitle}</p>
        </div>
        <button
          onClick={handleGenerate}
          disabled={generating}
          className="btn-rust flex items-center gap-2 shrink-0"
        >
          {generating ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <Sparkles size={14} />
          )}
          {hasGenerated ? "Regenerate" : "Generate with AI"}
        </button>
      </div>

      {generating && (
        <div className="card p-5 mb-5 flex items-center gap-3 bg-cream border-cream-border">
          <Loader2 size={16} className="animate-spin text-rust" />
          <div>
            <p className="text-sm font-medium text-navy">Generating metadata…</p>
            <p className="text-2xs text-editorial-muted">
              Claude is writing titles, description, timestamps, and tags
            </p>
          </div>
        </div>
      )}

      {/* Title */}
      <div className="card p-5 mb-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold uppercase tracking-widest text-editorial-muted/60">
            Title
          </span>
          <div className="flex items-center gap-2">
            <CharCounter value={editTitle} max={100} />
            <CopyButton text={editTitle} />
          </div>
        </div>
        <input
          type="text"
          value={editTitle}
          onChange={(e) => setEditTitle(e.target.value)}
          className="input-field text-base font-medium"
          placeholder="Video title…"
        />

        {/* Title options */}
        {(video?.generated_titles.length ?? 0) > 1 && (
          <div className="mt-3">
            <button
              onClick={() => setShowAllTitles(!showAllTitles)}
              className="text-2xs text-editorial-muted/60 flex items-center gap-1 hover:text-editorial-muted"
            >
              {showAllTitles ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
              {video!.generated_titles.length - 1} alternative{video!.generated_titles.length > 2 ? "s" : ""}
            </button>
            {showAllTitles && (
              <div className="mt-2 space-y-1.5">
                {video!.generated_titles.map((t, i) => (
                  <button
                    key={i}
                    onClick={() => pickTitle(i)}
                    className={`w-full text-left px-3 py-2 rounded border text-sm transition-colors ${
                      selectedTitleIdx === i
                        ? "border-navy/30 bg-navy/5 text-navy"
                        : "border-editorial-border text-editorial-muted hover:bg-cream-dark"
                    }`}
                  >
                    <span className="text-2xs font-medium mr-2 text-editorial-muted/50">
                      Option {i + 1}
                    </span>
                    {t}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Description */}
      <div className="card p-5 mb-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold uppercase tracking-widest text-editorial-muted/60">
            Description
          </span>
          <div className="flex items-center gap-2">
            <CharCounter value={editDescription} max={5000} />
            <CopyButton text={editDescription} />
          </div>
        </div>
        <textarea
          value={editDescription}
          onChange={(e) => setEditDescription(e.target.value)}
          rows={10}
          className="textarea-field font-mono text-xs leading-relaxed"
          placeholder="YouTube description will appear here after generation…"
        />
      </div>

      {/* Timestamps */}
      <div className="card p-5 mb-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold uppercase tracking-widest text-editorial-muted/60">
            Timestamps
          </span>
          <CopyButton text={editTimestamps} />
        </div>
        <textarea
          value={editTimestamps}
          onChange={(e) => setEditTimestamps(e.target.value)}
          rows={6}
          className="textarea-field font-mono text-xs"
          placeholder={"0:00 Introduction\n0:30 Topic…"}
        />
      </div>

      {/* Tags */}
      <div className="card p-5 mb-5">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold uppercase tracking-widest text-editorial-muted/60">
            Tags
          </span>
          <div className="flex items-center gap-2">
            <span className="text-2xs text-editorial-muted/50">
              {editTags.split(",").filter((t) => t.trim()).length} tags
            </span>
            <CopyButton text={editTags} />
          </div>
        </div>
        <textarea
          value={editTags}
          onChange={(e) => setEditTags(e.target.value)}
          rows={3}
          className="textarea-field text-xs"
          placeholder="tag1, tag2, tag3…"
        />
        {/* Tag chips preview */}
        {editTags.trim() && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {editTags
              .split(",")
              .map((t) => t.trim())
              .filter(Boolean)
              .slice(0, 20)
              .map((t, i) => (
                <span
                  key={i}
                  className="text-2xs px-2 py-0.5 bg-cream-dark border border-cream-border rounded-full text-editorial-muted"
                >
                  {t}
                </span>
              ))}
          </div>
        )}
      </div>

      {/* Save + Continue */}
      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={saving || !editTitle}
          className="btn-primary flex items-center gap-2"
        >
          {saving ? (
            <Loader2 size={13} className="animate-spin" />
          ) : saved ? (
            <Check size={13} className="text-emerald-400" />
          ) : (
            <Check size={13} />
          )}
          {saved ? "Saved!" : "Save Metadata"}
        </button>
        <button
          onClick={() => setStep("review")}
          className="btn-rust flex items-center gap-2"
          disabled={!editTitle}
        >
          Continue to Review →
        </button>
      </div>
    </div>
  );
}
