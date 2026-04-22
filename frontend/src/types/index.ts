export type VideoStatus =
  | "draft"
  | "keywords_ready"
  | "generated"
  | "approved"
  | "synced"
  | "exported";

export type VideoSource = "owned" | "influencer";
export type KeywordType = "primary" | "secondary" | "long_tail";
export type SyncStatus = "pending" | "synced" | "failed";

export interface Keyword {
  id: string;
  text: string;
  type: KeywordType;
  video_id: string;
}

export interface AuditLog {
  id: string;
  action: string;
  comment?: string;
  actor?: string;
  created_at?: string;
}

export interface Video {
  id: string;
  source: VideoSource;
  status: VideoStatus;
  youtube_id?: string;
  original_title?: string;
  original_description?: string;
  thumbnail_url?: string;
  published_at?: string;
  duration?: string;
  view_count?: number;
  channel_title?: string;
  brand?: string;
  influencer?: string;
  language: string;
  region?: string;
  brand_url?: string;
  product_links: string[];
  transcript?: string;
  notes?: string;
  generated_titles: string[];
  generated_description?: string;
  generated_timestamps?: string;
  generated_tags: string[];
  approved_title?: string;
  approved_description?: string;
  approved_timestamps?: string;
  approved_tags: string[];
  sync_status?: SyncStatus;
  sync_error?: string;
  synced_at?: string;
  channel_id?: string;
  keywords: Keyword[];
  audit_logs: AuditLog[];
  created_at?: string;
  updated_at?: string;
}

export interface VideoListItem {
  id: string;
  source: VideoSource;
  status: VideoStatus;
  youtube_id?: string;
  original_title?: string;
  approved_title?: string;
  thumbnail_url?: string;
  brand?: string;
  influencer?: string;
  language: string;
  region?: string;
  sync_status?: SyncStatus;
  keyword_count: number;
  created_at?: string;
  updated_at?: string;
}

export interface Channel {
  id: string;
  youtube_id: string;
  title: string;
  description?: string;
  thumbnail_url?: string;
  last_sync_at?: string;
  created_at?: string;
  video_count: number;
}

export type AppStep =
  | "dashboard"
  | "add-video"
  | "video-detail"
  | "keywords"
  | "metadata"
  | "review"
  | "channels";
