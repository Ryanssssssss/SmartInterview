"""Chroma 向量存储管理。

将简历结构化信息分块向量化存入 ChromaDB，用于面试题生成时的语义检索。
"""

import logging
from typing import Any

from langchain_community.vectorstores import Chroma
from langchain_core.documents import Document

from config.settings import settings
from core.rag.embeddings import get_embedding_model

logger = logging.getLogger(__name__)


class ResumeVectorStore:
    """简历向量存储，将简历按维度分块存入 Chroma。"""

    COLLECTION_NAME = "resume_chunks"

    def __init__(self, persist_directory: str | None = None):
        settings.ensure_dirs()
        self._persist_dir = persist_directory or settings.chroma_persist_dir
        self._embedding = get_embedding_model()
        self._vectorstore: Chroma | None = None

    @property
    def vectorstore(self) -> Chroma:
        if self._vectorstore is None:
            self._vectorstore = Chroma(
                collection_name=self.COLLECTION_NAME,
                embedding_function=self._embedding,
                persist_directory=self._persist_dir,
            )
        return self._vectorstore

    def index_resume(self, resume_data: dict[str, Any], session_id: str = "default") -> int:
        """将结构化简历分块存入向量数据库。

        分块策略：按维度拆分（项目、实习、技能、教育背景各为独立 chunk），
        保证检索时能精准命中相关经历。

        Args:
            resume_data: 结构化简历数据。
            session_id: 会话ID，用于隔离不同用户的数据。

        Returns:
            存入的文档数量。
        """
        documents: list[Document] = []
        base_meta = {"session_id": session_id, "name": resume_data.get("name", "未知")}

        # 1. 项目经历 —— 每个项目一个 chunk
        for proj in resume_data.get("projects", []):
            content = (
                f"项目名称：{proj.get('name', '')}\n"
                f"项目描述：{proj.get('description', '')}\n"
                f"技术栈：{', '.join(proj.get('tech_stack', []))}\n"
                f"担任角色：{proj.get('role', '')}\n"
                f"亮点：{'; '.join(proj.get('highlights', []))}"
            )
            documents.append(Document(
                page_content=content,
                metadata={**base_meta, "chunk_type": "project", "project_name": proj.get("name", "")},
            ))

        # 2. 实习经历 —— 每段实习一个 chunk
        for intern in resume_data.get("internships", []):
            content = (
                f"公司：{intern.get('company', '')}\n"
                f"职位：{intern.get('role', '')}\n"
                f"时间：{intern.get('duration', '')}\n"
                f"职责：{'; '.join(intern.get('responsibilities', []))}"
            )
            documents.append(Document(
                page_content=content,
                metadata={**base_meta, "chunk_type": "internship", "company": intern.get("company", "")},
            ))

        # 3. 技能汇总 —— 一个 chunk
        skills = resume_data.get("skills", [])
        if skills:
            documents.append(Document(
                page_content=f"技能列表：{', '.join(skills)}",
                metadata={**base_meta, "chunk_type": "skills"},
            ))

        # 4. 教育背景 —— 一个 chunk
        for edu in resume_data.get("education", []):
            content = (
                f"学校：{edu.get('school', '')}\n"
                f"专业：{edu.get('major', '')}\n"
                f"学历：{edu.get('degree', '')}\n"
                f"时间：{edu.get('start_date', '')} - {edu.get('end_date', '')}"
            )
            documents.append(Document(
                page_content=content,
                metadata={**base_meta, "chunk_type": "education"},
            ))

        # 5. 综合摘要 —— 一个 chunk
        summary = resume_data.get("summary", "")
        if summary:
            documents.append(Document(
                page_content=f"候选人摘要：{summary}",
                metadata={**base_meta, "chunk_type": "summary"},
            ))

        if not documents:
            logger.warning("简历中未提取到任何可向量化的内容")
            return 0

        self.vectorstore.add_documents(documents)
        logger.info("已将 %d 个简历 chunk 存入向量数据库 (session: %s)", len(documents), session_id)
        return len(documents)

    def clear(self, session_id: str | None = None) -> None:
        """清除向量数据库中的文档。"""
        if session_id:
            # 按 session 清除
            results = self.vectorstore.get(where={"session_id": session_id})
            if results and results["ids"]:
                self.vectorstore.delete(ids=results["ids"])
                logger.info("已清除 session %s 的 %d 个文档", session_id, len(results["ids"]))
        else:
            # 清除全部（重新创建 collection）
            self._vectorstore = Chroma(
                collection_name=self.COLLECTION_NAME,
                embedding_function=self._embedding,
                persist_directory=self._persist_dir,
            )
            self.vectorstore.delete_collection()
            self._vectorstore = None
            logger.info("已清除全部向量数据")
