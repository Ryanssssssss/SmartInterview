"use client";

import { Card, CardContent } from "@/components/ui/card";

interface ScoreCardProps {
  value: string | number;
  label: string;
}

export function ScoreCard({ value, label }: ScoreCardProps) {
  return (
    <Card className="bg-gradient-to-br from-primary to-blue-700 text-primary-foreground shadow-lg">
      <CardContent className="py-6 text-center">
        <p className="text-4xl font-bold">{value}</p>
        <p className="mt-1 text-sm opacity-90">{label}</p>
      </CardContent>
    </Card>
  );
}

const DIMENSION_NAMES: Record<string, string> = {
  professional_ability: "专业能力",
  communication: "沟通表达",
  logical_thinking: "逻辑思维",
  stress_handling: "抗压应变",
  star_structure: "STAR结构",
};

interface DimensionBarProps {
  dimensions: Record<string, { score: number; comment?: string } | number>;
}

export function DimensionBars({ dimensions }: DimensionBarProps) {
  return (
    <div className="space-y-4">
      {Object.entries(dimensions).map(([key, val]) => {
        const score = typeof val === "number" ? val : val.score;
        const comment = typeof val === "object" ? val.comment : undefined;
        const pct = Math.min(score * 10, 100);
        return (
          <div key={key}>
            <div className="mb-1.5 flex items-center justify-between text-sm">
              <span className="font-medium">{DIMENSION_NAMES[key] || key}</span>
              <span className="text-muted-foreground">{score}/10</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-all duration-700"
                style={{ width: `${pct}%` }}
              />
            </div>
            {comment && (
              <p className="mt-1 text-xs text-muted-foreground">{comment}</p>
            )}
          </div>
        );
      })}
    </div>
  );
}
