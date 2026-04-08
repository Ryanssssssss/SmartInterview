"""面试状态定义。

定义 LangGraph 状态机中流转的状态数据结构。
"""

from typing import Any, Literal, TypedDict


class QuestionItem(TypedDict):
    """单道面试题。"""
    id: int
    question: str
    type: str  # behavioral / technical
    dimension: str
    difficulty: str  # easy / medium / hard
    related_resume_point: str


class ConversationMessage(TypedDict):
    """对话消息。"""
    role: Literal["interviewer", "candidate"]
    content: str


class QuestionEvaluation(TypedDict, total=False):
    """单题评估结果。"""
    question_id: int
    question: str
    scores: dict[str, Any]
    overall_score: float
    strengths: list[str]
    improvements: list[str]
    full_answer: str


class EntityRecord(TypedDict, total=False):
    """简历中的一个实体（项目/实习/论文等）的面试记录。"""
    name: str                   # 实体名称（如 "RepoMind"、"腾讯IEG实习"）
    entity_type: str            # project / internship / paper / education
    asked_topics: list[str]     # 针对此实体已问过的话题
    candidate_answers: list[str]  # 候选人关于此实体的回答要点
    status: str                 # "not_started" / "in_progress" / "done"


class InterviewMemory(TypedDict, total=False):
    """面试记忆 —— 按实体分隔存储，每个项目/经历独立追踪。"""
    entities: dict[str, EntityRecord]  # key=实体名, value=该实体的面试记录
    current_entity: str                # 当前正在讨论的实体名称
    general_topics: list[str]          # 不归属于特定实体的通用话题（如算法题）
    covered_dimensions: list[str]      # 全局已考察维度


class InterviewState(TypedDict, total=False):
    """面试全局状态，在 LangGraph 各节点间流转。"""

    # ── 输入阶段 ──
    resume_file: str
    resume_parsed: dict[str, Any]
    job_category: str
    session_id: str

    # ── 出题阶段 ──
    questions: list[QuestionItem]
    current_question_idx: int

    # ── 面试阶段 ──
    conversation_history: list[ConversationMessage]
    current_answer: str
    follow_up_count: int
    max_follow_ups: int
    interview_memory: InterviewMemory

    # ── 评估阶段 ──
    evaluations: list[QuestionEvaluation]
    current_question_answers: list[str]

    # ── 输出 ──
    thinker_output: str
    final_report: dict[str, Any]
    interview_phase: str
    needs_input: bool
    is_finished: bool
