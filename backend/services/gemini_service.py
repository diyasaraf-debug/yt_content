"""Gemini-powered metadata generation for YouTube videos.

Uses the Google Generative AI SDK with service account credentials,
following the same auth pattern as the Schema Writer project.
"""

from __future__ import annotations

import json
import os
import re
from typing import Any, Dict, List, Optional

_genai_import_error = None
try:
    import google.generativeai as genai
    from google.oauth2 import service_account as sa
except Exception as exc:  # pragma: no cover
    genai = None
    sa = None
    _genai_import_error = exc

GEMINI_MODEL = os.environ.get("GEMINI_MODEL", "gemini-2.5-flash")
SERVICE_ACCOUNT_PATH = os.environ.get(
    "GOOGLE_APPLICATION_CREDENTIALS",
    "/Users/diyasaraf/Downloads/gso-dashboard-creds.json",
)
_SCOPES = ["https://www.googleapis.com/auth/generative-language"]
_configured = False


def _configure() -> None:
    global _configured
    if _configured:
        return
    if genai is None or sa is None:
        return
    if not os.path.exists(SERVICE_ACCOUNT_PATH):
        return
    credentials = sa.Credentials.from_service_account_file(SERVICE_ACCOUNT_PATH)
    scoped = credentials.with_scopes(_SCOPES)
    genai.configure(credentials=scoped)
    _configured = True


def gemini_available() -> bool:
    if genai is None or sa is None:
        return False
    if not os.path.exists(SERVICE_ACCOUNT_PATH):
        return False
    _configure()
    return _configured


def _parse_json_response(text: str) -> dict:
    """Strip markdown fences and parse JSON, matching Schema Writer pattern."""
    text = text.strip()
    # Remove ```json ... ``` or ``` ... ``` fences
    text = re.sub(r"^```(?:json)?\s*", "", text)
    text = re.sub(r"\s*```$", "", text)
    text = text.strip()
    return json.loads(text)


def _build_prompt(
    original_title: Optional[str],
    transcript: Optional[str],
    keywords: list,
    brand: Optional[str],
    brand_url: Optional[str],
    product_links: list,
    influencer: Optional[str],
    language: str,
    region: Optional[str],
    notes: Optional[str],
) -> str:
    primary_kws = [k["text"] for k in keywords if k["type"] == "primary"]
    secondary_kws = [k["text"] for k in keywords if k["type"] == "secondary"]
    longtail_kws = [k["text"] for k in keywords if k["type"] == "long_tail"]

    product_text = "\n".join(
        f"Product {i+1}: {l}" for i, l in enumerate(product_links)
    ) or "None provided"

    transcript_section = (
        f"```\n{transcript[:6000]}\n```" if transcript else "Not provided."
    )

    return f"""You are an expert YouTube SEO specialist. Generate optimized metadata that maximises discoverability and engagement.

**Video Info:**
- Original Title: {original_title or 'Not provided'}
- Brand: {brand or 'Not specified'}
- Brand URL: {brand_url or 'Not provided'}
- Creator/Influencer: {influencer or 'Not specified'}
- Language: {language}
- Region: {region or 'Global'}
- Notes: {notes or 'None'}

**Product Links:**
{product_text}

**Keywords:**
- Primary: {', '.join(primary_kws) or 'None'}
- Secondary: {', '.join(secondary_kws) or 'None'}
- Long-tail: {', '.join(longtail_kws) or 'None'}

**Transcript:**
{transcript_section}

Return ONLY a valid JSON object (no markdown fences, no extra text) with this exact shape:
{{
  "titles": ["title1 (≤70 chars, keyword-rich)", "title2 (≤70 chars, different hook)", "title3 (≤70 chars, question format)"],
  "description": "Full YouTube description 1000-2000 chars: hook → value → timestamps placeholder → brand/product links → hashtags",
  "timestamps": "0:00 Introduction\\n0:30 Topic…",
  "tags": ["tag1", "tag2", "tag3"]
}}"""


async def generate_metadata(
    original_title: Optional[str],
    transcript: Optional[str],
    keywords: list,
    brand: Optional[str],
    brand_url: Optional[str],
    product_links: list,
    influencer: Optional[str],
    language: str,
    region: Optional[str],
    notes: Optional[str],
) -> dict:
    _configure()

    if not gemini_available():
        raise RuntimeError(
            f"Gemini unavailable. "
            f"genai={genai is not None}, "
            f"creds_exist={os.path.exists(SERVICE_ACCOUNT_PATH)}, "
            f"import_error={_genai_import_error}"
        )

    prompt = _build_prompt(
        original_title=original_title,
        transcript=transcript,
        keywords=keywords,
        brand=brand,
        brand_url=brand_url,
        product_links=product_links,
        influencer=influencer,
        language=language,
        region=region,
        notes=notes,
    )

    model = genai.GenerativeModel(
        f"models/{GEMINI_MODEL}",
        generation_config=genai.types.GenerationConfig(temperature=0.3),
    )
    response = model.generate_content(prompt)
    raw = getattr(response, "text", "") or ""

    result = _parse_json_response(raw)
    result["titles"] = [t[:100] for t in result.get("titles", [])[:3]]
    return result
