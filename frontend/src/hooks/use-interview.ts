"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Message, InterviewPhase, QuestionItem } from "@/types/interview";
import * as api from "@/lib/api";

export function useInterview(sessionId: string) {
  const [phase, setPhase] = useState<InterviewPhase>("upload");
  const [messages, setMessages] = useState<Message[]>([]);
  const [greeting, setGreeting] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isFinished, setIsFinished] = useState(false);
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [currentQuestionNum, setCurrentQuestionNum] = useState(0);
  const [currentQuestion, setCurrentQuestion] = useState<QuestionItem | null>(null);
  const initialized = useRef(false);

  // On mount: check status first, if not parsed yet then trigger parse
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    api
      .getInterviewStatus(sessionId)
      .then((status) => {
        const p = status.progress;
        setTotalQuestions(p.total_questions);
        setCurrentQuestionNum(p.current_question);
        setIsFinished(status.is_finished);
        setCurrentQuestion(status.current_question as QuestionItem | null);

        if (status.is_finished) {
          setPhase("report");
          setLoading(false);
        } else if (p.total_questions > 0) {
          setPhase("interview");
          setLoading(false);
        } else if (status.phase !== "init") {
          // Resume already parsed, go to job selection
          setPhase("job_select");
          setLoading(false);
        } else {
          // Not parsed yet — trigger parse via SSE
          triggerParse();
        }
      })
      .catch(() => {
        // status 404 = fresh session, need to parse
        triggerParse();
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  function triggerParse() {
    setPhase("upload");
    setLoading(true);
    setError("");

    api.parseResumeSSE(
      sessionId,
      (g) => {
        setGreeting(g);
        setPhase("job_select");
        setLoading(false);
      },
      (msg) => {
        setError(msg);
        setLoading(false);
      }
    );
  }

  const selectJob = useCallback(
    async (jobCategory: string, includeCoding: boolean) => {
      setLoading(true);
      setError("");

      await api.selectJobSSE(
        sessionId,
        jobCategory,
        includeCoding,
        async (data) => {
          setGreeting("");
          setMessages((prev) => [
            ...prev,
            { role: "interviewer", content: data.message },
          ]);
          setTotalQuestions(data.questions_count);
          setPhase("interview");

          try {
            const status = await api.getInterviewStatus(sessionId);
            setCurrentQuestion(status.current_question as QuestionItem | null);
            setCurrentQuestionNum(status.progress.current_question);
          } catch { /* ignore */ }

          setLoading(false);
        },
        (msg) => {
          setError(msg);
          setLoading(false);
        },
      );
    },
    [sessionId]
  );

  const submitAnswer = useCallback(
    async (answer: string) => {
      setLoading(true);
      setError("");
      setMessages((prev) => [...prev, { role: "candidate", content: answer }]);

      await api.submitAnswerSSE(
        sessionId,
        answer,
        () => {},
        (data) => {
          setMessages((prev) => [
            ...prev,
            { role: "interviewer", content: data.text },
          ]);
          setIsFinished(data.is_finished);
          setCurrentQuestion(data.current_question as QuestionItem | null);
          if (data.is_finished) {
            setPhase("report");
          }
        },
        (msg) => setError(msg)
      );

      try {
        const status = await api.getInterviewStatus(sessionId);
        setCurrentQuestionNum(status.progress.current_question);
        setCurrentQuestion(status.current_question as QuestionItem | null);
        if (status.is_finished) {
          setIsFinished(true);
          setPhase("report");
        }
      } catch {
        // ignore
      }

      setLoading(false);
    },
    [sessionId]
  );

  return {
    phase,
    messages,
    greeting,
    setGreeting,
    loading,
    error,
    isFinished,
    totalQuestions,
    currentQuestionNum,
    currentQuestion,
    selectJob,
    submitAnswer,
  };
}
