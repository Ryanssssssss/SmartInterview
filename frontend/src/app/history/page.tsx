"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Calendar,
  Briefcase,
  User,
  CheckCircle,
  Clock,
  Trash2,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getSessions, deleteSession } from "@/lib/api";
import type { SessionItem } from "@/types/interview";

export default function HistoryPage() {
  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    getSessions()
      .then(setSessions)
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const handleDelete = async (id: string) => {
    await deleteSession(id);
    setSessions((prev) => prev.filter((s) => s.session_id !== id));
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50/50 to-background">
      <div className="mx-auto max-w-3xl px-6 py-8">
        <div className="mb-8 flex items-center gap-4">
          <Link href="/">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">历史面试</h1>
            <p className="text-sm text-muted-foreground">
              查看过去的面试记录和报告
            </p>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : sessions.length === 0 ? (
          <div className="py-20 text-center">
            <p className="text-muted-foreground">暂无历史面试记录</p>
            <Link href="/">
              <Button className="mt-4">开始新面试</Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {sessions.map((s) => (
              <Card key={s.session_id} className="transition-shadow hover:shadow-md">
                <CardContent className="flex items-center gap-4 py-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                    {s.has_report ? (
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    ) : (
                      <Clock className="h-5 w-5 text-amber-500" />
                    )}
                  </div>

                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <User className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-sm font-medium">
                        {s.candidate_name || "未知"}
                      </span>
                      {s.job_category && (
                        <>
                          <Briefcase className="ml-2 h-3.5 w-3.5 text-muted-foreground" />
                          <span className="text-sm text-muted-foreground">
                            {s.job_category}
                          </span>
                        </>
                      )}
                    </div>
                    {s.saved_at && (
                      <div className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        {new Date(s.saved_at * 1000).toLocaleString("zh-CN")}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {s.has_report && (
                      <Link href={`/report/${s.session_id}`}>
                        <Button size="sm" variant="outline">
                          查看报告
                        </Button>
                      </Link>
                    )}
                    <Button
                      size="icon"
                      variant="ghost"
                      className="text-muted-foreground hover:text-destructive"
                      onClick={() => handleDelete(s.session_id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
