"use client";

import { useEffect, useRef } from "react";
import {
  Briefcase,
  FolderGit2,
  GraduationCap,
  FileText,
  FlaskConical,
  Award,
  Wrench,
} from "lucide-react";

/* ---------- types ---------- */

interface Project {
  name?: string;
  description?: string;
  tech_stack?: string[];
  highlights?: string[];
  role?: string;
}

interface Internship {
  company?: string;
  role?: string;
  duration?: string;
  responsibilities?: string[];
}

interface Education {
  school?: string;
  major?: string;
  degree?: string;
  start_date?: string;
  end_date?: string;
}

interface Publication {
  title?: string;
  venue?: string;
  year?: string;
  description?: string;
  role?: string;
}

interface Research {
  topic?: string;
  lab?: string;
  description?: string;
  achievements?: string[];
}

export interface ResumeData {
  name?: string;
  projects?: Project[];
  internships?: Internship[];
  education?: Education[];
  publications?: Publication[];
  research?: Research[];
  skills?: string[];
  awards?: string[];
  summary?: string;
}

interface ResumePanelProps {
  data: ResumeData;
  activeEntity: string;
}

/* ---------- helpers ---------- */

function tokenize(s: string): string[] {
  return s
    .toLowerCase()
    .split(/[\s\-_—·,，/\\（）()【】\[\]]+/)
    .filter((t) => t.length >= 2);
}

function matches(entityName: string, active: string): boolean {
  if (!entityName || !active) return false;
  const a = entityName.toLowerCase();
  const b = active.toLowerCase();
  if (a.includes(b) || b.includes(a)) return true;
  const tokensA = tokenize(entityName);
  const tokensB = tokenize(active);
  return tokensA.some((ta) => tokensB.some((tb) => ta.includes(tb) || tb.includes(ta)));
}

/* ---------- card components ---------- */

function SectionTitle({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground/60">
      {icon}
      {label}
    </div>
  );
}

function EntityCard({
  name,
  isActive,
  children,
  cardRef,
}: {
  name: string;
  isActive: boolean;
  children: React.ReactNode;
  cardRef?: (el: HTMLDivElement | null) => void;
}) {
  return (
    <div
      ref={cardRef}
      className={`rounded-xl border px-3.5 py-3 transition-all duration-500 ${
        isActive
          ? "border-primary bg-primary/5 shadow-sm shadow-primary/10 ring-1 ring-primary/20"
          : "border-border/50 bg-card hover:border-border"
      }`}
    >
      <p className={`text-sm font-medium ${isActive ? "text-primary" : "text-foreground"}`}>
        {name}
      </p>
      <div className="mt-1.5 space-y-1 text-xs text-muted-foreground">{children}</div>
    </div>
  );
}

function TagList({ items }: { items: string[] }) {
  if (!items.length) return null;
  return (
    <div className="flex flex-wrap gap-1 pt-1">
      {items.map((t, i) => (
        <span
          key={i}
          className="rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground"
        >
          {t}
        </span>
      ))}
    </div>
  );
}

/* ---------- main component ---------- */

export function ResumePanel({ data, activeEntity }: ResumePanelProps) {
  const activeRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (activeRef.current) {
      activeRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [activeEntity]);

  const refCallback = (name: string) => (el: HTMLDivElement | null) => {
    if (matches(name, activeEntity)) {
      activeRef.current = el;
    }
  };

  const { projects, internships, education, publications, research, skills, awards, summary } =
    data;

  const hasContent =
    (projects?.length ?? 0) +
      (internships?.length ?? 0) +
      (education?.length ?? 0) +
      (publications?.length ?? 0) +
      (research?.length ?? 0) >
    0;

  if (!hasContent) {
    return <p className="px-4 py-8 text-center text-sm text-muted-foreground">暂无简历数据</p>;
  }

  return (
    <div className="space-y-5 px-1">
      {/* Summary */}
      {summary && (
        <p className="rounded-lg bg-muted/50 px-3 py-2 text-xs leading-relaxed text-muted-foreground italic">
          {summary}
        </p>
      )}

      {/* Internships */}
      {internships && internships.length > 0 && (
        <section>
          <SectionTitle icon={<Briefcase className="h-3.5 w-3.5" />} label="实习经历" />
          <div className="space-y-2">
            {internships.map((item, i) => {
              const name = `${item.company || ""}${item.role ? `_${item.role}` : ""}`;
              return (
                <EntityCard
                  key={i}
                  name={item.company || "未知公司"}
                  isActive={matches(name, activeEntity)}
                  cardRef={refCallback(name)}
                >
                  {item.role && <p>{item.role}</p>}
                  {item.duration && <p className="text-muted-foreground/50">{item.duration}</p>}
                  {item.responsibilities && item.responsibilities.length > 0 && (
                    <ul className="ml-3 list-disc space-y-0.5 pt-1">
                      {item.responsibilities.map((r, j) => (
                        <li key={j}>{r}</li>
                      ))}
                    </ul>
                  )}
                </EntityCard>
              );
            })}
          </div>
        </section>
      )}

      {/* Projects */}
      {projects && projects.length > 0 && (
        <section>
          <SectionTitle icon={<FolderGit2 className="h-3.5 w-3.5" />} label="项目经历" />
          <div className="space-y-2">
            {projects.map((item, i) => {
              const name = item.name || "未命名项目";
              return (
                <EntityCard
                  key={i}
                  name={name}
                  isActive={matches(name, activeEntity)}
                  cardRef={refCallback(name)}
                >
                  {item.role && <p>角色: {item.role}</p>}
                  {item.description && <p>{item.description}</p>}
                  {item.tech_stack && <TagList items={item.tech_stack} />}
                  {item.highlights && item.highlights.length > 0 && (
                    <ul className="ml-3 list-disc space-y-0.5 pt-1">
                      {item.highlights.map((h, j) => (
                        <li key={j}>{h}</li>
                      ))}
                    </ul>
                  )}
                </EntityCard>
              );
            })}
          </div>
        </section>
      )}

      {/* Education */}
      {education && education.length > 0 && (
        <section>
          <SectionTitle icon={<GraduationCap className="h-3.5 w-3.5" />} label="教育背景" />
          <div className="space-y-2">
            {education.map((item, i) => {
              const name = item.school || "未知学校";
              return (
                <EntityCard
                  key={i}
                  name={name}
                  isActive={matches(name, activeEntity)}
                  cardRef={refCallback(name)}
                >
                  {item.major && <p>{item.major} · {item.degree}</p>}
                  {(item.start_date || item.end_date) && (
                    <p className="text-muted-foreground/50">
                      {item.start_date} - {item.end_date}
                    </p>
                  )}
                </EntityCard>
              );
            })}
          </div>
        </section>
      )}

      {/* Academic — publications + research merged */}
      {((publications && publications.length > 0) || (research && research.length > 0)) && (
        <section>
          <SectionTitle icon={<FlaskConical className="h-3.5 w-3.5" />} label="学术成果" />
          <div className="space-y-2">
            {publications?.map((item, i) => {
              const name = item.title || "未命名论文";
              return (
                <EntityCard
                  key={`pub-${i}`}
                  name={name}
                  isActive={matches(name, activeEntity)}
                  cardRef={refCallback(name)}
                >
                  {item.venue && <p>{item.venue}{item.year ? ` · ${item.year}` : ""}</p>}
                  {item.description && <p>{item.description}</p>}
                  {item.role && <p>贡献: {item.role}</p>}
                </EntityCard>
              );
            })}
            {research?.map((item, i) => {
              const name = item.topic || "未命名课题";
              return (
                <EntityCard
                  key={`res-${i}`}
                  name={name}
                  isActive={matches(name, activeEntity)}
                  cardRef={refCallback(name)}
                >
                  {item.lab && <p>{item.lab}</p>}
                  {item.description && <p>{item.description}</p>}
                  {item.achievements && <TagList items={item.achievements} />}
                </EntityCard>
              );
            })}
          </div>
        </section>
      )}

      {/* Skills */}
      {skills && skills.length > 0 && (
        <section>
          <SectionTitle icon={<Wrench className="h-3.5 w-3.5" />} label="技能" />
          <TagList items={skills} />
        </section>
      )}

      {/* Awards */}
      {awards && awards.length > 0 && (
        <section>
          <SectionTitle icon={<Award className="h-3.5 w-3.5" />} label="获奖" />
          <ul className="ml-4 list-disc space-y-0.5 text-xs text-muted-foreground">
            {awards.map((a, i) => (
              <li key={i}>{a}</li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
