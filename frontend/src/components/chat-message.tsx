"use client";

import { Bot, User } from "lucide-react";

interface ChatMessageProps {
  role: "interviewer" | "candidate";
  content: string;
}

export function ChatMessage({ role, content }: ChatMessageProps) {
  const isInterviewer = role === "interviewer";

  return (
    <div className={`flex gap-3 ${isInterviewer ? "" : "flex-row-reverse"}`}>
      <div
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
          isInterviewer ? "bg-primary text-primary-foreground" : "bg-muted"
        }`}
      >
        {isInterviewer ? <Bot className="h-4 w-4" /> : <User className="h-4 w-4" />}
      </div>
      <div
        className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
          isInterviewer
            ? "bg-muted text-foreground"
            : "bg-primary text-primary-foreground"
        }`}
      >
        <p className="whitespace-pre-wrap">{content}</p>
      </div>
    </div>
  );
}
