import { useEffect, useState } from "react";
import {
  Loader2,
  Youtube,
  Tag,
  Sparkles,
  CheckSquare,
  Upload,
  ChevronRight,
  ExternalLink,
  Save,
} from "lucide-react";
import { getVideo, updateVideo } from "../lib/api";
import { useApp } from "../context/AppContext";
import type { Video } from "../types";
import { STATUS_LABELS, STATUS_COLORS, STATUS_ORDER, statusIndex, timeAgo } from "../lib/utils";

const STEPS = [
  { key: "draft", label: "Intake" },
  { key: "keywords_ready", label: "Keywords" },
  { key: "generated", label: "Generated" },
  { key: "approved", label: "Approved" },
  { key: "synced", label: "Synced" },
];

export function VideoDetailPage() {
  const { activeVideoId, setStep, triggerRefresh } = useApp();
  const [video, setVideo] = useState<Video | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Editable fields
  const [brand, setBrand] = useState("");
  const [influencer, setInfluencer] = useState("");
  const [language, setLanguage] = useState("en");
  const [region, setRegion] = useState("");
  const [brandUrl, setBrandUrl] = useState("");
  const [notes, setNotes] = useState("");
  const [transcript, setTranscript] = useState("");
  const [productLinksText, setProductLinksText] = useState("");
  const [edited, setEdited] = useState(false);

  useEffect(() => {
    if (!activeVideoId) return;
    setLoading(true);
    getVideo(activeVideoId)
      .then((v) => {
        setVideo(v);
        setBrand(v.brand || "");
        setInfluencer(v.influencer || "");
        setLanguage(v.language || "en");
        setRegion(v.region || "");
        setBrandUrl(v.brand_url || "");
        setNotes(v.notes || "");
        setTranscript(v.transcript || "");
        setProductLinksText((v.product_links || []).join("\n"));
        setEdited(false);
      })
      .finally(() => setLoading(false));
  }, [activeVideoId]);

  async function handleSave() {
    if (!activeVideoId) return;
    setSaving(true);
    const links = productLinksText.split("\n").map((l) => l.trim()).filter(Boolean);
    await updateVideo(activeVideoId, {
      brand: brand || null,
      influencer: influencer || null,
      language,
      region: region || null,
      brand_url: brandUrl || null,
      notes: notes || null,
      transcript: transcript || null,
      product_links: links,
    });
    setSaving(false);
    setEdited(false);
    const v = await getVideo(activeVideoId);
    setVideo(v);
    triggerRefresh();
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 size={20} className="animate-spin text-editorial-muted" />
      </div>
    );
  }

  if (!video) {
    return <div className="p-8 text-editorial-muted">Video not found.</div>;
  }

  const currentIdx = statusIndex(video.status);
  const title = video.approved_title || video.original_title || "Untitled";

  return (
    <div className="p-8 max-w-4xl">
      {/* Header */}
      <div className="mb-6">
        <p className="section-label mb-1">Video</p>
        <div className="flex items-start justify-between gap-4">
          <h2 className="text-2xl font-serif font-bold text-navy leading-tight max-w-xl">
            {title}
          </h2>
          <div className="flex items-center gap-2 shrink-0">
            <span className={`text-xs px-2.5 py-1 rounded-full border font-medium ${STATUS_COLORS[video.status]}`}>
              {STATUS_LABELS[video.status]}
            </span>
            {video.youtube_id && (
              <a
                href={`https://youtube.com/watch?v=${video.youtube_id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-editorial-muted/50 hover:text-rust transition-colors"
              >
                <ExternalLink size={14} />
              </a>
            )}
          </div>
        </div>
        <p className="text-xs text-editorial-muted/60 mt-1">
          {video.source === "owned" ? "Owned channel" : "Influencer video"} ·{" "}
          {video.channel_title || "—"} · Updated {timeAgo(video.updated_at)}
        </p>
      </div>

      {/* Workflow Stepper */}
      <div className="card p-5 mb-6">
        <div className="flex items-center justify-between">
          {STEPS.map((s, i) => {
            const done = currentIdx > i;
            const active = currentIdx === i;
            return (
              <div key={s.key} className="flex items-center flex-1">
                <div className="flex flex-col items-center gap-1">
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-colors ${
                      done
                        ? "bg-navy border-navy text-white"
                        : active
                        ? "bg-rust border-rust text-white"
                        : "bg-cream border-cream-border text-editorial-muted/40"
                    }`}
                  >
                    {done ? "✓" : i + 1}
                  </div>
                  <span
                    className={`text-2xs font-medium ${
                      active ? "text-rust" : done ? "text-navy" : "text-editorial-muted/40"
                    }`}
                  >
                    {s.label}
                  </span>
                </div>
                {i < STEPS.length - 1 && (
                  <div
                    className={`flex-1 h-0.5 mx-2 ${done ? "bg-navy/30" : "bg-cream-border"}`}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-5">
        {/* Left: thumbnail + quick actions */}
        <div className="col-span-1 space-y-4">
          {video.thumbnail_url ? (
            <img
              src={video.thumbnail_url}
              alt={title}
              className="w-full rounded-lg border border-editorial-border object-cover aspect-video"
            />
          ) : (
            <div className="w-full aspect-video bg-cream-dark rounded-lg border border-editorial-border flex items-center justify-center">
              <Youtube size={24} className="text-editorial-muted/30" />
            </div>
          )}

          {/* Action buttons */}
          <div className="card divide-y divide-editorial-border/50">
            <button
              onClick={() => setStep("keywords")}
              className="w-full flex items-center justify-between px-4 py-3 hover:bg-cream/60 transition-colors text-left"
            >
              <div className="flex items-center gap-2">
                <Tag size={14} className="text-editorial-muted" />
                <span className="text-sm text-editorial-text">Keywords</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-editorial-muted/60">
                  {video.keywords.length} added
                </span>
                <ChevronRight size={13} className="text-editorial-muted/40" />
              </div>
            </button>
            <button
              onClick={() => setStep("metadata")}
              className="w-full flex items-center justify-between px-4 py-3 hover:bg-cream/60 transition-colors text-left"
            >
              <div className="flex items-center gap-2">
                <Sparkles size={14} className="text-editorial-muted" />
                <span className="text-sm text-editorial-text">Metadata Studio</span>
              </div>
              <div className="flex items-center gap-1.5">
                {video.generated_titles.length > 0 && (
                  <span className="text-2xs text-emerald-600 font-medium">Generated</span>
                )}
                <ChevronRight size={13} className="text-editorial-muted/40" />
              </div>
            </button>
            <button
              onClick={() => setStep("review")}
              className="w-full flex items-center justify-between px-4 py-3 hover:bg-cream/60 transition-colors text-left"
            >
              <div className="flex items-center gap-2">
                <CheckSquare size={14} className="text-editorial-muted" />
                <span className="text-sm text-editorial-text">Review</span>
              </div>
              <ChevronRight size={13} className="text-editorial-muted/40" />
            </button>
          </div>
        </div>

        {/* Right: editable fields */}
        <div className="col-span-2 space-y-4">
          <div className="card p-5">
            <p className="text-xs font-semibold uppercase tracking-widest text-editorial-muted/60 mb-4">
              Video Context
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-editorial-muted mb-1">Brand</label>
                <input
                  type="text"
                  value={brand}
                  onChange={(e) => { setBrand(e.target.value); setEdited(true); }}
                  className="input-field"
                  placeholder="e.g. Mamaearth"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-editorial-muted mb-1">Creator</label>
                <input
                  type="text"
                  value={influencer}
                  onChange={(e) => { setInfluencer(e.target.value); setEdited(true); }}
                  className="input-field"
                  placeholder="@creator_handle"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-editorial-muted mb-1">Language</label>
                <select
                  value={language}
                  onChange={(e) => { setLanguage(e.target.value); setEdited(true); }}
                  className="input-field"
                >
                  <option value="en">English</option>
                  <option value="hi">Hindi</option>
                  <option value="ta">Tamil</option>
                  <option value="te">Telugu</option>
                  <option value="mr">Marathi</option>
                  <option value="bn">Bengali</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-editorial-muted mb-1">Region</label>
                <input
                  type="text"
                  value={region}
                  onChange={(e) => { setRegion(e.target.value); setEdited(true); }}
                  className="input-field"
                  placeholder="IN, Global…"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-medium text-editorial-muted mb-1">Brand URL</label>
                <input
                  type="url"
                  value={brandUrl}
                  onChange={(e) => { setBrandUrl(e.target.value); setEdited(true); }}
                  className="input-field"
                  placeholder="https://..."
                />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-medium text-editorial-muted mb-1">
                  Product Links <span className="font-normal text-editorial-muted/60">(one per line)</span>
                </label>
                <textarea
                  value={productLinksText}
                  onChange={(e) => { setProductLinksText(e.target.value); setEdited(true); }}
                  rows={2}
                  className="textarea-field"
                  placeholder="https://..."
                />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-medium text-editorial-muted mb-1">Notes</label>
                <textarea
                  value={notes}
                  onChange={(e) => { setNotes(e.target.value); setEdited(true); }}
                  rows={2}
                  className="textarea-field"
                  placeholder="Context for AI generator…"
                />
              </div>
            </div>
          </div>

          {/* Transcript */}
          <div className="card p-5">
            <label className="block text-xs font-semibold uppercase tracking-widest text-editorial-muted/60 mb-3">
              Transcript <span className="font-normal normal-case">(paste or upload)</span>
            </label>
            <textarea
              value={transcript}
              onChange={(e) => { setTranscript(e.target.value); setEdited(true); }}
              rows={6}
              className="textarea-field"
              placeholder="Paste the video transcript here… Used by AI to generate timestamps and better descriptions."
            />
            {!transcript && (
              <p className="mt-1.5 text-2xs text-amber-600 flex items-center gap-1">
                ⚠ No transcript — AI generation will be less accurate
              </p>
            )}
          </div>

          {edited && (
            <button
              onClick={handleSave}
              disabled={saving}
              className="btn-primary flex items-center gap-2"
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              Save Changes
            </button>
          )}

          {/* Audit trail */}
          {video.audit_logs.length > 0 && (
            <div className="card p-5">
              <p className="text-xs font-semibold uppercase tracking-widest text-editorial-muted/60 mb-3">
                Activity
              </p>
              <div className="space-y-2">
                {video.audit_logs.map((log) => (
                  <div key={log.id} className="flex items-start gap-2 text-xs text-editorial-muted">
                    <span className="font-medium capitalize text-editorial-text">{log.action}</span>
                    {log.comment && <span>— {log.comment}</span>}
                    <span className="ml-auto text-editorial-muted/50 shrink-0">
                      {timeAgo(log.created_at)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
