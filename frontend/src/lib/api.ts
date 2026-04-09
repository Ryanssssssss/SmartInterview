const BASE = "";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail || `请求失败 (${res.status})`);
  }
  return res.json();
}

// ── Interview ──

export async function getResumes() {
  return request<{
    resumes: { path: string; name: string; size: number; modified: number }[];
  }>("/api/interview/resumes");
}

export async function reuseResume(resumePath: string) {
  return request<{ session_id: string }>("/api/interview/reuse", {
    method: "POST",
    body: JSON.stringify({ resume_path: resumePath }),
  });
}

export async function uploadResume(file: File) {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch(`${BASE}/api/interview`, { method: "POST", body: form });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail || "上传失败");
  }
  return res.json() as Promise<{ session_id: string }>;
}

export async function parseResumeSSE(
  sessionId: string,
  onGreeting: (greeting: string) => void,
  onError: (msg: string) => void
) {
  const res = await fetch(`${BASE}/api/interview/${sessionId}/parse`, {
    method: "POST",
  });
  if (!res.ok || !res.body) {
    const body = await res.json().catch(() => ({}));
    onError(body.detail || "简历解析失败");
    return;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    let currentEvent = "";
    for (const line of lines) {
      if (line.startsWith("event: ")) {
        currentEvent = line.slice(7).trim();
      } else if (line.startsWith("data: ")) {
        try {
          const parsed = JSON.parse(line.slice(6));
          if (currentEvent === "done") onGreeting(parsed.greeting);
          else if (currentEvent === "error") onError(parsed.message);
        } catch { /* ignore */ }
      }
    }
  }
}

export async function selectJobSSE(
  sessionId: string,
  jobCategory: string,
  includeCoding: boolean,
  onDone: (data: { message: string; questions_count: number }) => void,
  onError: (msg: string) => void,
) {
  const res = await fetch(`${BASE}/api/interview/${sessionId}/select-job`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ job_category: jobCategory, include_coding: includeCoding }),
  });

  if (!res.ok || !res.body) {
    const body = await res.json().catch(() => ({}));
    onError(body.detail || "选择岗位失败");
    return;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    let currentEvent = "";
    for (const line of lines) {
      if (line.startsWith("event: ")) {
        currentEvent = line.slice(7).trim();
      } else if (line.startsWith("data: ")) {
        try {
          const parsed = JSON.parse(line.slice(6));
          if (currentEvent === "done") onDone(parsed);
          else if (currentEvent === "error") onError(parsed.message);
        } catch { /* ignore */ }
      }
    }
  }
}

export async function submitAnswerSSE(
  sessionId: string,
  answer: string,
  onStatus: (status: string) => void,
  onResponse: (data: { text: string; is_finished: boolean; phase: string; current_question: unknown }) => void,
  onError: (msg: string) => void
) {
  const res = await fetch(`${BASE}/api/interview/${sessionId}/answer`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ answer }),
  });

  if (!res.ok || !res.body) {
    const body = await res.json().catch(() => ({}));
    onError(body.detail || "提交失败");
    return;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    let currentEvent = "";
    for (const line of lines) {
      if (line.startsWith("event: ")) {
        currentEvent = line.slice(7).trim();
      } else if (line.startsWith("data: ")) {
        const data = line.slice(6);
        try {
          const parsed = JSON.parse(data);
          if (currentEvent === "status") onStatus(parsed.status);
          else if (currentEvent === "response") onResponse(parsed);
          else if (currentEvent === "error") onError(parsed.message);
        } catch {
          // ignore parse errors
        }
      }
    }
  }
}

export async function getInterviewStatus(sessionId: string) {
  return request<{
    phase: string;
    progress: { phase: string; total_questions: number; current_question: number; is_finished: boolean };
    is_finished: boolean;
    current_question: unknown;
  }>(`/api/interview/${sessionId}/status`);
}

export async function getReport(sessionId: string) {
  return request<{ report: Record<string, unknown>; conversation_history: { role: string; content: string }[] }>(
    `/api/interview/${sessionId}/report`
  );
}

export async function runCode(sessionId: string, code: string, language: string, leetcodeId: number) {
  return request<{ success: boolean; passed: number; total: number; output: string; error: string }>(
    `/api/interview/${sessionId}/code/run`,
    { method: "POST", body: JSON.stringify({ code, language, leetcode_id: leetcodeId }) }
  );
}

export async function getLeetCodeProblem(problemId: number) {
  return request<{
    id: number;
    title: string;
    difficulty: string;
    description: string;
    code_template: string;
    test_cases: string[];
    slug: string;
    tags: string[];
  }>(`/api/interview/leetcode/${problemId}`);
}

export async function getJobCategories() {
  return request<{ categories: string[] }>("/api/interview/config/job-categories");
}

export async function getProviders() {
  return request<{
    providers: { id: string; name: string; models: string[]; default_model: string }[];
    current_provider: string;
    current_model: string | null;
    has_api_key: boolean;
    has_voice_key: boolean;
  }>("/api/interview/config/providers");
}

export async function updateConfig(config: {
  provider?: string;
  model?: string;
  api_key?: string;
  voice_api_key?: string;
}) {
  return request<{ ok: boolean }>("/api/interview/config", {
    method: "PUT",
    body: JSON.stringify(config),
  });
}

// ── Sessions ──

export async function getSessions() {
  return request<{ session_id: string; candidate_name: string; job_category: string; saved_at: number | null; has_report: boolean }[]>(
    "/api/sessions"
  );
}

export async function getSessionDetail(sessionId: string) {
  return request<Record<string, unknown>>(`/api/sessions/${sessionId}`);
}

export async function deleteSession(sessionId: string) {
  return request<{ ok: boolean }>(`/api/sessions/${sessionId}`, { method: "DELETE" });
}

// ── Voice ──

export async function speechToText(audioBlob: Blob) {
  const form = new FormData();
  form.append("file", audioBlob, "recording.wav");
  const res = await fetch(`${BASE}/api/voice/stt`, { method: "POST", body: form });
  if (!res.ok) throw new Error("语音识别失败");
  return res.json() as Promise<{ text: string }>;
}

export async function textToSpeech(text: string, speed?: number): Promise<ArrayBuffer> {
  const res = await fetch(`${BASE}/api/voice/tts`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, speed: speed ?? 1.25 }),
  });
  if (!res.ok) throw new Error("语音合成失败");
  return res.arrayBuffer();
}
