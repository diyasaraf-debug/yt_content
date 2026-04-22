import type { VideoStatus, KeywordType } from "../types";

export const STATUS_LABELS: Record<VideoStatus, string> = {
  draft: "Draft",
  keywords_ready: "Keywords Ready",
  generated: "Generated",
  approved: "Approved",
  synced: "Synced",
  exported: "Exported",
};

export const STATUS_COLORS: Record<VideoStatus, string> = {
  draft: "bg-stone-100 text-stone-600 border-stone-200",
  keywords_ready: "bg-sky-50 text-sky-700 border-sky-200",
  generated: "bg-violet-50 text-violet-700 border-violet-200",
  approved: "bg-emerald-50 text-emerald-700 border-emerald-200",
  synced: "bg-teal-50 text-teal-700 border-teal-200",
  exported: "bg-amber-50 text-amber-700 border-amber-200",
};

export const KW_TYPE_COLORS: Record<KeywordType, string> = {
  primary: "bg-rust-bg text-rust border-rust/30",
  secondary: "bg-cream-dark text-editorial-muted border-cream-border",
  long_tail: "bg-amber-50 text-amber-700 border-amber-200",
};

export const KW_TYPE_LABELS: Record<KeywordType, string> = {
  primary: "Primary",
  secondary: "Secondary",
  long_tail: "Long-tail",
};

export function formatDate(d?: string | null): string {
  if (!d) return "—";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(d));
}

export function timeAgo(d?: string | null): string {
  if (!d) return "—";
  const ms = Date.now() - new Date(d).getTime();
  const mins = Math.floor(ms / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return formatDate(d);
}

export function truncate(s: string, n: number): string {
  return s.length <= n ? s : s.slice(0, n - 1) + "…";
}

export const STATUS_ORDER: VideoStatus[] = [
  "draft",
  "keywords_ready",
  "generated",
  "approved",
  "synced",
  "exported",
];

export function statusIndex(s: VideoStatus): number {
  return STATUS_ORDER.indexOf(s);
}
