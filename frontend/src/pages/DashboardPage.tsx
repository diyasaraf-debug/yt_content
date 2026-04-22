import { useEffect, useState } from "react";
import { Search, Plus, Trash2, ExternalLink, Loader2, Video } from "lucide-react";
import { listVideos, deleteVideo } from "../lib/api";
import { useApp } from "../context/AppContext";
import type { VideoListItem, VideoStatus } from "../types";
import {
  STATUS_LABELS,
  STATUS_COLORS,
  timeAgo,
  truncate,
} from "../lib/utils";

const ALL_STATUSES: VideoStatus[] = [
  "draft",
  "keywords_ready",
  "generated",
  "approved",
  "synced",
  "exported",
];

export function DashboardPage() {
  const { setStep, openVideo, triggerRefresh, refreshTrigger } = useApp();
  const [videos, setVideos] = useState<VideoListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [filterStatus, setFilterStatus] = useState<VideoStatus | "">("");
  const [filterSource, setFilterSource] = useState<"" | "owned" | "influencer">("");
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    listVideos({
      status: filterStatus || undefined,
      source: filterSource || undefined,
      q: q || undefined,
    })
      .then(setVideos)
      .finally(() => setLoading(false));
  }, [filterStatus, filterSource, q, refreshTrigger]);

  async function handleDelete(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    if (!confirm("Delete this video record?")) return;
    setDeleting(id);
    await deleteVideo(id).catch(console.error);
    setDeleting(null);
    triggerRefresh();
  }

  const counts: Record<string, number> = {};
  videos.forEach((v) => { counts[v.status] = (counts[v.status] || 0) + 1; });

  return (
    <div className="p-8 max-w-5xl">
      {/* Header */}
      <div className="mb-7">
        <p className="section-label mb-1">Content Ops</p>
        <h2 className="text-2xl font-serif font-bold text-navy mb-1">Video Library</h2>
        <p className="text-sm text-editorial-muted">
          {videos.length} video{videos.length !== 1 ? "s" : ""} in queue
        </p>
      </div>

      {/* Status summary pills */}
      <div className="flex flex-wrap gap-2 mb-6">
        <button
          onClick={() => setFilterStatus("")}
          className={`px-3 py-1 text-xs rounded-full border transition-colors ${
            filterStatus === ""
              ? "bg-navy text-white border-navy"
              : "border-editorial-border text-editorial-muted hover:bg-cream-dark"
          }`}
        >
          All ({videos.length})
        </button>
        {ALL_STATUSES.map((s) => (
          <button
            key={s}
            onClick={() => setFilterStatus(s === filterStatus ? "" : s)}
            className={`px-3 py-1 text-xs rounded-full border transition-colors ${
              filterStatus === s
                ? STATUS_COLORS[s] + " font-medium"
                : "border-editorial-border text-editorial-muted hover:bg-cream-dark"
            }`}
          >
            {STATUS_LABELS[s]} ({counts[s] || 0})
          </button>
        ))}
      </div>

      {/* Filters row */}
      <div className="flex items-center gap-3 mb-5">
        <div className="relative flex-1 max-w-xs">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-editorial-muted/50"
          />
          <input
            type="text"
            placeholder="Search title, brand, creator…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="input-field pl-8"
          />
        </div>
        <select
          value={filterSource}
          onChange={(e) => setFilterSource(e.target.value as typeof filterSource)}
          className="input-field w-36"
        >
          <option value="">All Sources</option>
          <option value="owned">Owned</option>
          <option value="influencer">Influencer</option>
        </select>
        <button onClick={() => setStep("add-video")} className="btn-rust flex items-center gap-2">
          <Plus size={14} />
          Add Video
        </button>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center gap-2 text-editorial-muted py-16 justify-center">
          <Loader2 size={18} className="animate-spin" />
          <span className="text-sm">Loading…</span>
        </div>
      ) : videos.length === 0 ? (
        <div className="text-center py-20 text-editorial-muted/60">
          <Video size={32} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">No videos yet. Add one to get started.</p>
          <button
            onClick={() => setStep("add-video")}
            className="btn-rust mt-4 inline-flex items-center gap-2"
          >
            <Plus size={14} /> Add your first video
          </button>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-editorial-border bg-cream/60">
                <th className="text-left py-3 px-4 text-2xs font-semibold tracking-widest uppercase text-editorial-muted/60">
                  Video
                </th>
                <th className="text-left py-3 px-3 text-2xs font-semibold tracking-widest uppercase text-editorial-muted/60">
                  Source
                </th>
                <th className="text-left py-3 px-3 text-2xs font-semibold tracking-widest uppercase text-editorial-muted/60">
                  Status
                </th>
                <th className="text-left py-3 px-3 text-2xs font-semibold tracking-widest uppercase text-editorial-muted/60">
                  Keywords
                </th>
                <th className="text-left py-3 px-3 text-2xs font-semibold tracking-widest uppercase text-editorial-muted/60">
                  Updated
                </th>
                <th className="py-3 px-3" />
              </tr>
            </thead>
            <tbody>
              {videos.map((v, i) => {
                const title = v.approved_title || v.original_title || "Untitled";
                return (
                  <tr
                    key={v.id}
                    onClick={() => openVideo(v.id)}
                    className={`cursor-pointer hover:bg-cream/60 transition-colors ${
                      i < videos.length - 1 ? "border-b border-editorial-border/50" : ""
                    }`}
                  >
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        {v.thumbnail_url ? (
                          <img
                            src={v.thumbnail_url}
                            alt=""
                            className="w-14 h-9 object-cover rounded shrink-0"
                          />
                        ) : (
                          <div className="w-14 h-9 bg-cream-dark rounded shrink-0 flex items-center justify-center">
                            <Video size={14} className="text-editorial-muted/40" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="font-medium text-navy truncate max-w-[220px]">
                            {truncate(title, 40)}
                          </p>
                          {(v.brand || v.influencer) && (
                            <p className="text-2xs text-editorial-muted/70 truncate">
                              {v.brand || v.influencer}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className={`text-2xs px-2 py-0.5 rounded-full border font-medium ${
                          v.source === "owned"
                            ? "bg-amber-50 text-amber-700 border-amber-200"
                            : "bg-pink-50 text-pink-700 border-pink-200"
                        }`}
                      >
                        {v.source === "owned" ? "Owned" : "Influencer"}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className={`text-2xs px-2 py-0.5 rounded-full border font-medium ${STATUS_COLORS[v.status]}`}
                      >
                        {STATUS_LABELS[v.status]}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <span className="text-xs text-editorial-muted">
                        {v.keyword_count} kw
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <span className="text-xs text-editorial-muted/60">
                        {timeAgo(v.updated_at)}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-1">
                        {v.youtube_id && (
                          <a
                            href={`https://youtube.com/watch?v=${v.youtube_id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="p-1.5 text-editorial-muted/50 hover:text-rust transition-colors rounded"
                          >
                            <ExternalLink size={13} />
                          </a>
                        )}
                        <button
                          onClick={(e) => handleDelete(v.id, e)}
                          disabled={deleting === v.id}
                          className="p-1.5 text-editorial-muted/50 hover:text-rust transition-colors rounded"
                        >
                          {deleting === v.id ? (
                            <Loader2 size={13} className="animate-spin" />
                          ) : (
                            <Trash2 size={13} />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
