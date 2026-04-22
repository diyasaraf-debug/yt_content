from sqlalchemy import Column, String, Integer, DateTime, Text, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base
import uuid


def gen_id():
    return str(uuid.uuid4())


class Channel(Base):
    __tablename__ = "channels"

    id = Column(String, primary_key=True, default=gen_id)
    youtube_id = Column(String, unique=True, nullable=False)
    title = Column(String, nullable=False)
    description = Column(Text)
    thumbnail_url = Column(String)
    access_token = Column(String)
    refresh_token = Column(String)
    last_sync_at = Column(DateTime)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    videos = relationship("Video", back_populates="channel")


class Video(Base):
    __tablename__ = "videos"

    id = Column(String, primary_key=True, default=gen_id)
    # "owned" | "influencer"
    source = Column(String, nullable=False)
    # "draft" | "keywords_ready" | "generated" | "approved" | "synced" | "exported"
    status = Column(String, nullable=False, default="draft")

    youtube_id = Column(String, unique=True)
    original_title = Column(Text)
    original_description = Column(Text)
    thumbnail_url = Column(String)
    published_at = Column(DateTime)
    duration = Column(String)
    view_count = Column(Integer)
    channel_title = Column(String)

    brand = Column(String)
    influencer = Column(String)
    language = Column(String, default="en")
    region = Column(String)
    brand_url = Column(String)
    product_links = Column(Text)   # JSON: list[str]

    transcript = Column(Text)
    notes = Column(Text)

    generated_titles = Column(Text)       # JSON: list[str] (3 options)
    generated_description = Column(Text)
    generated_timestamps = Column(Text)
    generated_tags = Column(Text)         # JSON: list[str]

    approved_title = Column(Text)
    approved_description = Column(Text)
    approved_timestamps = Column(Text)
    approved_tags = Column(Text)          # JSON: list[str]

    # "pending" | "synced" | "failed"
    sync_status = Column(String)
    sync_error = Column(Text)
    synced_at = Column(DateTime)

    channel_id = Column(String, ForeignKey("channels.id"))
    channel = relationship("Channel", back_populates="videos")
    keywords = relationship("Keyword", back_populates="video", cascade="all, delete-orphan")
    audit_logs = relationship("AuditLog", back_populates="video", cascade="all, delete-orphan",
                              order_by="AuditLog.created_at.desc()")

    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())


class Keyword(Base):
    __tablename__ = "keywords"

    id = Column(String, primary_key=True, default=gen_id)
    text = Column(String, nullable=False)
    # "primary" | "secondary" | "long_tail"
    type = Column(String, nullable=False, default="secondary")
    video_id = Column(String, ForeignKey("videos.id", ondelete="CASCADE"), nullable=False)
    video = relationship("Video", back_populates="keywords")

    __table_args__ = (UniqueConstraint("video_id", "text", name="uq_video_keyword"),)


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(String, primary_key=True, default=gen_id)
    # "created" | "approved" | "rejected" | "generated" | "synced" | "exported" | "updated"
    action = Column(String, nullable=False)
    comment = Column(Text)
    meta = Column(Text)  # JSON
    actor = Column(String)  # user email / name
    video_id = Column(String, ForeignKey("videos.id", ondelete="CASCADE"), nullable=False)
    video = relationship("Video", back_populates="audit_logs")
    created_at = Column(DateTime, server_default=func.now())
