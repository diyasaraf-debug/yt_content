from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models import Video, Keyword, AuditLog
import uuid
import re

router = APIRouter(prefix="/api/videos", tags=["keywords"])

VALID_TYPES = {"primary", "secondary", "long_tail"}


def _normalize(text: str) -> str:
    return re.sub(r"\s+", " ", text.strip().lower())


def _split_bulk(text: str) -> list[str]:
    parts = re.split(r"[\n,]", text)
    return list({_normalize(p) for p in parts if _normalize(p)})


@router.get("/{video_id}/keywords")
def get_keywords(video_id: str, db: Session = Depends(get_db)):
    v = db.query(Video).filter(Video.id == video_id).first()
    if not v:
        raise HTTPException(status_code=404, detail="Not found")
    kws = db.query(Keyword).filter(Keyword.video_id == video_id)\
              .order_by(Keyword.type, Keyword.text).all()
    return [{"id": k.id, "text": k.text, "type": k.type, "video_id": k.video_id} for k in kws]


@router.post("/{video_id}/keywords")
def add_keywords(video_id: str, body: dict, db: Session = Depends(get_db)):
    v = db.query(Video).filter(Video.id == video_id).first()
    if not v:
        raise HTTPException(status_code=404, detail="Not found")

    texts: list[tuple[str, str]] = []  # (text, type)

    if "text" in body:
        for t in _split_bulk(body["text"]):
            texts.append((t, "secondary"))
    elif "keywords" in body and isinstance(body["keywords"], list):
        for kw in body["keywords"]:
            t = _normalize(kw.get("text", ""))
            ktype = kw.get("type", "secondary")
            if t:
                texts.append((t, ktype if ktype in VALID_TYPES else "secondary"))
    else:
        raise HTTPException(status_code=400, detail="Provide 'text' or 'keywords' array")

    for text, ktype in texts:
        existing = db.query(Keyword).filter(
            Keyword.video_id == video_id, Keyword.text == text
        ).first()
        if existing:
            existing.type = ktype
        else:
            db.add(Keyword(
                id=str(uuid.uuid4()),
                text=text,
                type=ktype,
                video_id=video_id,
            ))

    # Auto-advance status
    db.flush()
    kw_count = db.query(Keyword).filter(Keyword.video_id == video_id).count()
    if kw_count >= 5 and v.status == "draft":
        v.status = "keywords_ready"

    db.commit()

    kws = db.query(Keyword).filter(Keyword.video_id == video_id)\
              .order_by(Keyword.type, Keyword.text).all()
    return [{"id": k.id, "text": k.text, "type": k.type, "video_id": k.video_id} for k in kws]


@router.patch("/{video_id}/keywords/{keyword_id}")
def update_keyword_type(video_id: str, keyword_id: str, body: dict, db: Session = Depends(get_db)):
    ktype = body.get("type")
    if ktype not in VALID_TYPES:
        raise HTTPException(status_code=400, detail=f"type must be one of {VALID_TYPES}")

    kw = db.query(Keyword).filter(
        Keyword.id == keyword_id, Keyword.video_id == video_id
    ).first()
    if not kw:
        raise HTTPException(status_code=404, detail="Keyword not found")

    kw.type = ktype
    db.commit()
    db.refresh(kw)
    return {"id": kw.id, "text": kw.text, "type": kw.type, "video_id": kw.video_id}


@router.delete("/{video_id}/keywords/{keyword_id}")
def delete_keyword(video_id: str, keyword_id: str, db: Session = Depends(get_db)):
    kw = db.query(Keyword).filter(
        Keyword.id == keyword_id, Keyword.video_id == video_id
    ).first()
    if not kw:
        raise HTTPException(status_code=404, detail="Keyword not found")
    db.delete(kw)
    db.commit()
    return {"success": True}
