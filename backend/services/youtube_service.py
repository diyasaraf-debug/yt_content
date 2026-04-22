import httpx
import os
import re
from typing import Optional

YT_BASE = "https://www.googleapis.com/youtube/v3"


def extract_video_id(url: str) -> Optional[str]:
    patterns = [
        r"(?:youtube\.com/watch\?v=|youtu\.be/|youtube\.com/embed/)([^&\n?#]+)",
        r"youtube\.com/shorts/([^&\n?#]+)",
    ]
    for p in patterns:
        m = re.search(p, url)
        if m:
            return m.group(1)
    return None


async def fetch_video_data(video_id: str, api_key: Optional[str] = None) -> Optional[dict]:
    key = api_key or os.getenv("YOUTUBE_API_KEY")
    if not key:
        raise ValueError("YOUTUBE_API_KEY not set")

    url = f"{YT_BASE}/videos?part=snippet,contentDetails,statistics&id={video_id}&key={key}"
    async with httpx.AsyncClient() as client:
        r = await client.get(url, timeout=10)
        r.raise_for_status()
        data = r.json()

    items = data.get("items", [])
    if not items:
        return None

    item = items[0]
    s = item["snippet"]
    cd = item.get("contentDetails", {})
    st = item.get("statistics", {})
    thumbnails = s.get("thumbnails", {})

    return {
        "youtube_id": video_id,
        "original_title": s.get("title"),
        "original_description": s.get("description"),
        "thumbnail_url": (
            thumbnails.get("maxres", {}).get("url")
            or thumbnails.get("high", {}).get("url")
            or thumbnails.get("default", {}).get("url")
        ),
        "published_at": s.get("publishedAt"),
        "duration": cd.get("duration"),
        "view_count": int(st.get("viewCount", 0)),
        "channel_title": s.get("channelTitle"),
        "channel_id": s.get("channelId"),
    }


async def get_owned_channels(access_token: str) -> list[dict]:
    async with httpx.AsyncClient() as client:
        r = await client.get(
            f"{YT_BASE}/channels?part=snippet&mine=true&maxResults=50",
            headers={"Authorization": f"Bearer {access_token}"},
            timeout=10,
        )
        r.raise_for_status()
        data = r.json()

    return [
        {
            "youtube_id": item["id"],
            "title": item["snippet"]["title"],
            "description": item["snippet"].get("description"),
            "thumbnail_url": item["snippet"].get("thumbnails", {}).get("default", {}).get("url"),
        }
        for item in data.get("items", [])
    ]


async def fetch_channel_uploads(channel_youtube_id: str, access_token: str) -> list[dict]:
    async with httpx.AsyncClient() as client:
        # Get uploads playlist
        r = await client.get(
            f"{YT_BASE}/channels?part=contentDetails&id={channel_youtube_id}",
            headers={"Authorization": f"Bearer {access_token}"},
            timeout=10,
        )
        r.raise_for_status()
        data = r.json()
        playlist_id = (
            data.get("items", [{}])[0]
            .get("contentDetails", {})
            .get("relatedPlaylists", {})
            .get("uploads")
        )
        if not playlist_id:
            return []

        # Get playlist items
        r2 = await client.get(
            f"{YT_BASE}/playlistItems?part=snippet&maxResults=50&playlistId={playlist_id}",
            headers={"Authorization": f"Bearer {access_token}"},
            timeout=10,
        )
        r2.raise_for_status()
        items_data = r2.json()
        video_ids = [
            i["snippet"]["resourceId"]["videoId"]
            for i in items_data.get("items", [])
        ]
        if not video_ids:
            return []

        # Batch video details
        r3 = await client.get(
            f"{YT_BASE}/videos?part=snippet,contentDetails,statistics&id={','.join(video_ids)}&key={os.getenv('YOUTUBE_API_KEY', '')}",
            timeout=10,
        )
        r3.raise_for_status()
        detail_data = r3.json()

    result = []
    for item in detail_data.get("items", []):
        s = item["snippet"]
        cd = item.get("contentDetails", {})
        st = item.get("statistics", {})
        thumbnails = s.get("thumbnails", {})
        result.append({
            "youtube_id": item["id"],
            "original_title": s.get("title"),
            "original_description": s.get("description"),
            "thumbnail_url": (
                thumbnails.get("maxres", {}).get("url")
                or thumbnails.get("high", {}).get("url")
                or thumbnails.get("default", {}).get("url")
            ),
            "published_at": s.get("publishedAt"),
            "duration": cd.get("duration"),
            "view_count": int(st.get("viewCount", 0)),
            "channel_title": s.get("channelTitle"),
        })
    return result


async def sync_to_youtube(
    video_id: str,
    access_token: str,
    title: str,
    description: str,
    tags: list[str],
) -> None:
    async with httpx.AsyncClient() as client:
        # Fetch existing snippet
        r = await client.get(
            f"{YT_BASE}/videos?part=snippet&id={video_id}",
            headers={"Authorization": f"Bearer {access_token}"},
            timeout=10,
        )
        r.raise_for_status()
        existing = r.json().get("items", [{}])[0].get("snippet", {})

        body = {
            "id": video_id,
            "snippet": {
                **existing,
                "title": title,
                "description": description,
                "tags": tags,
                "categoryId": existing.get("categoryId", "22"),
            },
        }
        r2 = await client.put(
            f"{YT_BASE}/videos?part=snippet",
            headers={
                "Authorization": f"Bearer {access_token}",
                "Content-Type": "application/json",
            },
            json=body,
            timeout=15,
        )
        if not r2.is_success:
            err = r2.json()
            raise RuntimeError(err.get("error", {}).get("message", "YouTube update failed"))
