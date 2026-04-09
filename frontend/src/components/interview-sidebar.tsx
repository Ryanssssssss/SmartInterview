"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  FileText,
  Briefcase,
  MessageSquare,
  BarChart3,
  History,
  Plus,
  Target,
  ChevronDown,
  ChevronRight,
  CheckCircle,
  Clock,
  Trash2,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { SettingsDialog } from "@/components/settings-dialog";
import { getSessions, deleteSession } from "@/lib/api";
import type { SessionItem } from "@/types/interview";

interface SidebarProps {
  phase?: string;
  progress?: { current_question: number; total_questions: number };
}

const PHASE_STEPS = [
  { key: "upload", label: "上传简历", icon: FileText },
  { key: "job_select", label: "选择岗位", icon: Briefcase },
  { key: "interview", label: "模拟面试", icon: MessageSquare },
  { key: "report", label: "反馈报告", icon: BarChart3 },
];

export function InterviewSidebar({ phase, progress }: SidebarProps) {
  const pathname = usePathname();
  const phaseIndex = PHASE_STEPS.findIndex((s) => s.key === phase);

  const [historyOpen, setHistoryOpen] = useState(false);
  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyLoaded, setHistoryLoaded] = useState(false);

  useEffect(() => {
    if (historyOpen && !historyLoaded) {
      setHistoryLoading(true);
      getSessions()
        .then(setSessions)
        .catch(() => {})
        .finally(() => {
          setHistoryLoading(false);
          setHistoryLoaded(true);
        });
    }
  }, [historyOpen, historyLoaded]);

  const handleDeleteSession = async (sessionId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    await deleteSession(sessionId);
    setSessions((prev) => prev.filter((s) => s.session_id !== sessionId));
  };

  return (
    <aside className="flex h-full w-64 flex-col border-r bg-card">
      <div className="flex items-center gap-2 px-5 py-5">
        <Target className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-lg font-semibold">面霸</h1>
          <p className="text-xs text-muted-foreground">AI 面试教练</p>
        </div>
      </div>

      <Separator />

      <ScrollArea className="flex-1 px-3 py-4">
        {phase && (
          <div className="mb-6">
            <p className="mb-3 px-2 text-xs font-medium text-muted-foreground">
              面试进度
            </p>
            <div className="space-y-1">
              {PHASE_STEPS.map((step, i) => {
                const Icon = step.icon;
                const isCurrent = step.key === phase;
                const isDone = i < phaseIndex;
                return (
                  <div
                    key={step.key}
                    className={`flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors ${
                      isCurrent
                        ? "bg-primary/10 font-medium text-primary"
                        : isDone
                          ? "text-muted-foreground"
                          : "text-muted-foreground/50"
                    }`}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span>{step.label}</span>
                    {isDone && (
                      <span className="ml-auto text-xs text-green-500">✓</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {progress && progress.total_questions > 0 && (
          <div className="mb-6 px-2">
            <div className="mb-1.5 flex items-center justify-between text-xs text-muted-foreground">
              <span>题目进度</span>
              <span>
                {progress.current_question}/{progress.total_questions}
              </span>
            </div>
            <Progress
              value={(progress.current_question / progress.total_questions) * 100}
              className="h-1.5"
            />
          </div>
        )}

        <Separator className="my-3" />

        <div className="space-y-1">
          <Link href="/">
            <Button
              variant={pathname === "/" ? "secondary" : "ghost"}
              className="w-full justify-start gap-2"
              size="sm"
            >
              <Plus className="h-4 w-4" />
              新面试
            </Button>
          </Link>

          {/* History dropdown */}
          <Button
            variant={historyOpen ? "secondary" : "ghost"}
            className="w-full justify-start gap-2"
            size="sm"
            onClick={() => setHistoryOpen(!historyOpen)}
          >
            <History className="h-4 w-4" />
            历史记录
            {historyOpen ? (
              <ChevronDown className="ml-auto h-3.5 w-3.5" />
            ) : (
              <ChevronRight className="ml-auto h-3.5 w-3.5" />
            )}
          </Button>

          {historyOpen && (
            <div className="ml-2 space-y-0.5 border-l pl-3">
              {historyLoading ? (
                <div className="flex items-center gap-2 py-2 text-xs text-muted-foreground">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  加载中...
                </div>
              ) : sessions.length === 0 ? (
                <p className="py-2 text-xs text-muted-foreground">暂无记录</p>
              ) : (
                sessions.map((s) => (
                  <Link
                    key={s.session_id}
                    href={s.has_report ? `/report/${s.session_id}` : `/interview/${s.session_id}`}
                  >
                    <div className="group flex items-center gap-1.5 rounded px-2 py-1.5 text-xs hover:bg-accent">
                      {s.has_report ? (
                        <CheckCircle className="h-3 w-3 shrink-0 text-green-500" />
                      ) : (
                        <Clock className="h-3 w-3 shrink-0 text-amber-500" />
                      )}
                      <span className="flex-1 truncate">
                        {s.candidate_name || "未知"}{s.job_category ? ` · ${s.job_category}` : ""}
                      </span>
                      <button
                        onClick={(e) => handleDeleteSession(s.session_id, e)}
                        className="hidden shrink-0 text-muted-foreground hover:text-destructive group-hover:block"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </Link>
                ))
              )}
            </div>
          )}

          <SettingsDialog />
        </div>
      </ScrollArea>
    </aside>
  );
}
