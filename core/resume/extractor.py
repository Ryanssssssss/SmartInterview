"""LLM 结构化简历信息提取。

将 PDF 原始文本通过 LLM 提取为结构化 JSON。
"""

import logging
from pathlib import Path
from typing import Any

from core.llm.thinker import thinker
from core.llm.prompts import RESUME_EXTRACTION_PROMPT
from core.resume.parser import extract_text_from_pdf

logger = logging.getLogger(__name__)


def extract_resume_info(file_path: str | Path) -> dict[str, Any]:
    """解析 PDF 简历并提取结构化信息。

    Args:
        file_path: PDF 简历文件路径。

    Returns:
        结构化简历字典，包含 name, education, skills, projects, internships 等。

    Raises:
        ValueError: 解析或提取失败。
    """
    # 1. 提取原始文本
    raw_text = extract_text_from_pdf(file_path)
    logger.info("原始简历文本长度: %d", len(raw_text))

    # 2. LLM 结构化提取
    try:
        resume_data = thinker.think_json_with_template(
            RESUME_EXTRACTION_PROMPT,
            {"resume_text": raw_text},
        )
    except Exception as e:
        logger.error("LLM 结构化提取失败: %s", e)
        raise ValueError(f"简历结构化提取失败: {e}") from e

    # 3. 基本校验
    if not isinstance(resume_data, dict):
        raise ValueError("LLM 返回的简历数据格式异常")

    # 确保关键字段存在
    for key in ("name", "skills", "projects", "education"):
        if key not in resume_data:
            resume_data[key] = [] if key != "name" else "未知"

    # 保留原始文本供 RAG 使用
    resume_data["_raw_text"] = raw_text

    logger.info("简历解析完成: %s, 技能数: %d, 项目数: %d",
                resume_data.get("name", "未知"),
                len(resume_data.get("skills", [])),
                len(resume_data.get("projects", [])))
    return resume_data


def extract_resume_from_text(raw_text: str) -> dict[str, Any]:
    """直接从文本提取结构化简历信息（用于已有文本内容的场景）。

    Args:
        raw_text: 简历原始文本。

    Returns:
        结构化简历字典。
    """
    try:
        resume_data = thinker.think_json_with_template(
            RESUME_EXTRACTION_PROMPT,
            {"resume_text": raw_text},
        )
    except Exception as e:
        logger.error("LLM 结构化提取失败: %s", e)
        raise ValueError(f"简历结构化提取失败: {e}") from e

    if not isinstance(resume_data, dict):
        raise ValueError("LLM 返回的简历数据格式异常")

    resume_data["_raw_text"] = raw_text
    return resume_data
