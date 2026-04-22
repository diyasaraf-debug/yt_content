from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import PlainTextResponse
from sqlalchemy.orm import Session
from database import get_db
from models import Video, AuditLog
from services.youtube_service import sync_to_youtube
import uuid
import json
import csv
import io
from datetime import datetime

router = APIRouter(prefix="/api/videos", tags=["sync-export"])


def _parse_list(value) -> list:
    if not value:
        return []
    try:
        r = json.loads(value)
        return r if isinstance(r, list) else []
    except Exception:
        return []


@router.post("/{video_id}/sync")
async def sync_video(video_id: str, db: Session = Depends(get_db)):
    v = db.query(Video).filter(Video.id == video_id).first()
    if not v:
        raise HTTPException(status_code=404, detail="Not found")
    if not v.youtube_id:
        raise HTTPException(status_code=400, detail="No YouTube ID — cannot sync influencer videos without ownership")
    if v.status != "approved":
        raise HTTPException(status_code=400, detail="Video must be approved before syncing")
    if not v.approved_title or not v.approved_description:
        raise HTTPException(status_code=400, detail="Approved title and description required")

    # For MVP we use the channel's access token if available
    access_token = None
    if v.channel and v.channel.access_token:
        access_token = v.channel.access_token

    if not access_token:
        raise HTTPException(
            status_code=400,
            detail="No access token available. Connect a channel with OAuth to enable syncing.",
        )

    try:
        await sync_to_youtube(
            video_id=v.youtube_id,
            access_token=access_token,
            title=v.approved_title,
            description=v.approved_description,
            tags=_parse_list(v.approved_tags),
        )
        v.status = "synced"
        v.sync_status = "synced"
        v.sync_error = None
        v.synced_at = datetime.utcnow()
    except Exception as e:
        v.sync_status = "failed"
        v.sync_error = str(e)
        db.commit()
        raise HTTPException(status_code=500, detail=str(e))

    db.add(AuditLog(
        id=str(uuid.uuid4()),
        action="synced",
        actor="user",
        video_id=v.id,
    ))
    db.commit()
    return {"success": True, "sync_status": "synced"}


@router.get("/{video_id}/export")
def export_video(
    video_id: str,
    format: str = Query("text", enum=["text", "csv"]),
    db: Session = Depends(get_db),
):
    v = db.query(Video).filter(Video.id == video_id).first()
    if not v:
        raise HTTPException(status_code=404, detail="Not found")

    title = v.approved_title or v.original_title or "Untitled"
    description = v.approved_description or v.generated_description or ""
    timestamps = v.approved_timestamps or v.generated_timestamps or ""
    tags = _parse_list(v.approved_tags or v.generated_tags)
    keywords = [f"{k.text} [{k.type}]" for k in v.keywords]

    # Mark as exported
    if v.status == "approved":
        v.status = "exported"
    db.add(AuditLog(
        id=str(uuid.uuid4()),
        action="exported",
        meta=json.dumps({"format": format}),
        actor="user",
        video_id=v.id,
    ))
    db.commit()

    if format == "csv":
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(["Field", "Value"])
        writer.writerows([
            ["Title", title],
            ["Description", description],
            ["Timestamps", timestamps],
            ["Tags", ", ".join(tags)],
            ["Keywords", "; ".join(keywords)],
            ["Brand", v.brand or ""],
            ["Language", v.language or "en"],
            ["Region", v.region or ""],
        ])
        return PlainTextResponse(
            content=output.getvalue(),
            media_type="text/csv",
            headers={"Content-Disposition": f'attachment; filename="metadata-{video_id}.csv"'},
        )

    text = f"TITLE\n{title}\n\nDESCRIPTION\n{description}\n\nTIMESTAMPS\n{timestamps}\n\nTAGS\n{', '.join(tags)}\n\nKEYWORDS\n{chr(10).join(keywords)}"
    return PlainTextResponse(
        content=text,
        media_type="text/plain",
        headers={"Content-Disposition": f'attachment; filename="metadata-{video_id}.txt"'},
    )
