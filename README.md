# 🎯 面霸 — AI 简历面试教练

基于 **RAG + LangGraph Agent + 多模态语音** 的智能面试模拟系统。上传简历，AI 面试官根据你的真实项目经历进行个性化提问、追问和评分。

## 核心特性

- **简历驱动出题**：解析 PDF 简历，结合真题库 RAG 检索，生成与项目经历强相关的面试题
- **智能面试官**：像真人面试官一样追问、过渡、反问，支持跳题
- **实体级记忆**：每个项目/实习独立追踪，不串项目、不重复提问
- **多 LLM 支持**：DeepSeek / GPT / Gemini / Qwen / GLM / Kimi / SiliconFlow，一键切换
- **语音面试**：Qwen3-TTS 语音合成 + Qwen3-Omni 语音识别，可调语速
- **LeetCode 代码题**：完整题面 + 多语言代码编辑器（Python3 / C++ / Java / Go / JavaScript / TypeScript / Rust / C）+ Python3 本地样例测试 + LeetCode 链接
- **岗位智能过滤**：只对与目标岗位相关的经历出题
- **面试反馈报告**：多维度评分 + 改进建议
- **多对话管理**：历史面试保存/加载/删除，自动清理过期会话

## 快速开始

### 环境要求

- Python >= 3.10（推荐 3.12）
- [uv](https://docs.astral.sh/uv/)（推荐）或 pip

### 1. 安装依赖

```bash
uv venv && source .venv/bin/activate
uv pip install -r requirements.txt
```

或使用 pip：

```bash
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
```

### 2. 配置

```bash
cp .env.example .env
```

编辑 `.env`，填写所选 Provider 的 API Key：

```bash
# 选择 LLM 提供商
LLM_PROVIDER=deepseek

# 对应的 API Key
DEEPSEEK_API_KEY=your-key

# 语音功能（可选，需阿里云 DashScope Key）
VOICE_API_KEY=your-dashscope-key
```

完整配置项参考 [.env.example](.env.example)。

### 3. 启动

```bash
streamlit run app.py
```

浏览器将自动打开 `http://localhost:8501`。

## 支持的 LLM

| Provider | 默认模型 |
|----------|---------|
| DeepSeek | deepseek-chat |
| OpenAI (GPT) | gpt-4o-mini |
| Google Gemini | gemini-2.0-flash |
| 通义千问 | qwen-plus |
| 智谱 GLM | glm-4-flash |
| Moonshot (Kimi) | moonshot-v1-8k |
| SiliconFlow | DeepSeek-V3 |
| 自定义 | 任何 OpenAI 兼容 API |

> 可在侧边栏随时切换 Provider、模型和 API Key，无需重启。

## 面试模式

| 模式 | 说明 |
|------|------|
| 技术岗面试 | 实习深入 + 项目 + 八股文 + LeetCode |
| 简历深度拷打 | 所有经历逐个深挖，不考八股 |

## 项目结构

```
SmartInterview/
├── app.py                          # Streamlit 主入口
├── config/
│   └── settings.py                 # 全局配置 + 多 Provider
├── core/
│   ├── agent/                      # LangGraph Agent（状态机 + Memory）
│   │   ├── graph.py                # StateGraph 定义与流程编排
│   │   ├── nodes.py                # 节点逻辑（出题、追问、评估）
│   │   └── states.py               # Agent 状态定义
│   ├── llm/                        # LLM 接口层
│   │   ├── prompts.py              # Prompt 模板
│   │   ├── providers.py            # 多 Provider 注册表
│   │   └── thinker.py              # 统一 LLM 调用入口
│   ├── interview/                  # 面试核心逻辑
│   │   ├── question_gen.py         # 出题引擎
│   │   ├── evaluator.py            # 回答评估
│   │   └── reporter.py             # 面试报告生成
│   ├── rag/                        # 真题库语义检索
│   │   ├── embeddings.py           # Embedding 模型管理
│   │   ├── retriever.py            # 检索器
│   │   ├── vectorstore.py          # 向量数据库
│   │   └── question_bank_rag.py    # 题库 RAG 封装
│   ├── resume/                     # 简历处理
│   │   ├── extractor.py            # PDF 文本提取
│   │   └── parser.py               # LLM 结构化解析
│   ├── data/                       # 内置数据
│   │   ├── question_bank.json      # 面试真题库
│   │   └── leetcode_hot100.json    # LeetCode 热题 100
│   ├── code_runner.py              # 代码沙箱运行（Python3 样例测试）
│   ├── leetcode_manager.py         # LeetCode 题目管理
│   └── session_manager.py          # 会话持久化 + 自动清理
├── interfaces/
│   ├── text_interface.py           # 文本交互接口
│   └── voice_interface.py          # 语音交互（TTS + STT）
├── scripts/
│   ├── fetch_leetcode.py           # 抓取 LeetCode 题目数据
│   └── patch_templates.py          # 补丁：模板处理
├── data/                           # 运行时数据（gitignore）
│   ├── uploads/                    # 上传的简历 PDF
│   ├── sessions/                   # 会话历史 JSON
│   └── chroma_db/                  # RAG 向量数据库
├── pyproject.toml
├── requirements.txt
└── .env.example
```

## 技术栈

| 模块 | 技术 |
|------|------|
| 前端 | Streamlit |
| Agent | LangGraph（StateGraph 状态机） |
| LLM | LangChain + OpenAI 兼容（多 Provider 统一接口） |
| 简历解析 | pdfplumber + LLM 结构化 |
| RAG | sentence-transformers（`BAAI/bge-small-zh-v1.5`）+ 本地真题库 |
| TTS | DashScope（qwen3-tts-instruct-flash-realtime） |
| STT | DashScope（qwen3-omni-flash） |
| 代码验证 | Python subprocess 沙箱 |

## License

MIT
