import { useEffect, useState } from "react";
import {
  Plus,
  Loader2,
  Video,
  CheckCircle2,
  Tv2,
  LayoutDashboard,
  ChevronRight,
  Clock,
} from "lucide-react";
import { listVideos } from "../../lib/api";
import { useApp } from "../../context/AppContext";
import type { VideoListItem } from "../../types";
import { STATUS_COLORS, STATUS_LABELS, truncate } from "../../lib/utils";

export function Sidebar() {
  const { step, setStep, openVideo, activeVideoId, refreshTrigger } = useApp();
  const [inProgress, setInProgress] = useState<VideoListItem[]>([]);
  const [approved, setApproved] = useState<VideoListItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      listVideos({ status: "draft" }),
      listVideos({ status: "keywords_ready" }),
      listVideos({ status: "generated" }),
      listVideos({ status: "approved" }),
    ])
      .then(([drafts, kwReady, generated, approvedList]) => {
        setInProgress([...drafts, ...kwReady, ...generated]);
        setApproved(approvedList);
      })
      .finally(() => setLoading(false));
  }, [refreshTrigger]);

  return (
    <aside className="fixed left-0 top-0 bottom-0 w-52 bg-cream border-r border-cream-border flex flex-col z-20">
      {/* Brand */}
      <div className="px-5 pt-6 pb-4 border-b border-cream-border">
        <p className="section-label text-2xs mb-1">Content Ops</p>
        <h1 className="text-base font-serif font-bold text-navy">YT Metadata</h1>
      </div>

      <div className="flex-1 overflow-y-auto py-3 space-y-4">

        {/* Dashboard */}
        <div>
          <button
            onClick={() => setStep("dashboard")}
            className={`w-full flex items-center gap-3 px-5 py-2.5 text-left transition-colors border-l-2 ${
              step === "dashboard"
                ? "bg-cream-dark border-rust"
                : "border-transparent hover:bg-cream-dark/50"
            }`}
          >
            <LayoutDashboard
              size={14}
              className={step === "dashboard" ? "text-rust" : "text-editorial-muted"}
            />
            <span
              className={`text-sm ${step === "dashboard" ? "font-medium text-navy" : "text-editorial-muted"}`}
            >
              All Videos
            </span>
          </button>
        </div>

        {/* In Progress */}
        {(loading || inProgress.length > 0) && (
          <div>
            <p className="px-5 text-2xs font-semibold tracking-widest uppercase text-editorial-muted/50 mb-1">
              In Progress
            </p>
            {loading ? (
              <div className="px-5 py-2 flex items-center gap-2 text-editorial-muted/40">
                <Loader2 size={12} className="animate-spin" />
              </div>
            ) : (
              inProgress.slice(0, 8).map((v) => {
                const isActive = activeVideoId === v.id;
                const title = v.approved_title || v.original_title || "Untitled";
                return (
                  <button
                    key={v.id}
                    onClick={() => openVideo(v.id)}
                    className={`w-full flex items-center gap-3 px-5 py-2.5 text-left transition-colors border-l-2 ${
                      isActive
                        ? "bg-cream-dark border-rust"
                        : "border-transparent hover:bg-cream-dark/50"
                    }`}
                  >
                    <Clock
                      size={14}
                      className={`shrink-0 ${isActive ? "text-rust" : "text-amber-500"}`}
                    />
                    <div className="min-w-0 flex-1">
                      <span
                        className={`text-sm block leading-tight truncate ${isActive ? "font-medium text-navy" : "text-editorial-muted"}`}
                      >
                        {truncate(title, 22)}
                      </span>
                      <span
                        className={`text-2xs px-1 py-0.5 rounded border ${STATUS_COLORS[v.status]}`}
                      >
                        {STATUS_LABELS[v.status]}
                      </span>
                    </div>
                    <ChevronRight size={12} className="shrink-0 text-editorial-muted/40" />
                  </button>
                );
              })
            )}
          </div>
        )}

        {/* Approved */}
        {approved.length > 0 && (
          <div>
            <p className="px-5 text-2xs font-semibold tracking-widest uppercase text-editorial-muted/50 mb-1">
              Approved
            </p>
            {approved.slice(0, 6).map((v) => {
              const isActive = activeVideoId === v.id;
              const title = v.approved_title || v.original_title || "Untitled";
              return (
                <button
                  key={v.id}
                  onClick={() => openVideo(v.id)}
                  className={`w-full flex items-center gap-3 px-5 py-2.5 text-left transition-colors border-l-2 ${
                    isActive
                      ? "bg-cream-dark border-rust"
                      : "border-transparent hover:bg-cream-dark/50"
                  }`}
                >
                  <CheckCircle2
                    size={14}
                    className={`shrink-0 ${isActive ? "text-rust" : "text-emerald-500"}`}
                  />
                  <div className="min-w-0">
                    <span
                      className={`text-sm block leading-tight truncate ${isActive ? "font-medium text-navy" : "text-editorial-muted"}`}
                    >
                      {truncate(title, 22)}
                    </span>
                    <span className="text-2xs text-editorial-muted/60">
                      {v.brand || v.influencer || v.source}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* Channels */}
        <div>
          <button
            onClick={() => setStep("channels")}
            className={`w-full flex items-center gap-3 px-5 py-2.5 text-left transition-colors border-l-2 ${
              step === "channels"
                ? "bg-cream-dark border-rust"
                : "border-transparent hover:bg-cream-dark/50"
            }`}
          >
            <Tv2
              size={14}
              className={step === "channels" ? "text-rust" : "text-editorial-muted"}
            />
            <span
              className={`text-sm ${step === "channels" ? "font-medium text-navy" : "text-editorial-muted"}`}
            >
              Channels
            </span>
          </button>
        </div>
      </div>

      {/* Add Video */}
      <div className="border-t border-cream-border px-4 py-3">
        <button
          onClick={() => setStep("add-video")}
          className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-left transition-colors ${
            step === "add-video"
              ? "bg-rust/10 text-rust font-medium"
              : "text-editorial-muted hover:bg-cream-dark"
          }`}
        >
          <Plus size={14} className="shrink-0" />
          <span className="text-sm">Add Video</span>
        </button>
      </div>

      <div className="px-5 py-2 border-t border-cream-border">
        <p className="text-2xs text-editorial-muted/40">YT Metadata v0.1</p>
      </div>
    </aside>
  );
}
