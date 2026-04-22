from fastapi import APIRouter, Depends, HTTPException
import httpx
from sqlalchemy.orm import Session
from sqlalchemy import func
from database import get_db
from models import Channel, Video
from schemas import ChannelOut
from services.youtube_service import get_owned_channels, fetch_channel_uploads
from pydantic import BaseModel
from typing import Optional
import uuid
from datetime import datetime

router = APIRouter(prefix="/api/channels", tags=["channels"])


def _channel_out(ch: Channel, db: Session) -> dict:
    count = db.query(func.count(Video.id)).filter(Video.channel_id == ch.id).scalar() or 0
    return {
        "id": ch.id,
        "youtube_id": ch.youtube_id,
        "title": ch.title,
        "description": ch.description,
        "thumbnail_url": ch.thumbnail_url,
        "last_sync_at": ch.last_sync_at,
        "created_at": ch.created_at,
        "video_count": count,
    }


@router.get("")
def list_channels(db: Session = Depends(get_db)):
    channels = db.query(Channel).order_by(Channel.created_at.desc()).all()
    return [_channel_out(c, db) for c in channels]


class ChannelCreateIn(BaseModel):
    youtube_id: str
    title: str
    description: Optional[str] = None
    thumbnail_url: Optional[str] = None
    access_token: Optional[str] = None
    refresh_token: Optional[str] = None


@router.post("")
def create_channel(body: ChannelCreateIn, db: Session = Depends(get_db)):
    existing = db.query(Channel).filter(Channel.youtube_id == body.youtube_id).first()
    if existing:
        existing.title = body.title
        existing.description = body.description
        existing.thumbnail_url = body.thumbnail_url
        if body.access_token:
            existing.access_token = body.access_token
        if body.refresh_token:
            existing.refresh_token = body.refresh_token
        db.commit()
        db.refresh(existing)
        return _channel_out(existing, db)

    ch = Channel(
        id=str(uuid.uuid4()),
        youtube_id=body.youtube_id,
        title=body.title,
        description=body.description,
        thumbnail_url=body.thumbnail_url,
        access_token=body.access_token,
        refresh_token=body.refresh_token,
    )
    db.add(ch)
    db.commit()
    db.refresh(ch)
    return _channel_out(ch, db)


@router.delete("/{channel_id}")
def delete_channel(channel_id: str, db: Session = Depends(get_db)):
    ch = db.query(Channel).filter(Channel.id == channel_id).first()
    if not ch:
        raise HTTPException(status_code=404, detail="Channel not found")
    db.delete(ch)
    db.commit()
    return {"success": True}


@router.post("/{channel_id}/sync")
async def sync_channel(channel_id: str, db: Session = Depends(get_db)):
    ch = db.query(Channel).filter(Channel.id == channel_id).first()
    if not ch:
        raise HTTPException(status_code=404, detail="Channel not found")
    if not ch.access_token:
        raise HTTPException(status_code=400, detail="No access token for channel")

    try:
        videos = await fetch_channel_uploads(ch.youtube_id, ch.access_token)
    except httpx.HTTPStatusError as e:
        status = e.response.status_code
        try:
            body = e.response.json().get("error", {})
            reason = (body.get("errors") or [{}])[0].get("reason", "")
            google_msg = body.get("message", e.response.text)
        except Exception:
            reason, google_msg = "", e.response.text
        if status == 401:
            detail = "YouTube rejected the access token (expired or invalid scope). Generate a fresh token."
        elif reason == "quotaExceeded":
            detail = "YouTube Data API daily quota exceeded for this OAuth client. Use your own Google Cloud project credentials or wait for reset (midnight PT)."
        elif status == 403:
            detail = f"YouTube denied the request: {google_msg}"
        else:
            detail = f"YouTube API error ({status}): {google_msg}"
        raise HTTPException(status_code=status, detail=detail)
    new_count = 0

    for v in videos:
        existing = db.query(Video).filter(Video.youtube_id == v["youtube_id"]).first()
        if not existing:
            vid = Video(
                id=str(uuid.uuid4()),
                source="owned",
                youtube_id=v["youtube_id"],
                original_title=v.get("original_title"),
                original_description=v.get("original_description"),
                thumbnail_url=v.get("thumbnail_url"),
                published_at=datetime.fromisoformat(v["published_at"].replace("Z", "+00:00"))
                if v.get("published_at") else None,
                duration=v.get("duration"),
                view_count=v.get("view_count"),
                channel_title=v.get("channel_title"),
                channel_id=ch.id,
                status="draft",
            )
            db.add(vid)
            new_count += 1

    ch.last_sync_at = datetime.utcnow()
    db.commit()

    return {"success": True, "total_found": len(videos), "new_videos": new_count}
