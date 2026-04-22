from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
import json


# ── Channel ─────────────────────────────────────────────────────────────────

class ChannelOut(BaseModel):
    id: str
    youtube_id: str
    title: str
    description: Optional[str] = None
    thumbnail_url: Optional[str] = None
    last_sync_at: Optional[datetime] = None
    created_at: Optional[datetime] = None
    video_count: int = 0

    class Config:
        from_attributes = True


# ── Keyword ──────────────────────────────────────────────────────────────────

class KeywordOut(BaseModel):
    id: str
    text: str
    type: str
    video_id: str

    class Config:
        from_attributes = True


class KeywordBulkIn(BaseModel):
    text: Optional[str] = None          # paste, newline/comma separated
    keywords: Optional[list[dict]] = None  # [{"text": ..., "type": ...}]


class KeywordUpdateIn(BaseModel):
    type: str  # primary | secondary | long_tail


# ── Audit ────────────────────────────────────────────────────────────────────

class AuditLogOut(BaseModel):
    id: str
    action: str
    comment: Optional[str] = None
    actor: Optional[str] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# ── Video ────────────────────────────────────────────────────────────────────

class VideoOut(BaseModel):
    id: str
    source: str
    status: str
    youtube_id: Optional[str] = None
    original_title: Optional[str] = None
    original_description: Optional[str] = None
    thumbnail_url: Optional[str] = None
    published_at: Optional[datetime] = None
    duration: Optional[str] = None
    view_count: Optional[int] = None
    channel_title: Optional[str] = None
    brand: Optional[str] = None
    influencer: Optional[str] = None
    language: str = "en"
    region: Optional[str] = None
    brand_url: Optional[str] = None
    product_links: list[str] = Field(default_factory=list)
    transcript: Optional[str] = None
    notes: Optional[str] = None
    generated_titles: list[str] = Field(default_factory=list)
    generated_description: Optional[str] = None
    generated_timestamps: Optional[str] = None
    generated_tags: list[str] = Field(default_factory=list)
    approved_title: Optional[str] = None
    approved_description: Optional[str] = None
    approved_timestamps: Optional[str] = None
    approved_tags: list[str] = Field(default_factory=list)
    sync_status: Optional[str] = None
    sync_error: Optional[str] = None
    synced_at: Optional[datetime] = None
    channel_id: Optional[str] = None
    keywords: list[KeywordOut] = Field(default_factory=list)
    audit_logs: list[AuditLogOut] = Field(default_factory=list)
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

    @classmethod
    def from_orm_with_json(cls, obj) -> "VideoOut":
        data = {
            "id": obj.id,
            "source": obj.source,
            "status": obj.status,
            "youtube_id": obj.youtube_id,
            "original_title": obj.original_title,
            "original_description": obj.original_description,
            "thumbnail_url": obj.thumbnail_url,
            "published_at": obj.published_at,
            "duration": obj.duration,
            "view_count": obj.view_count,
            "channel_title": obj.channel_title,
            "brand": obj.brand,
            "influencer": obj.influencer,
            "language": obj.language or "en",
            "region": obj.region,
            "brand_url": obj.brand_url,
            "product_links": _parse_json_list(obj.product_links),
            "transcript": obj.transcript,
            "notes": obj.notes,
            "generated_titles": _parse_json_list(obj.generated_titles),
            "generated_description": obj.generated_description,
            "generated_timestamps": obj.generated_timestamps,
            "generated_tags": _parse_json_list(obj.generated_tags),
            "approved_title": obj.approved_title,
            "approved_description": obj.approved_description,
            "approved_timestamps": obj.approved_timestamps,
            "approved_tags": _parse_json_list(obj.approved_tags),
            "sync_status": obj.sync_status,
            "sync_error": obj.sync_error,
            "synced_at": obj.synced_at,
            "channel_id": obj.channel_id,
            "keywords": [KeywordOut.model_validate(k) for k in obj.keywords],
            "audit_logs": [AuditLogOut.model_validate(a) for a in obj.audit_logs],
            "created_at": obj.created_at,
            "updated_at": obj.updated_at,
        }
        return cls(**data)


class VideoListItemOut(BaseModel):
    id: str
    source: str
    status: str
    youtube_id: Optional[str] = None
    original_title: Optional[str] = None
    approved_title: Optional[str] = None
    thumbnail_url: Optional[str] = None
    brand: Optional[str] = None
    influencer: Optional[str] = None
    language: str = "en"
    region: Optional[str] = None
    sync_status: Optional[str] = None
    keyword_count: int = 0
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class VideoCreateIn(BaseModel):
    source: str  # "owned" | "influencer"
    youtube_id: Optional[str] = None
    original_title: Optional[str] = None
    original_description: Optional[str] = None
    thumbnail_url: Optional[str] = None
    published_at: Optional[datetime] = None
    duration: Optional[str] = None
    view_count: Optional[int] = None
    channel_title: Optional[str] = None
    brand: Optional[str] = None
    influencer: Optional[str] = None
    language: str = "en"
    region: Optional[str] = None
    brand_url: Optional[str] = None
    product_links: list[str] = Field(default_factory=list)
    notes: Optional[str] = None
    channel_id: Optional[str] = None


class VideoUpdateIn(BaseModel):
    brand: Optional[str] = None
    influencer: Optional[str] = None
    language: Optional[str] = None
    region: Optional[str] = None
    brand_url: Optional[str] = None
    product_links: Optional[list[str]] = None
    transcript: Optional[str] = None
    notes: Optional[str] = None
    approved_title: Optional[str] = None
    approved_description: Optional[str] = None
    approved_timestamps: Optional[str] = None
    approved_tags: Optional[list[str]] = None


class ReviewIn(BaseModel):
    action: str  # "approve" | "reject"
    comment: Optional[str] = None


class GeneratedMetadataOut(BaseModel):
    titles: list[str]
    description: str
    timestamps: str
    tags: list[str]


def _parse_json_list(value: Optional[str]) -> list:
    if not value:
        return []
    try:
        result = json.loads(value)
        return result if isinstance(result, list) else []
    except Exception:
        return []
