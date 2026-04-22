from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Optional
from database import get_db
from models import Video, Keyword, AuditLog
from schemas import VideoCreateIn, VideoUpdateIn, VideoOut, VideoListItemOut
import uuid
import json
from datetime import datetime

router = APIRouter(prefix="/api/videos", tags=["videos"])

STATUS_ORDER = ["draft", "keywords_ready", "generated", "approved", "synced", "exported"]


def _serialize(v: Video) -> dict:
    return {
        "id": v.id,
        "source": v.source,
        "status": v.status,
        "youtube_id": v.youtube_id,
        "original_title": v.original_title,
        "original_description": v.original_description,
        "thumbnail_url": v.thumbnail_url,
        "published_at": v.published_at.isoformat() if v.published_at else None,
        "duration": v.duration,
        "view_count": v.view_count,
        "channel_title": v.channel_title,
        "brand": v.brand,
        "influencer": v.influencer,
        "language": v.language or "en",
        "region": v.region,
        "brand_url": v.brand_url,
        "product_links": _parse_list(v.product_links),
        "transcript": v.transcript,
        "notes": v.notes,
        "generated_titles": _parse_list(v.generated_titles),
        "generated_description": v.generated_description,
        "generated_timestamps": v.generated_timestamps,
        "generated_tags": _parse_list(v.generated_tags),
        "approved_title": v.approved_title,
        "approved_description": v.approved_description,
        "approved_timestamps": v.approved_timestamps,
        "approved_tags": _parse_list(v.approved_tags),
        "sync_status": v.sync_status,
        "sync_error": v.sync_error,
        "synced_at": v.synced_at.isoformat() if v.synced_at else None,
        "channel_id": v.channel_id,
        "keywords": [
            {"id": k.id, "text": k.text, "type": k.type, "video_id": k.video_id}
            for k in v.keywords
        ],
        "audit_logs": [
            {
                "id": a.id,
                "action": a.action,
                "comment": a.comment,
                "actor": a.actor,
                "created_at": a.created_at.isoformat() if a.created_at else None,
            }
            for a in v.audit_logs
        ],
        "created_at": v.created_at.isoformat() if v.created_at else None,
        "updated_at": v.updated_at.isoformat() if v.updated_at else None,
    }


def _parse_list(value: Optional[str]) -> list:
    if not value:
        return []
    try:
        r = json.loads(value)
        return r if isinstance(r, list) else []
    except Exception:
        return []


@router.get("")
def list_videos(
    status: Optional[str] = Query(None),
    source: Optional[str] = Query(None),
    brand: Optional[str] = Query(None),
    q: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    query = db.query(Video)
    if status:
        query = query.filter(Video.status == status)
    if source:
        query = query.filter(Video.source == source)
    if brand:
        query = query.filter(Video.brand.ilike(f"%{brand}%"))
    if q:
        query = query.filter(
            (Video.original_title.ilike(f"%{q}%"))
            | (Video.approved_title.ilike(f"%{q}%"))
            | (Video.brand.ilike(f"%{q}%"))
            | (Video.influencer.ilike(f"%{q}%"))
        )

    videos = query.order_by(Video.created_at.desc()).all()

    result = []
    for v in videos:
        kw_count = db.query(func.count(Keyword.id)).filter(Keyword.video_id == v.id).scalar() or 0
        result.append({
            "id": v.id,
            "source": v.source,
            "status": v.status,
            "youtube_id": v.youtube_id,
            "original_title": v.original_title,
            "approved_title": v.approved_title,
            "thumbnail_url": v.thumbnail_url,
            "brand": v.brand,
            "influencer": v.influencer,
            "language": v.language or "en",
            "region": v.region,
            "sync_status": v.sync_status,
            "keyword_count": kw_count,
            "created_at": v.created_at.isoformat() if v.created_at else None,
            "updated_at": v.updated_at.isoformat() if v.updated_at else None,
        })
    return result


@router.post("")
def create_video(body: VideoCreateIn, db: Session = Depends(get_db)):
    if body.source not in ("owned", "influencer"):
        raise HTTPException(status_code=400, detail="source must be 'owned' or 'influencer'")

    v = Video(
        id=str(uuid.uuid4()),
        source=body.source,
        youtube_id=body.youtube_id,
        original_title=body.original_title,
        original_description=body.original_description,
        thumbnail_url=body.thumbnail_url,
        published_at=body.published_at,
        duration=body.duration,
        view_count=body.view_count,
        channel_title=body.channel_title,
        brand=body.brand,
        influencer=body.influencer,
        language=body.language,
        region=body.region,
        brand_url=body.brand_url,
        product_links=json.dumps(body.product_links) if body.product_links else None,
        notes=body.notes,
        channel_id=body.channel_id,
        status="draft",
    )
    db.add(v)
    db.flush()

    db.add(AuditLog(
        id=str(uuid.uuid4()),
        action="created",
        actor="user",
        video_id=v.id,
    ))
    db.commit()
    db.refresh(v)
    return _serialize(v)


@router.get("/{video_id}")
def get_video(video_id: str, db: Session = Depends(get_db)):
    v = db.query(Video).filter(Video.id == video_id).first()
    if not v:
        raise HTTPException(status_code=404, detail="Not found")
    return _serialize(v)


@router.patch("/{video_id}")
def update_video(video_id: str, body: VideoUpdateIn, db: Session = Depends(get_db)):
    v = db.query(Video).filter(Video.id == video_id).first()
    if not v:
        raise HTTPException(status_code=404, detail="Not found")

    for field, value in body.model_dump(exclude_none=True).items():
        if field == "product_links":
            setattr(v, field, json.dumps(value))
        elif field == "approved_tags":
            setattr(v, field, json.dumps(value))
        else:
            setattr(v, field, value)

    v.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(v)
    return _serialize(v)


@router.delete("/{video_id}")
def delete_video(video_id: str, db: Session = Depends(get_db)):
    v = db.query(Video).filter(Video.id == video_id).first()
    if not v:
        raise HTTPException(status_code=404, detail="Not found")
    db.delete(v)
    db.commit()
    return {"success": True}
