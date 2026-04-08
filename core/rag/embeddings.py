"""Embedding 模型管理。"""

from langchain_openai import OpenAIEmbeddings

from config.settings import settings

_embedding_instance: OpenAIEmbeddings | None = None


def get_embedding_model() -> OpenAIEmbeddings:
    """获取 Embedding 模型单例。"""
    global _embedding_instance
    if _embedding_instance is None:
        _embedding_instance = OpenAIEmbeddings(
            model=settings.embedding_model_name,
            openai_api_key=settings.openai_api_key,
            openai_api_base=settings.openai_base_url,
        )
    return _embedding_instance
