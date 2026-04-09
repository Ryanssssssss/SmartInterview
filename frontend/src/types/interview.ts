export interface Message {
  role: "interviewer" | "candidate";
  content: string;
}

export interface QuestionItem {
  id: number;
  question: string;
  type: string;
  dimension: string;
  difficulty: string;
  related_resume_point: string;
  leetcode_id?: number;
}

export interface InterviewProgress {
  phase: string;
  total_questions: number;
  current_question: number;
  is_finished: boolean;
}

export interface InterviewStatus {
  phase: string;
  progress: InterviewProgress;
  is_finished: boolean;
  current_question: QuestionItem | null;
}

export interface RunCodeResult {
  success: boolean;
  passed: number;
  total: number;
  output: string;
  error: string;
}

export interface DimensionScore {
  score: number;
  comment?: string;
}

export interface Improvement {
  area: string;
  suggestion: string;
  example?: string;
}

export interface InterviewReport {
  overall_score: number;
  overall_rating: string;
  dimension_scores: Record<string, DimensionScore | number>;
  top_strengths: string[];
  key_improvements: (Improvement | string)[];
  overall_feedback: string;
  preparation_tips: string[];
}

export interface SessionItem {
  session_id: string;
  candidate_name: string;
  job_category: string;
  saved_at: number | null;
  has_report: boolean;
}

export type InterviewPhase = "upload" | "job_select" | "interview" | "report";

export interface SSEResponseEvent {
  text: string;
  is_finished: boolean;
  phase: string;
  current_question: QuestionItem | null;
  audio_available: boolean;
}
