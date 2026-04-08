"""LLM Thinker 核心引擎 —— 统一的文本生成接口。

支持多 Provider 动态切换。所有模块通过 Thinker 与 LLM 交互。
"""

import json
import logging
from typing import Any, AsyncIterator

from langchain_openai import ChatOpenAI
from langchain_core.messages import HumanMessage, SystemMessage

from config.settings import settings

logger = logging.getLogger(__name__)


class Thinker:
    """LLM 文本生成引擎。"""

    def __init__(
        self,
        model_name: str | None = None,
        temperature: float | None = None,
        api_key: str | None = None,
        base_url: str | None = None,
    ):
        if api_key and base_url and model_name:
            # 直接指定参数
            self._init_llm(api_key, base_url, model_name, temperature or 0.7)
        else:
            # 从 settings 的 Provider 配置读取
            config = settings.get_llm_config()
            self._init_llm(
                api_key=api_key or config["api_key"],
                base_url=base_url or config["base_url"],
                model=model_name or config["model"],
                temperature=temperature if temperature is not None else config["temperature"],
            )

    def _init_llm(self, api_key: str, base_url: str, model: str, temperature: float):
        self._llm = ChatOpenAI(
            model=model,
            temperature=temperature,
            api_key=api_key,
            base_url=base_url,
        )
        logger.info("Thinker 初始化: model=%s, base_url=%s", model, base_url)

    def think(self, prompt: str, system_prompt: str | None = None) -> str:
        messages = []
        if system_prompt:
            messages.append(SystemMessage(content=system_prompt))
        messages.append(HumanMessage(content=prompt))
        response = self._llm.invoke(messages)
        return response.content

    def think_json(self, prompt: str, system_prompt: str | None = None) -> dict | list:
        raw = self.think(prompt, system_prompt)
        return self._parse_json(raw)

    async def think_stream(
        self, prompt: str, system_prompt: str | None = None
    ) -> AsyncIterator[str]:
        messages = []
        if system_prompt:
            messages.append(SystemMessage(content=system_prompt))
        messages.append(HumanMessage(content=prompt))
        async for chunk in self._llm.astream(messages):
            if chunk.content:
                yield chunk.content

    def think_with_template(
        self, template: str, variables: dict[str, Any], system_prompt: str | None = None
    ) -> str:
        prompt = template.format(**variables)
        return self.think(prompt, system_prompt)

    def think_json_with_template(
        self, template: str, variables: dict[str, Any], system_prompt: str | None = None
    ) -> dict | list:
        prompt = template.format(**variables)
        return self.think_json(prompt, system_prompt)

    @staticmethod
    def _parse_json(text: str) -> dict | list:
        cleaned = text.strip()
        if cleaned.startswith("```"):
            lines = cleaned.split("\n")
            start = 1
            end = len(lines) - 1 if lines[-1].strip() == "```" else len(lines)
            cleaned = "\n".join(lines[start:end])
        return json.loads(cleaned)


def create_thinker(**kwargs) -> Thinker:
    """工厂函数：创建 Thinker 实例（方便切换 Provider 后重建）。"""
    return Thinker(**kwargs)


# 全局单例
thinker = Thinker()
