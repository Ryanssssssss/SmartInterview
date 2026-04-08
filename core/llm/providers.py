"""LLM Provider 注册表 —— 支持多个 AI 提供商，用户可自由切换。

所有 OpenAI 兼容的 API 都可以接入，只需配置 base_url + api_key + model_name。
"""

from dataclasses import dataclass


@dataclass
class LLMProvider:
    """一个 LLM 提供商的配置。"""
    name: str           # 显示名
    base_url: str       # API 地址
    default_model: str  # 默认模型
    models: list[str]   # 可用模型列表
    env_key: str        # .env 中的 API Key 变量名


# ── 内置的提供商列表 ──
PROVIDERS: dict[str, LLMProvider] = {
    "deepseek": LLMProvider(
        name="DeepSeek",
        base_url="https://api.deepseek.com/v1",
        default_model="deepseek-chat",
        models=["deepseek-chat", "deepseek-reasoner"],
        env_key="DEEPSEEK_API_KEY",
    ),
    "openai": LLMProvider(
        name="OpenAI (GPT)",
        base_url="https://api.openai.com/v1",
        default_model="gpt-4o-mini",
        models=["gpt-4o-mini", "gpt-4o", "gpt-4.1-mini", "gpt-4.1-nano", "o3-mini"],
        env_key="OPENAI_API_KEY",
    ),
    "gemini": LLMProvider(
        name="Google Gemini",
        base_url="https://generativelanguage.googleapis.com/v1beta/openai",
        default_model="gemini-2.0-flash",
        models=["gemini-2.0-flash", "gemini-2.5-flash-preview-05-20", "gemini-2.5-pro-preview-05-06"],
        env_key="GEMINI_API_KEY",
    ),
    "qwen": LLMProvider(
        name="通义千问 (Qwen)",
        base_url="https://dashscope.aliyuncs.com/compatible-mode/v1",
        default_model="qwen-plus",
        models=["qwen-plus", "qwen-turbo", "qwen-max", "qwen3-235b-a22b"],
        env_key="QWEN_API_KEY",
    ),
    "zhipu": LLMProvider(
        name="智谱 (GLM)",
        base_url="https://open.bigmodel.cn/api/paas/v4",
        default_model="glm-4-flash",
        models=["glm-4-flash", "glm-4-plus", "glm-4"],
        env_key="ZHIPU_API_KEY",
    ),
    "moonshot": LLMProvider(
        name="Moonshot (Kimi)",
        base_url="https://api.moonshot.cn/v1",
        default_model="moonshot-v1-8k",
        models=["moonshot-v1-8k", "moonshot-v1-32k", "moonshot-v1-128k"],
        env_key="MOONSHOT_API_KEY",
    ),
    "siliconflow": LLMProvider(
        name="SiliconFlow",
        base_url="https://api.siliconflow.cn/v1",
        default_model="deepseek-ai/DeepSeek-V3",
        models=["deepseek-ai/DeepSeek-V3", "Qwen/Qwen2.5-72B-Instruct", "meta-llama/Llama-3.3-70B-Instruct"],
        env_key="SILICONFLOW_API_KEY",
    ),
    "custom": LLMProvider(
        name="自定义 (OpenAI 兼容)",
        base_url="",
        default_model="",
        models=[],
        env_key="CUSTOM_API_KEY",
    ),
}


def get_provider(provider_id: str) -> LLMProvider | None:
    return PROVIDERS.get(provider_id)


def list_providers() -> list[tuple[str, str]]:
    """返回 [(id, display_name), ...]"""
    return [(k, v.name) for k, v in PROVIDERS.items()]
