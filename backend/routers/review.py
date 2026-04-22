from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models import Video, AuditLog
from pydantic import BaseModel
from typing import Optional
import uuid
from datetime import datetime

router = APIRouter(prefix="/api/videos", tags=["review"])


class ReviewIn(BaseModel):
    action: str   # "approve" | "reject"
    comment: Optional[str] = None


@router.post("/{video_id}/review")
def review_video(video_id: str, body: ReviewIn, db: Session = Depends(get_db)):
    if body.action not in ("approve", "reject"):
        raise HTTPException(status_code=400, detail="action must be 'approve' or 'reject'")

    v = db.query(Video).filter(Video.id == video_id).first()
    if not v:
        raise HTTPException(status_code=404, detail="Not found")

    v.status = "approved" if body.action == "approve" else "generated"
    v.updated_at = datetime.utcnow()

    db.add(AuditLog(
        id=str(uuid.uuid4()),
        action="approved" if body.action == "approve" else "rejected",
        comment=body.comment,
        actor="user",
        video_id=v.id,
    ))
    db.commit()
    db.refresh(v)
    return {"status": v.status}
