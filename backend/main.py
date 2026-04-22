from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from database import init_db
from routers import videos, keywords, metadata, review, sync_export, channels, youtube
import os


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield


app = FastAPI(title="YT Metadata Platform", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("CORS_ORIGINS", "http://localhost:5173").split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(videos.router)
app.include_router(keywords.router)
app.include_router(metadata.router)
app.include_router(review.router)
app.include_router(sync_export.router)
app.include_router(channels.router)
app.include_router(youtube.router)


@app.get("/health")
def health():
    return {"status": "ok"}
