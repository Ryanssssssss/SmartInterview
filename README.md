# 🎯 面霸 — AI 简历面试教练

基于 **RAG + LangGraph Agent + 多模态语音** 的智能面试模拟系统。上传简历，AI 面试官根据你的真实项目经历进行个性化提问、追问和评分。

## 核心特性

- **简历驱动出题**：解析 PDF 简历，结合真题库 RAG 检索，生成与你项目经历强相关的面试题
- **智能面试官 Agent**：LangGraph 状态机驱动的多轮对话，像真人面试官一样追问和过渡
- **实体级记忆系统**：每个项目/实习/论文独立追踪，不会串项目、不会重复提问
- **语音面试模式**：Qwen3-TTS 语音合成 + Qwen3-Omni STT 语音识别，支持语音对答
- **摄像头预览**：模拟真实面试氛围
- **面试反馈报告**：多维度评分（专业能力/沟通表达/逻辑思维/STAR结构）+ 改进建议
- **LeetCode Hot 100**：技术岗面试最后自动追加一道算法题
- **多对话管理**：支持多次面试历史保存/加载/删除，自动清理过期数据

## 技术架构

```
用户语音 → [STT: Qwen3-Omni] → 文本 → LangGraph Agent → DeepSeek LLM → 文本 → [TTS: Qwen3-TTS] → 语音
                                            ↕                      ↕
                                    实体级 Memory            RAG 真题检索
                                            ↕
                                  追问/评估/出题/报告
```

| 模块 | 技术 |
|------|------|
| 前端 | Streamlit |
| LLM | DeepSeek Chat（OpenAI 兼容） |
| Agent | LangGraph 状态机 |
| 简历解析 | pdfplumber + LLM 结构化提取 |
| RAG | sentence-transformers 本地 Embedding + 真题库 |
| TTS | DashScope qwen3-tts-instruct-flash-realtime |
| STT | DashScope qwen3-omni-flash |
| 会话管理 | JSON 文件持久化 + 自动清理 |

## 项目结构

```
SmartInterview/
├── app.py                          # Streamlit 主入口
├── config/
│   └── settings.py                 # 全局配置（pydantic-settings）
├── core/
│   ├── agent/
│   │   ├── graph.py                # InterviewAgent 调度
│   │   ├── nodes.py                # LangGraph 节点（提问/追问/评估/报告）
│   │   └── states.py              # 状态定义 + 实体级 Memory
│   ├── data/
│   │   ├── question_bank.json     # 面试真题库（含八股）
│   │   └── leetcode_hot100.json   # LeetCode Hot 100
│   ├── interview/
│   │   ├── question_gen.py        # RAG + LLM 智能出题
│   │   ├── evaluator.py           # 回答评估 + 追问决策
│   │   └── reporter.py            # 反馈报告生成
│   ├── llm/
│   │   ├── thinker.py             # LLM 统一接口
│   │   └── prompts.py             # 所有 Prompt 模板
│   ├── rag/
│   │   └── question_bank_rag.py   # 真题语义检索
│   ├── resume/
│   │   ├── parser.py              # PDF 文本提取
│   │   └── extractor.py           # LLM 结构化简历提取
│   └── session_manager.py         # 多对话持久化 + 自动清理
├── interfaces/
│   ├── text_interface.py          # 文本交互接口
│   └── voice_interface.py         # 语音交互（TTS + STT）
├── data/
│   ├── uploads/                   # 用户上传简历（.gitignore）
│   └── sessions/                  # 会话持久化
├── requirements.txt
└── .env.example
```

## 快速开始

### 1. 安装依赖

```bash
# 推荐使用 uv
uv venv && source .venv/bin/activate
uv pip install -r requirements.txt

# 或 pip
pip install -r requirements.txt
```

### 2. 配置 API Key

```bash
cp .env.example .env
# 编辑 .env，填入：
# - OPENAI_API_KEY: DeepSeek API Key
# - VOICE_API_KEY: 阿里云 DashScope API Key（语音功能，可选）
```

### 3. 启动

```bash
streamlit run app.py
# 浏览器打开 http://localhost:8501
```

## 使用流程

1. **上传简历** — 上传 PDF 格式简历
2. **选择岗位** — 选择目标岗位或"简历深度拷打"模式
3. **模拟面试** — AI 面试官逐题提问，支持语音/文本双模式
4. **查看报告** — 面试结束后查看多维度评分和改进建议

## 面试模式

| 模式 | 说明 |
|------|------|
| 技术岗面试 | 项目深入 + 八股文 + LeetCode 算法题 |
| 简历深度拷打 | 100% 围绕简历每个项目逐个深挖，不考八股 |

## 配置项

| 环境变量 | 说明 | 必填 |
|---------|------|------|
| `OPENAI_API_KEY` | DeepSeek API Key | ✅ |
| `OPENAI_BASE_URL` | API 地址（默认 DeepSeek） | ✅ |
| `VOICE_API_KEY` | DashScope API Key（语音） | ❌ |
| `VOICE_MODEL_NAME` | TTS/STT 模型 | ❌ |

## License

MIT
