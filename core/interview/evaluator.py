"""回答评估器。

评估候选人的回答质量，决定是否需要追问，并记录评估结果。
"""

import logging
from typing import Any

from core.llm.thinker import thinker
from core.llm.prompts import INTERVIEWER_FOLLOWUP_PROMPT, ANSWER_EVALUATION_PROMPT

logger = logging.getLogger(__name__)


class AnswerEvaluator:
    """面试回答评估器。"""

    def evaluate_for_followup(
        self,
        job_category: str,
        current_question: str,
        dimension: str,
        candidate_answer: str,
        conversation_history: str,
        follow_up_count: int = 0,
        max_follow_ups: int = 2,
        interview_memory: str = "",
    ) -> dict[str, Any]:
        """评估回答并决定是否追问。"""
        try:
            result = thinker.think_json_with_template(
                INTERVIEWER_FOLLOWUP_PROMPT,
                {
                    "job_category": job_category,
                    "current_question": current_question,
                    "dimension": dimension,
                    "candidate_answer": candidate_answer,
                    "conversation_history": conversation_history,
                    "follow_up_count": follow_up_count,
                    "max_follow_ups": max_follow_ups,
                    "interview_memory": interview_memory,
                },
            )
        except Exception as e:
            logger.error("追问评估失败: %s", e)
            return {
                "need_followup": False,
                "response": "好，下一个问题。",
                "answer_quality": "average",
                "brief_evaluation": f"评估失败: {e}",
            }

        # 安全兜底：如果已达追问上限，强制不追问
        if follow_up_count >= max_follow_ups:
            result["need_followup"] = False
            if not result.get("response"):
                result["response"] = "好，我们进入下一个问题。"

        return result

    def evaluate_answer(
        self,
        question: str,
        question_type: str,
        dimension: str,
        full_answer: str,
    ) -> dict[str, Any]:
        """对单道题的完整回答进行综合评估。"""
        try:
            result = thinker.think_json_with_template(
                ANSWER_EVALUATION_PROMPT,
                {
                    "question": question,
                    "question_type": question_type,
                    "dimension": dimension,
                    "full_answer": full_answer,
                },
            )
        except Exception as e:
            logger.error("回答评估失败: %s", e)
            return {
                "scores": {},
                "overall_score": 0,
                "strengths": [],
                "improvements": ["评估异常"],
            }

        return result
