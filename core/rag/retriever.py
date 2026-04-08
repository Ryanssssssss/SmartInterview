"""RAG 检索逻辑封装。

根据岗位和问题，从向量数据库检索最相关的简历片段，
作为 LLM 生成面试题的上下文。
"""

import logging
from typing import Any

from core.rag.vectorstore import ResumeVectorStore

logger = logging.getLogger(__name__)


class ResumeRetriever:
    """简历信息检索器，为面试题生成提供相关上下文。"""

    def __init__(self, vector_store: ResumeVectorStore | None = None):
        self._store = vector_store or ResumeVectorStore()

    def retrieve_for_question_gen(
        self, job_category: str, session_id: str = "default", top_k: int = 8
    ) -> str:
        """为面试题生成检索简历关键信息。

        Args:
            job_category: 目标岗位类别。
            session_id: 会话ID。
            top_k: 返回的最相关文档数。

        Returns:
            拼接后的简历上下文文本。
        """
        query = f"求职{job_category}岗位，候选人的项目经历、技能和实习经验"
        docs = self._store.vectorstore.similarity_search(
            query,
            k=top_k,
            filter={"session_id": session_id},
        )

        if not docs:
            logger.warning("未检索到任何简历信息 (session: %s)", session_id)
            return "暂无简历信息"

        context_parts = []
        for doc in docs:
            chunk_type = doc.metadata.get("chunk_type", "unknown")
            context_parts.append(f"[{chunk_type}] {doc.page_content}")

        context = "\n\n".join(context_parts)
        logger.info("检索到 %d 条简历片段，总长度 %d", len(docs), len(context))
        return context

    def retrieve_for_followup(
        self, question: str, candidate_answer: str, session_id: str = "default", top_k: int = 3
    ) -> str:
        """为追问检索相关简历背景信息。

        Args:
            question: 当前面试题。
            candidate_answer: 候选人回答。
            session_id: 会话ID。
            top_k: 返回数量。

        Returns:
            相关简历上下文。
        """
        query = f"{question} {candidate_answer}"
        docs = self._store.vectorstore.similarity_search(
            query,
            k=top_k,
            filter={"session_id": session_id},
        )

        if not docs:
            return ""

        return "\n\n".join(doc.page_content for doc in docs)
