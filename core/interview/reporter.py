"""面试反馈报告生成器。

面试结束后，汇总所有题目的评估结果，生成综合反馈报告。
"""

import logging
from typing import Any

from core.llm.thinker import thinker
from core.llm.prompts import FINAL_REPORT_PROMPT

logger = logging.getLogger(__name__)


class ReportGenerator:
    """面试反馈报告生成器。"""

    def generate_report(
        self,
        candidate_name: str,
        job_category: str,
        evaluations: list[dict[str, Any]],
        conversation_history: list[dict[str, str]],
    ) -> dict[str, Any]:
        """生成综合面试反馈报告。

        Args:
            candidate_name: 候选人姓名。
            job_category: 目标岗位。
            evaluations: 各题评估结果列表。
            conversation_history: 完整对话记录。

        Returns:
            结构化的反馈报告字典。
        """
        # 格式化评估汇总
        eval_lines = []
        for i, ev in enumerate(evaluations, 1):
            score = ev.get("overall_score", "N/A")
            strengths = "; ".join(ev.get("strengths", []))
            improvements = "; ".join(ev.get("improvements", []))
            eval_lines.append(
                f"第{i}题: 得分{score} | 优点: {strengths} | 改进: {improvements}"
            )
        evaluations_summary = "\n".join(eval_lines) if eval_lines else "无评估数据"

        # 格式化对话记录
        conv_lines = []
        for msg in conversation_history:
            role = "面试官" if msg.get("role") == "interviewer" else "候选人"
            conv_lines.append(f"{role}: {msg.get('content', '')}")
        conversation_summary = "\n".join(conv_lines) if conv_lines else "无对话记录"

        try:
            report = thinker.think_json_with_template(
                FINAL_REPORT_PROMPT,
                {
                    "candidate_name": candidate_name,
                    "job_category": job_category,
                    "evaluations_summary": evaluations_summary,
                    "conversation_summary": conversation_summary,
                },
            )
        except Exception as e:
            logger.error("报告生成失败: %s", e)
            report = {
                "overall_rating": "N/A",
                "overall_score": 0,
                "dimension_scores": {},
                "top_strengths": [],
                "key_improvements": [],
                "overall_feedback": f"报告生成出现异常: {e}",
                "preparation_tips": [],
            }

        logger.info("面试报告已生成，综合评分: %s", report.get("overall_score", "N/A"))
        return report
