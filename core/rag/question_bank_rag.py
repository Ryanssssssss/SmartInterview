"""面试真题 RAG 系统。

基于 FAISS + sentence-transformers 本地 embedding，
从 mock 真题库中检索与候选人简历+岗位最匹配的面试真题。
无需任何外部 API Key。
"""

import json
import logging
from pathlib import Path
from typing import Any

import numpy as np

from config.settings import settings

logger = logging.getLogger(__name__)

# 延迟导入，避免启动时就加载模型
_model = None
_index = None
_questions: list[dict[str, Any]] = []
_embeddings_cache: np.ndarray | None = None


def _get_model():
    """获取 sentence-transformers embedding 模型（延迟加载）。"""
    global _model
    if _model is None:
        try:
            from sentence_transformers import SentenceTransformer
            model_name = settings.local_embedding_model
            logger.info("加载本地 Embedding 模型: %s", model_name)
            _model = SentenceTransformer(model_name)
            logger.info("Embedding 模型加载完成")
        except ImportError:
            logger.warning("sentence-transformers 未安装，使用简单文本匹配回退")
            _model = "fallback"
    return _model


def _load_question_bank() -> list[dict[str, Any]]:
    """加载面试真题库。"""
    global _questions
    if _questions:
        return _questions

    bank_path = Path(settings.question_bank_path)
    if not bank_path.exists():
        logger.warning("真题库文件不存在: %s", bank_path)
        return []

    with open(bank_path, "r", encoding="utf-8") as f:
        _questions = json.load(f)

    logger.info("加载真题库: %d 道题", len(_questions))
    return _questions


def _build_question_text(q: dict) -> str:
    """将题目构建为用于 embedding 的文本。"""
    parts = [
        f"岗位:{q.get('category', '')}",
        f"类型:{q.get('type', '')}",
        f"维度:{q.get('dimension', '')}",
        q.get("question", ""),
    ]
    tags = q.get("tags", [])
    if tags:
        parts.append(f"标签:{','.join(tags)}")
    return " ".join(parts)


def _get_embeddings() -> np.ndarray:
    """获取题库的 embedding 向量（缓存）。"""
    global _embeddings_cache

    if _embeddings_cache is not None:
        return _embeddings_cache

    questions = _load_question_bank()
    if not questions:
        return np.array([])

    model = _get_model()
    texts = [_build_question_text(q) for q in questions]

    if model == "fallback":
        # 简单 TF-IDF 风格的回退方案
        _embeddings_cache = _simple_vectorize(texts)
    else:
        _embeddings_cache = model.encode(texts, normalize_embeddings=True)

    return _embeddings_cache


def _simple_vectorize(texts: list[str]) -> np.ndarray:
    """简单的文本向量化（无依赖回退方案，基于字符级别）。"""
    from collections import Counter

    # 构建词表
    all_words: set[str] = set()
    tokenized = []
    for t in texts:
        words = list(t)  # 字符级别
        tokenized.append(words)
        all_words.update(words)

    word_list = sorted(all_words)
    word_to_idx = {w: i for i, w in enumerate(word_list)}
    dim = len(word_list)

    vectors = np.zeros((len(texts), dim), dtype=np.float32)
    for i, words in enumerate(tokenized):
        counter = Counter(words)
        for w, cnt in counter.items():
            vectors[i, word_to_idx[w]] = cnt

    # L2 归一化
    norms = np.linalg.norm(vectors, axis=1, keepdims=True)
    norms[norms == 0] = 1
    vectors = vectors / norms
    return vectors


def search_questions(
    job_category: str,
    resume_context: str = "",
    top_k: int = 10,
    include_general: bool = True,
) -> list[dict[str, Any]]:
    """从真题库中搜索最匹配的面试题。

    Args:
        job_category: 目标岗位类别。
        resume_context: 简历关键信息文本（用于增强检索相关性）。
        top_k: 返回题目数量。
        include_general: 是否包含通用题。

    Returns:
        匹配的面试题列表。
    """
    questions = _load_question_bank()
    if not questions:
        logger.warning("真题库为空")
        return []

    # 构建查询文本
    query_parts = [f"面试岗位:{job_category}"]
    if resume_context:
        # 截取简历关键词（防止过长）
        query_parts.append(resume_context[:500])
    query_text = " ".join(query_parts)

    # 先按岗位过滤候选题
    category_questions = []
    general_questions = []
    for i, q in enumerate(questions):
        if q.get("category") == job_category:
            category_questions.append((i, q))
        elif q.get("category") == "通用" and include_general:
            general_questions.append((i, q))

    # 候选池 = 岗位题 + 通用题
    candidate_pool = category_questions + general_questions

    if not candidate_pool:
        # 如果没有匹配岗位的题，退回全量搜索
        candidate_pool = list(enumerate(questions))

    # 如果候选池不够大，直接返回
    if len(candidate_pool) <= top_k:
        return [q for _, q in candidate_pool]

    # 语义排序
    model = _get_model()
    embeddings = _get_embeddings()

    if model == "fallback" or len(embeddings) == 0:
        # 回退：随机选取
        import random
        random.shuffle(candidate_pool)
        return [q for _, q in candidate_pool[:top_k]]

    # 编码查询
    query_embedding = model.encode([query_text], normalize_embeddings=True)

    # 计算候选题的相似度
    candidate_indices = [i for i, _ in candidate_pool]
    candidate_embeddings = embeddings[candidate_indices]

    similarities = np.dot(candidate_embeddings, query_embedding.T).flatten()

    # 按相似度排序
    ranked_indices = np.argsort(similarities)[::-1][:top_k]

    results = []
    for rank_idx in ranked_indices:
        _, q = candidate_pool[rank_idx]
        results.append(q)

    logger.info(
        "RAG 搜索完成: 岗位=%s, 候选池=%d, 返回=%d",
        job_category, len(candidate_pool), len(results),
    )
    return results
