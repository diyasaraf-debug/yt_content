from fastapi import APIRouter
from pydantic import BaseModel
from services.youtube_service import extract_video_id, fetch_video_data

router = APIRouter(prefix="/api/youtube", tags=["youtube"])


class ValidateIn(BaseModel):
    url: str


@router.post("/validate")
async def validate_url(body: ValidateIn):
    video_id = extract_video_id(body.url)
    if not video_id:
        return {"error": "Invalid YouTube URL — could not extract video ID"}
    data = await fetch_video_data(video_id)
    if not data:
        return {"error": "Video not found or is private"}
    return {"video_data": data}
