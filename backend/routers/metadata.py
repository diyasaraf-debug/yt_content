from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models import Video, AuditLog
from services.gemini_service import generate_metadata
import uuid
import json
from datetime import datetime
from pydantic import BaseModel
from typing import Optional

router = APIRouter(prefix="/api/videos", tags=["metadata"])


def _parse_list(value: Optional[str]) -> list:
    if not value:
        return []
    try:
        r = json.loads(value)
        return r if isinstance(r, list) else []
    except Exception:
        return []


@router.post("/{video_id}/generate")
async def generate(video_id: str, db: Session = Depends(get_db)):
    v = db.query(Video).filter(Video.id == video_id).first()
    if not v:
        raise HTTPException(status_code=404, detail="Not found")

    keywords = [
        {"text": k.text, "type": k.type}
        for k in v.keywords
    ]

    result = await generate_metadata(
        original_title=v.original_title,
        transcript=v.transcript,
        keywords=keywords,
        brand=v.brand,
        brand_url=v.brand_url,
        product_links=_parse_list(v.product_links),
        influencer=v.influencer,
        language=v.language or "en",
        region=v.region,
        notes=v.notes,
    )

    v.generated_titles = json.dumps(result.get("titles", []))
    v.generated_description = result.get("description", "")
    v.generated_timestamps = result.get("timestamps", "")
    v.generated_tags = json.dumps(result.get("tags", []))

    if v.status in ("draft", "keywords_ready"):
        v.status = "generated"

    v.updated_at = datetime.utcnow()

    db.add(AuditLog(
        id=str(uuid.uuid4()),
        action="generated",
        actor="user",
        video_id=v.id,
    ))
    db.commit()
    db.refresh(v)

    return {
        "titles": _parse_list(v.generated_titles),
        "description": v.generated_description,
        "timestamps": v.generated_timestamps,
        "tags": _parse_list(v.generated_tags),
        "status": v.status,
    }


class MetadataSaveIn(BaseModel):
    approved_title: Optional[str] = None
    approved_description: Optional[str] = None
    approved_timestamps: Optional[str] = None
    approved_tags: Optional[list[str]] = None


@router.patch("/{video_id}/metadata")
def save_metadata(video_id: str, body: MetadataSaveIn, db: Session = Depends(get_db)):
    v = db.query(Video).filter(Video.id == video_id).first()
    if not v:
        raise HTTPException(status_code=404, detail="Not found")

    if body.approved_title is not None:
        v.approved_title = body.approved_title
    if body.approved_description is not None:
        v.approved_description = body.approved_description
    if body.approved_timestamps is not None:
        v.approved_timestamps = body.approved_timestamps
    if body.approved_tags is not None:
        v.approved_tags = json.dumps(body.approved_tags)

    v.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(v)

    return {
        "approved_title": v.approved_title,
        "approved_description": v.approved_description,
        "approved_timestamps": v.approved_timestamps,
        "approved_tags": _parse_list(v.approved_tags),
    }
