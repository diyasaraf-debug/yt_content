import { useState } from "react";
import { Link2, Youtube, Loader2, CheckCircle2, AlertCircle, Plus, X } from "lucide-react";
import { validateYouTubeUrl, createVideo } from "../lib/api";
import { useApp } from "../context/AppContext";

type Phase = "idle" | "validating" | "confirmed" | "creating" | "done" | "error";

export function AddVideoPage() {
  const { openVideo, triggerRefresh } = useApp();
  const [url, setUrl] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");
  const [actioning, setActioning] = useState(false);
  const [error, setError] = useState("");
  const [videoData, setVideoData] = useState<Record<string, string | number> | null>(null);

  // Extra fields
  const [brand, setBrand] = useState("");
  const [influencer, setInfluencer] = useState("");
  const [language, setLanguage] = useState("en");
  const [region, setRegion] = useState("");
  const [brandUrl, setBrandUrl] = useState("");
  const [productLinks, setProductLinks] = useState("");
  const [notes, setNotes] = useState("");

  async function handleValidate() {
    if (!url.trim()) return;
    setPhase("validating");
    setError("");
    try {
      const res = await validateYouTubeUrl(url.trim());
      if (res.error || !res.video_data) {
        setError(res.error || "Could not fetch video");
        setPhase("error");
        return;
      }
      setVideoData(res.video_data as Record<string, string | number>);
      setPhase("confirmed");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to validate URL");
      setPhase("error");
    }
  }

  async function handleCreate() {
    if (!videoData) return;
    setActioning(true);
    setPhase("creating");
    setError("");
    try {
      const links = productLinks
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean);

      const video = await createVideo({
        source: "influencer",
        youtube_id: videoData.youtube_id,
        original_title: videoData.original_title,
        original_description: videoData.original_description,
        thumbnail_url: videoData.thumbnail_url,
        published_at: videoData.published_at || undefined,
        duration: videoData.duration,
        view_count: videoData.view_count,
        channel_title: videoData.channel_title,
        brand: brand || null,
        influencer: influencer || null,
        language,
        region: region || null,
        brand_url: brandUrl || null,
        product_links: links,
        notes: notes || null,
      });
      setPhase("done");
      setActioning(false);
      triggerRefresh();
      setTimeout(() => openVideo(video.id), 500);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to create video");
      setPhase("error");
      setActioning(false);
    }
  }

  function reset() {
    setUrl("");
    setPhase("idle");
    setError("");
    setVideoData(null);
    setBrand("");
    setInfluencer("");
    setLanguage("en");
    setRegion("");
    setBrandUrl("");
    setProductLinks("");
    setNotes("");
  }

  return (
    <div className="p-8 max-w-2xl">
      <div className="mb-7">
        <p className="section-label mb-1">Intake</p>
        <h2 className="text-2xl font-serif font-bold text-navy">Add Influencer Video</h2>
        <p className="text-sm text-editorial-muted mt-1">
          Paste a public YouTube URL to pull video metadata and start the workflow.
        </p>
      </div>

      {/* URL Input */}
      <div className="card p-5 mb-5">
        <label className="block text-xs font-semibold text-editorial-muted uppercase tracking-widest mb-2">
          YouTube URL
        </label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Link2
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-editorial-muted/50"
            />
            <input
              type="url"
              value={url}
              onChange={(e) => { setUrl(e.target.value); if (phase !== "idle") reset(); }}
              onKeyDown={(e) => e.key === "Enter" && handleValidate()}
              placeholder="https://youtube.com/watch?v=..."
              className="input-field pl-9"
              disabled={phase === "creating" || phase === "done"}
            />
          </div>
          <button
            onClick={handleValidate}
            disabled={!url.trim() || phase === "validating" || phase === "creating"}
            className="btn-primary flex items-center gap-2 shrink-0"
          >
            {phase === "validating" ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Youtube size={14} />
            )}
            Validate
          </button>
        </div>

        {error && (
          <p className="mt-3 text-sm text-rust flex items-center gap-1.5">
            <AlertCircle size={13} /> {error}
          </p>
        )}
      </div>

      {/* Video preview */}
      {videoData && phase !== "idle" && (
        <div className="card p-4 mb-5 flex gap-4">
          {videoData.thumbnail_url && (
            <img
              src={videoData.thumbnail_url as string}
              alt=""
              className="w-28 h-16 object-cover rounded shrink-0"
            />
          )}
          <div className="min-w-0">
            <p className="font-medium text-navy text-sm leading-snug mb-1">
              {videoData.original_title as string}
            </p>
            <p className="text-2xs text-editorial-muted/70">
              {videoData.channel_title as string}
              {videoData.view_count ? ` · ${Number(videoData.view_count).toLocaleString()} views` : ""}
            </p>
            <div className="flex items-center gap-1 mt-1.5 text-emerald-600">
              <CheckCircle2 size={12} />
              <span className="text-2xs font-medium">Video validated</span>
            </div>
          </div>
          <button onClick={reset} className="shrink-0 text-editorial-muted/40 hover:text-rust">
            <X size={14} />
          </button>
        </div>
      )}

      {/* Extra fields — shown once validated */}
      {phase === "confirmed" && (
        <div className="card p-5 space-y-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-editorial-muted/60 mb-2">
            Video Context
          </p>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-editorial-muted mb-1">Brand</label>
              <input
                type="text"
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                placeholder="e.g. Mamaearth"
                className="input-field"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-editorial-muted mb-1">
                Creator / Influencer
              </label>
              <input
                type="text"
                value={influencer}
                onChange={(e) => setInfluencer(e.target.value)}
                placeholder="e.g. @beautyby_xyz"
                className="input-field"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-editorial-muted mb-1">Language</label>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
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
                onChange={(e) => setRegion(e.target.value)}
                placeholder="e.g. IN, Global"
                className="input-field"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-editorial-muted mb-1">Brand URL</label>
            <input
              type="url"
              value={brandUrl}
              onChange={(e) => setBrandUrl(e.target.value)}
              placeholder="https://mamaearth.in/..."
              className="input-field"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-editorial-muted mb-1">
              Product Links{" "}
              <span className="font-normal text-editorial-muted/60">(one per line)</span>
            </label>
            <textarea
              value={productLinks}
              onChange={(e) => setProductLinks(e.target.value)}
              placeholder={"https://mamaearth.in/product/...\nhttps://..."}
              rows={3}
              className="textarea-field"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-editorial-muted mb-1">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any context for the AI generator…"
              rows={2}
              className="textarea-field"
            />
          </div>

          <div className="pt-1">
            <button
              onClick={handleCreate}
              disabled={actioning}
              className="btn-rust flex items-center gap-2"
            >
              {actioning ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Plus size={14} />
              )}
              Create Video Record
            </button>
          </div>
        </div>
      )}

      {phase === "done" && (
        <div className="card p-4 flex items-center gap-2 text-emerald-700 bg-emerald-50 border-emerald-200">
          <CheckCircle2 size={16} />
          <span className="text-sm font-medium">Video created! Redirecting…</span>
        </div>
      )}
    </div>
  );
}
