"""FastAPI 入口 — OfferForge 后端。"""

import sys
from pathlib import Path

# 确保项目根目录在 Python 路径中，以便 core/ config/ interfaces/ 的 import 正常工作
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from core.session_manager import cleanup_expired
from backend.api.interview import router as interview_router
from backend.api.voice import router as voice_router
from backend.api.sessions import router as sessions_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    cleanup_expired()

    # 预加载 Embedding 模型 + 真题库向量化，避免首次出题时卡住
    import asyncio

    async def _preload():
        from core.rag.question_bank_rag import _get_model, _get_embeddings, _load_question_bank
        import logging
        logger = logging.getLogger("startup")
        logger.info("预加载真题库 Embedding 模型...")
        await asyncio.to_thread(_get_model)
        await asyncio.to_thread(_load_question_bank)
        await asyncio.to_thread(_get_embeddings)
        logger.info("真题库预加载完成")

    asyncio.create_task(_preload())

    yield


app = FastAPI(title="OfferForge API", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(interview_router, prefix="/api")
app.include_router(voice_router, prefix="/api")
app.include_router(sessions_router, prefix="/api")


@app.get("/api/health")
async def health():
    return {"status": "ok"}
