"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  Lightbulb,
  MessageSquare,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ScoreCard, DimensionBars } from "@/components/report-cards";
import { ChatMessage } from "@/components/chat-message";
import { getReport } from "@/lib/api";
import type { InterviewReport, Message } from "@/types/interview";

export default function ReportPage() {
  const { id } = useParams<{ id: string }>();
  const [report, setReport] = useState<InterviewReport | null>(null);
  const [history, setHistory] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    getReport(id)
      .then((res) => {
        setReport(res.report as unknown as InterviewReport);
        setHistory(
          res.conversation_history.map((m) => ({
            role: m.role === "interviewer" ? "interviewer" : "candidate",
            content: m.content,
          })) as Message[]
        );
      })
      .catch((e) => setError(e instanceof Error ? e.message : "加载失败"))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4">
        <p className="text-destructive">{error || "暂无报告"}</p>
        <Link href="/">
          <Button variant="outline">返回首页</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50/50 to-background">
      <div className="mx-auto max-w-4xl px-6 py-8">
        {/* Header */}
        <div className="mb-8 flex items-center gap-4">
          <Link href="/">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">面试反馈报告</h1>
            <p className="text-sm text-muted-foreground">
              面试已完成，以下是 AI 面试官的详细评价
            </p>
          </div>
        </div>

        {/* Score cards */}
        <div className="mb-8 grid grid-cols-3 gap-4">
          <ScoreCard value={report.overall_score ?? "N/A"} label="综合评分" />
          <ScoreCard value={report.overall_rating ?? "N/A"} label="评级" />
          <ScoreCard value={history.filter((m) => m.role === "candidate").length} label="回答次数" />
        </div>

        {/* Dimension scores */}
        {report.dimension_scores && Object.keys(report.dimension_scores).length > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-lg">各维度评分</CardTitle>
            </CardHeader>
            <CardContent>
              <DimensionBars dimensions={report.dimension_scores} />
            </CardContent>
          </Card>
        )}

        {/* Strengths */}
        {report.top_strengths?.length > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                主要优势
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {report.top_strengths.map((s, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <span className="mt-0.5 text-green-500">✓</span>
                    {s}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {/* Improvements */}
        {report.key_improvements?.length > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
                改进建议
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {report.key_improvements.map((imp, i) =>
                typeof imp === "string" ? (
                  <p key={i} className="text-sm">{imp}</p>
                ) : (
                  <div key={i} className="rounded-lg border p-3">
                    <p className="font-medium text-sm">{imp.area}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{imp.suggestion}</p>
                    {imp.example && (
                      <p className="mt-1 text-sm text-primary">💡 {imp.example}</p>
                    )}
                  </div>
                )
              )}
            </CardContent>
          </Card>
        )}

        {/* Feedback */}
        {report.overall_feedback && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <MessageSquare className="h-5 w-5 text-primary" />
                综合评语
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-relaxed">{report.overall_feedback}</p>
            </CardContent>
          </Card>
        )}

        {/* Tips */}
        {report.preparation_tips?.length > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Lightbulb className="h-5 w-5 text-amber-500" />
                备面建议
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ol className="list-inside list-decimal space-y-1.5 text-sm">
                {report.preparation_tips.map((t, i) => (
                  <li key={i}>{t}</li>
                ))}
              </ol>
            </CardContent>
          </Card>
        )}

        <Separator className="my-6" />

        {/* Conversation history */}
        <Button
          variant="outline"
          className="mb-4 w-full"
          onClick={() => setShowHistory((p) => !p)}
        >
          {showHistory ? "收起" : "展开"}完整对话记录 ({history.length} 条)
        </Button>

        {showHistory && (
          <ScrollArea className="h-96 rounded-xl border p-4">
            <div className="space-y-4">
              {history.map((msg, i) => (
                <ChatMessage key={i} role={msg.role} content={msg.content} />
              ))}
            </div>
          </ScrollArea>
        )}

        <div className="mt-8 text-center">
          <Link href="/">
            <Button>开始新面试</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
