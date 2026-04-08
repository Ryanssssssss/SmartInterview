"""会话持久化管理 + 自动清理。

支持：
- 保存/加载面试会话（JSON 文件持久化）
- 多对话管理（列出历史会话、切换会话）
- 自动清理过期数据（上传文件、过期会话）
"""

import json
import time
import logging
import shutil
from pathlib import Path
from typing import Any

from config.settings import settings

logger = logging.getLogger(__name__)

# 会话存储目录
SESSIONS_DIR = Path("./data/sessions")
UPLOADS_DIR = Path(settings.upload_dir)

# 过期时间（秒）：7天
SESSION_EXPIRY = 7 * 24 * 3600


def _ensure_dirs():
    SESSIONS_DIR.mkdir(parents=True, exist_ok=True)
    UPLOADS_DIR.mkdir(parents=True, exist_ok=True)


def save_session(session_id: str, session_data: dict[str, Any]) -> None:
    """保存会话数据到磁盘。"""
    _ensure_dirs()
    session_data["_saved_at"] = time.time()
    session_data["_session_id"] = session_id

    path = SESSIONS_DIR / f"{session_id}.json"
    try:
        with open(path, "w", encoding="utf-8") as f:
            json.dump(session_data, f, ensure_ascii=False, indent=2, default=str)
        logger.info("会话已保存: %s", session_id)
    except Exception as e:
        logger.error("保存会话失败: %s", e)


def load_session(session_id: str) -> dict[str, Any] | None:
    """加载会话数据。"""
    path = SESSIONS_DIR / f"{session_id}.json"
    if not path.exists():
        return None
    try:
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception as e:
        logger.error("加载会话失败: %s", e)
        return None


def list_sessions() -> list[dict[str, Any]]:
    """列出所有保存的会话，按时间倒序。"""
    _ensure_dirs()
    sessions = []
    for path in SESSIONS_DIR.glob("*.json"):
        try:
            with open(path, "r", encoding="utf-8") as f:
                data = json.load(f)
            sessions.append({
                "session_id": data.get("_session_id", path.stem),
                "saved_at": data.get("_saved_at", 0),
                "phase": data.get("phase", "unknown"),
                "job_category": data.get("job_category", ""),
                "candidate_name": data.get("candidate_name", "未知"),
                "message_count": len(data.get("messages", [])),
                "has_report": data.get("report") is not None,
            })
        except Exception:
            continue

    sessions.sort(key=lambda x: x["saved_at"], reverse=True)
    return sessions


def delete_session(session_id: str) -> None:
    """删除会话。"""
    path = SESSIONS_DIR / f"{session_id}.json"
    if path.exists():
        path.unlink()
        logger.info("会话已删除: %s", session_id)

    # 同时删除关联的上传文件
    for f in UPLOADS_DIR.glob(f"{session_id}_*"):
        f.unlink()


def cleanup_expired() -> int:
    """清理过期的会话和上传文件。返回清理数量。"""
    _ensure_dirs()
    now = time.time()
    cleaned = 0

    # 清理过期会话
    for path in SESSIONS_DIR.glob("*.json"):
        try:
            with open(path, "r", encoding="utf-8") as f:
                data = json.load(f)
            saved_at = data.get("_saved_at", 0)
            if now - saved_at > SESSION_EXPIRY:
                session_id = data.get("_session_id", path.stem)
                delete_session(session_id)
                cleaned += 1
        except Exception:
            # 损坏的文件也删除
            path.unlink()
            cleaned += 1

    # 清理孤立的上传文件（没有对应会话的）
    session_ids = {p.stem for p in SESSIONS_DIR.glob("*.json")}
    for f in UPLOADS_DIR.iterdir():
        if f.is_file() and f.name != ".gitkeep":
            # 文件名格式: session_id_filename.pdf
            file_session = f.name.split("_")[0] if "_" in f.name else ""
            if file_session and file_session not in session_ids:
                # 检查文件是否超过1天
                if now - f.stat().st_mtime > 86400:
                    f.unlink()
                    cleaned += 1

    if cleaned:
        logger.info("自动清理完成，清理了 %d 个过期项", cleaned)
    return cleaned
