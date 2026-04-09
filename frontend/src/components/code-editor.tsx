"use client";

import { useState } from "react";
import Editor from "@monaco-editor/react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Play, Send, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { runCode } from "@/lib/api";

const LANGUAGES = [
  { value: "python3", label: "Python 3" },
  { value: "cpp", label: "C++" },
  { value: "java", label: "Java" },
  { value: "go", label: "Go" },
  { value: "javascript", label: "JavaScript" },
  { value: "typescript", label: "TypeScript" },
  { value: "rust", label: "Rust" },
];

const MONACO_LANG_MAP: Record<string, string> = {
  python3: "python",
  cpp: "cpp",
  java: "java",
  go: "go",
  javascript: "javascript",
  typescript: "typescript",
  rust: "rust",
};

function preprocessLeetCodeMd(md: string): string {
  // Data is already cleaned at source; just ensure single newlines between
  // example labels render as line breaks in markdown (trailing two spaces)
  return md.replace(/(\S)\n((?:输入|输出|解释)[：:])/g, "$1  \n$2");
}

interface CodeEditorProps {
  sessionId: string;
  leetcodeId: number;
  title: string;
  description: string;
  codeTemplate: string;
  slug?: string;
  onSubmit: (code: string, language: string) => void;
  submitting: boolean;
}

export function CodeEditor({
  sessionId,
  leetcodeId,
  title,
  description,
  codeTemplate,
  slug,
  onSubmit,
  submitting,
}: CodeEditorProps) {
  const [language, setLanguage] = useState("python3");
  const [code, setCode] = useState(codeTemplate);
  const [running, setRunning] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    passed: number;
    total: number;
    output: string;
    error: string;
  } | null>(null);

  const handleRun = async () => {
    setRunning(true);
    setTestResult(null);
    try {
      const result = await runCode(sessionId, code, language, leetcodeId);
      setTestResult(result);
    } catch (e) {
      setTestResult({
        success: false,
        passed: 0,
        total: 0,
        output: "",
        error: e instanceof Error ? e.message : "运行失败",
      });
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="flex h-full gap-4 p-4">
      {/* Left: Problem description */}
      <div className="flex w-1/2 flex-col overflow-hidden rounded-xl border">
        <div className="border-b bg-muted/30 px-4 py-3">
          <h3 className="font-semibold">
            {leetcodeId}. {title}
          </h3>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          <div className="prose prose-sm max-w-none dark:prose-invert">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {preprocessLeetCodeMd(description)}
            </ReactMarkdown>
          </div>
          {slug && (
            <a
              href={`https://leetcode.cn/problems/${slug}/`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-block text-sm text-primary hover:underline"
            >
              在 LeetCode 上查看 →
            </a>
          )}
        </div>
      </div>

      {/* Right: Editor + actions */}
      <div className="flex w-1/2 flex-col gap-3">
        <div className="flex items-center gap-2">
          <Select value={language} onValueChange={(v) => { if (v) setLanguage(v); }}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {LANGUAGES.map((l) => (
                <SelectItem key={l.value} value={l.value}>
                  {l.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex-1 overflow-hidden rounded-xl border">
          <Editor
            height="100%"
            language={MONACO_LANG_MAP[language] || "plaintext"}
            value={code}
            onChange={(v) => setCode(v || "")}
            theme="vs-light"
            options={{
              fontSize: 14,
              minimap: { enabled: false },
              padding: { top: 12 },
              scrollBeyondLastLine: false,
              wordWrap: "on",
            }}
          />
        </div>

        {testResult && (
          <div
            className={`rounded-lg border p-3 text-sm ${
              testResult.success
                ? "border-green-200 bg-green-50 text-green-700"
                : "border-red-200 bg-red-50 text-red-700"
            }`}
          >
            <p className="font-medium">
              {testResult.success ? "✓" : "✗"} 样例通过{" "}
              {testResult.passed}/{testResult.total}
            </p>
            {testResult.output && (
              <pre className="mt-1 text-xs opacity-80">{testResult.output}</pre>
            )}
            {testResult.error && (
              <pre className="mt-1 text-xs opacity-80">{testResult.error}</pre>
            )}
          </div>
        )}

        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleRun}
            disabled={running || submitting}
            className="flex-1"
          >
            {running ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Play className="mr-2 h-4 w-4" />
            )}
            运行样例
          </Button>
          <Button
            onClick={() => onSubmit(code, language)}
            disabled={submitting || running}
            className="flex-1"
          >
            {submitting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Send className="mr-2 h-4 w-4" />
            )}
            提交并继续
          </Button>
        </div>
      </div>
    </div>
  );
}
