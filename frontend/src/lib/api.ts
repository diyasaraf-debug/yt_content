import type { Video, VideoListItem, Keyword, Channel } from "../types";

const API_BASE = import.meta.env.VITE_API_URL || "/api";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...options?.headers },
    ...options,
  });
  if (!res.ok) {
    const text = await res.text();
    let msg = text;
    try {
      msg = JSON.parse(text)?.detail || text;
    } catch {}
    throw new Error(`API ${res.status}: ${msg}`);
  }
  return res.json();
}

// ── YouTube ──────────────────────────────────────────────────────────────────

export async function validateYouTubeUrl(url: string) {
  return request<{ video_data?: Record<string, unknown>; error?: string }>(
    "/youtube/validate",
    { method: "POST", body: JSON.stringify({ url }) }
  );
}

// ── Videos ───────────────────────────────────────────────────────────────────

export async function listVideos(params?: {
  status?: string;
  source?: string;
  q?: string;
}): Promise<VideoListItem[]> {
  const qs = new URLSearchParams();
  if (params?.status) qs.set("status", params.status);
  if (params?.source) qs.set("source", params.source);
  if (params?.q) qs.set("q", params.q);
  const query = qs.toString() ? `?${qs}` : "";
  return request<VideoListItem[]>(`/videos${query}`);
}

export async function getVideo(id: string): Promise<Video> {
  return request<Video>(`/videos/${id}`);
}

export async function createVideo(data: Record<string, unknown>): Promise<Video> {
  return request<Video>("/videos", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateVideo(
  id: string,
  data: Record<string, unknown>
): Promise<Video> {
  return request<Video>(`/videos/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export async function deleteVideo(id: string): Promise<void> {
  await request(`/videos/${id}`, { method: "DELETE" });
}

// ── Keywords ─────────────────────────────────────────────────────────────────

export async function getKeywords(videoId: string): Promise<Keyword[]> {
  return request<Keyword[]>(`/videos/${videoId}/keywords`);
}

export async function addKeywords(
  videoId: string,
  payload: { text?: string; keywords?: { text: string; type: string }[] }
): Promise<Keyword[]> {
  return request<Keyword[]>(`/videos/${videoId}/keywords`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateKeywordType(
  videoId: string,
  keywordId: string,
  type: string
): Promise<Keyword> {
  return request<Keyword>(`/videos/${videoId}/keywords/${keywordId}`, {
    method: "PATCH",
    body: JSON.stringify({ type }),
  });
}

export async function deleteKeyword(
  videoId: string,
  keywordId: string
): Promise<void> {
  await request(`/videos/${videoId}/keywords/${keywordId}`, {
    method: "DELETE",
  });
}

// ── Metadata ─────────────────────────────────────────────────────────────────

export async function generateMetadata(videoId: string) {
  return request<{
    titles: string[];
    description: string;
    timestamps: string;
    tags: string[];
    status: string;
  }>(`/videos/${videoId}/generate`, { method: "POST" });
}

export async function saveMetadata(
  videoId: string,
  data: {
    approved_title?: string;
    approved_description?: string;
    approved_timestamps?: string;
    approved_tags?: string[];
  }
) {
  return request(`/videos/${videoId}/metadata`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

// ── Review ───────────────────────────────────────────────────────────────────

export async function reviewVideo(
  videoId: string,
  action: "approve" | "reject",
  comment?: string
) {
  return request<{ status: string }>(`/videos/${videoId}/review`, {
    method: "POST",
    body: JSON.stringify({ action, comment }),
  });
}

// ── Sync & Export ────────────────────────────────────────────────────────────

export async function syncVideo(videoId: string) {
  return request<{ success: boolean; sync_status: string }>(
    `/videos/${videoId}/sync`,
    { method: "POST" }
  );
}

export function exportUrl(videoId: string, format: "text" | "csv") {
  return `${API_BASE}/videos/${videoId}/export?format=${format}`;
}

// ── Channels ─────────────────────────────────────────────────────────────────

export async function listChannels(): Promise<Channel[]> {
  return request<Channel[]>("/channels");
}

export async function createChannel(data: Record<string, unknown>): Promise<Channel> {
  return request<Channel>("/channels", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function deleteChannel(id: string): Promise<void> {
  await request(`/channels/${id}`, { method: "DELETE" });
}

export async function syncChannel(id: string) {
  return request<{ success: boolean; total_found: number; new_videos: number }>(
    `/channels/${id}/sync`,
    { method: "POST" }
  );
}
