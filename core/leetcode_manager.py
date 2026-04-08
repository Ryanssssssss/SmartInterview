"""LeetCode 题目管理 —— 从本地题库加载完整题面。"""

import json
import logging
from pathlib import Path
from typing import Any

logger = logging.getLogger(__name__)

_problems: list[dict] | None = None


def _load_problems() -> list[dict]:
    global _problems
    if _problems is not None:
        return _problems

    path = Path("core/data/leetcode_hot100.json")
    if not path.exists():
        logger.warning("LeetCode 题库不存在: %s", path)
        return []

    with open(path, "r", encoding="utf-8") as f:
        _problems = json.load(f)
    return _problems


def get_problem_by_id(problem_id: int) -> dict[str, Any] | None:
    """根据 ID 获取完整题面。"""
    for p in _load_problems():
        if p.get("id") == problem_id:
            return p
    return None


def get_problem_by_title(title: str) -> dict[str, Any] | None:
    """根据标题模糊匹配题面。"""
    title_lower = title.lower()
    for p in _load_problems():
        if title_lower in p.get("title", "").lower() or p.get("title", "").lower() in title_lower:
            return p
    return None
