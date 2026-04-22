import { useEffect, useState } from "react";
import {
  Loader2,
  CheckCircle2,
  XCircle,
  Download,
  Upload,
  Copy,
  Check,
  ExternalLink,
} from "lucide-react";
import { getVideo, reviewVideo, syncVideo, exportUrl } from "../lib/api";
import { useApp } from "../context/AppContext";
import type { Video } from "../types";
import { STATUS_LABELS, STATUS_COLORS } from "../lib/utils";

export function ReviewPage() {
  const { activeVideoId, triggerRefresh, setStep } = useApp();
  const [video, setVideo] = useState<Video | null>(null);
  const [loading, setLoading] = useState(true);
  const [comment, setComment] = useState("");
  const [actioning, setActioning] = useState<"approve" | "reject" | "sync" | null>(null);
  const [copyStates, setCopyStates] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!activeVideoId) return;
    setLoading(true);
    getVideo(activeVideoId)
      .then(setVideo)
      .finally(() => setLoading(false));
  }, [activeVideoId]);

  async function handleReview(action: "approve" | "reject") {
    if (!activeVideoId) return;
    setActioning(action);
    await reviewVideo(activeVideoId, action, comment || undefined);
    const updated = await getVideo(activeVideoId);
    setVideo(updated);
    setActioning(null);
    setComment("");
    triggerRefresh();
  }

  async function handleSync() {
    if (!activeVideoId) return;
    setActioning("sync");
    try {
      await syncVideo(activeVideoId);
      const updated = await getVideo(activeVideoId);
      setVideo(updated);
      triggerRefresh();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Sync failed");
    } finally {
      setActioning(null);
    }
  }

  async function copyText(key: string, text: string) {
    await navigator.clipboard.writeText(text);
    setCopyStates((s) => ({ ...s, [key]: true }));
    setTimeout(() => setCopyStates((s) => ({ ...s, [key]: false })), 1500);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 size={20} className="animate-spin text-editorial-muted" />
      </div>
    );
  }

  if (!video) return <div className="p-8 text-editorial-muted">Video not found.</div>;

  const title = video.approved_title || video.generated_titles[0] || video.original_title || "Untitled";
  const description = video.approved_description || video.generated_description || "";
  const timestamps = video.approved_timestamps || video.generated_timestamps || "";
  const tags = video.approved_tags?.length ? video.approved_tags : video.generated_tags || [];
  const isApproved = video.status === "approved" || video.status === "synced" || video.status === "exported";

  return (
    <div className="p-8 max-w-3xl">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <p className="section-label mb-1">Step 4</p>
          <h2 className="text-2xl font-serif font-bold text-navy">Review & Approve</h2>
          <p className="text-sm text-editorial-muted mt-0.5">{title}</p>
        </div>
        <span className={`text-xs px-2.5 py-1 rounded-full border font-medium ${STATUS_COLORS[video.status]}`}>
          {STATUS_LABELS[video.status]}
        </span>
      </div>

      {/* Metadata Preview */}
      <div className="space-y-4 mb-6">
        {/* Title */}
        <div className="card p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-2xs font-semibold uppercase tracking-widest text-editorial-muted/60">Title</span>
            <button onClick={() => copyText("title", title)} className="btn-ghost py-1 px-2 flex items-center gap-1">
              {copyStates["title"] ? <Check size={11} className="text-emerald-600" /> : <Copy size={11} />}
              <span className="text-2xs">{copyStates["title"] ? "Copied" : "Copy"}</span>
            </button>
          </div>
          <p className="text-sm font-medium text-navy">{title}</p>
          <p className="text-2xs text-editorial-muted/50 mt-1">{title.length}/100 chars</p>
        </div>

        {/* Description */}
        <div className="card p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-2xs font-semibold uppercase tracking-widest text-editorial-muted/60">Description</span>
            <button onClick={() => copyText("desc", description)} className="btn-ghost py-1 px-2 flex items-center gap-1">
              {copyStates["desc"] ? <Check size={11} className="text-emerald-600" /> : <Copy size={11} />}
              <span className="text-2xs">{copyStates["desc"] ? "Copied" : "Copy"}</span>
            </button>
          </div>
          <pre className="text-xs text-editorial-text font-sans whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto">
            {description || <span className="text-editorial-muted/40 italic">No description generated</span>}
          </pre>
        </div>

        {/* Timestamps */}
        {timestamps && (
          <div className="card p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-2xs font-semibold uppercase tracking-widest text-editorial-muted/60">Timestamps</span>
              <button onClick={() => copyText("ts", timestamps)} className="btn-ghost py-1 px-2 flex items-center gap-1">
                {copyStates["ts"] ? <Check size={11} className="text-emerald-600" /> : <Copy size={11} />}
                <span className="text-2xs">{copyStates["ts"] ? "Copied" : "Copy"}</span>
              </button>
            </div>
            <pre className="text-xs font-mono text-editorial-text whitespace-pre-wrap">{timestamps}</pre>
          </div>
        )}

        {/* Tags */}
        <div className="card p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-2xs font-semibold uppercase tracking-widest text-editorial-muted/60">
              Tags ({tags.length})
            </span>
            <button onClick={() => copyText("tags", tags.join(", "))} className="btn-ghost py-1 px-2 flex items-center gap-1">
              {copyStates["tags"] ? <Check size={11} className="text-emerald-600" /> : <Copy size={11} />}
              <span className="text-2xs">{copyStates["tags"] ? "Copied" : "Copy"}</span>
            </button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {tags.map((t, i) => (
              <span key={i} className="text-2xs px-2 py-0.5 bg-cream-dark border border-cream-border rounded-full text-editorial-muted">
                {t}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Approve / Reject */}
      {!isApproved && (
        <div className="card p-5 mb-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-editorial-muted/60 mb-3">
            Decision
          </p>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Optional comment (shown in audit trail)…"
            rows={2}
            className="textarea-field mb-3"
          />
          <div className="flex gap-3">
            <button
              onClick={() => handleReview("approve")}
              disabled={actioning !== null}
              className="btn-primary flex items-center gap-2"
            >
              {actioning === "approve" ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
              Approve
            </button>
            <button
              onClick={() => handleReview("reject")}
              disabled={actioning !== null}
              className="btn-secondary flex items-center gap-2"
            >
              {actioning === "reject" ? <Loader2 size={14} className="animate-spin" /> : <XCircle size={14} />}
              Reject & Revise
            </button>
          </div>
        </div>
      )}

      {/* Approved actions: sync + export */}
      {isApproved && (
        <div className="card p-5 mb-4 bg-emerald-50 border-emerald-200">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle2 size={16} className="text-emerald-600" />
            <p className="text-sm font-medium text-emerald-700">Approved — ready to sync or export</p>
          </div>
          <div className="flex flex-wrap gap-3">
            {video.source === "owned" && video.youtube_id && (
              <button
                onClick={handleSync}
                disabled={actioning === "sync" || video.status === "synced"}
                className="btn-primary flex items-center gap-2"
              >
                {actioning === "sync" ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Upload size={14} />
                )}
                {video.status === "synced" ? "Synced ✓" : "Push to YouTube"}
              </button>
            )}
            <a
              href={activeVideoId ? exportUrl(activeVideoId, "csv") : "#"}
              download
              className="btn-secondary flex items-center gap-2"
            >
              <Download size={14} /> Export CSV
            </a>
            <a
              href={activeVideoId ? exportUrl(activeVideoId, "text") : "#"}
              download
              className="btn-secondary flex items-center gap-2"
            >
              <Download size={14} /> Export Text
            </a>
            {video.youtube_id && (
              <a
                href={`https://studio.youtube.com/video/${video.youtube_id}/edit`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-ghost flex items-center gap-2"
              >
                <ExternalLink size={13} /> Open in Studio
              </a>
            )}
          </div>

          {video.sync_status === "failed" && video.sync_error && (
            <p className="mt-3 text-xs text-rust bg-rust-bg border border-rust/20 rounded px-3 py-2">
              Sync failed: {video.sync_error}
            </p>
          )}
        </div>
      )}

      {/* Back to edit */}
      <button onClick={() => setStep("metadata")} className="btn-ghost text-xs">
        ← Back to Metadata Studio
      </button>
    </div>
  );
}
