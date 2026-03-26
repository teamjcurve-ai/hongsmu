"use client";

import { useState } from "react";
import type { CrewSummary, AxProject } from "@/lib/sheets";

const stageColors: Record<string, string> = {
  "기획": "bg-zinc-700 text-zinc-300",
  "제작중": "bg-yellow-900/80 text-yellow-300",
  "적용": "bg-green-900/80 text-green-300",
  "개선": "bg-blue-900/80 text-blue-300",
  "적용/개선": "bg-teal-900/80 text-teal-300",
};

function StageBadge({ stage }: { stage: string }) {
  const normalized = normalizeStageDisplay(stage);
  const color = stageColors[normalized] || "bg-zinc-700 text-zinc-300";
  return (
    <span className={`inline-flex rounded-md px-2 py-0.5 text-xs font-medium ${color}`}>
      {stage}
    </span>
  );
}

function normalizeStageDisplay(stage: string): string {
  const s = stage.replace(/\s/g, "").toLowerCase();
  if (s.includes("기획")) return "기획";
  if (s.includes("제작")) return "제작중";
  if (s.includes("적용") && s.includes("개선")) return "적용/개선";
  if (s.includes("개선")) return "개선";
  if (s.includes("적용")) return "적용";
  return stage;
}

function CrewCard({
  crew,
  selected,
  onClick,
}: {
  crew: CrewSummary;
  selected: boolean;
  onClick: () => void;
}) {
  const applied = (crew.byStage["적용"] || 0) + (crew.byStage["적용/개선"] || 0);
  const improving = crew.byStage["개선"] || 0;
  const building = crew.byStage["제작중"] || 0;
  const planning = crew.byStage["기획"] || 0;

  return (
    <button
      onClick={onClick}
      className={`w-full rounded-xl border p-4 text-left transition-all ${
        selected
          ? "border-indigo-500/50 bg-indigo-950/20"
          : "border-zinc-800 bg-zinc-900/30 hover:border-zinc-700 hover:bg-zinc-900/50"
      }`}
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium text-zinc-200">{crew.name}</span>
        <span className="text-xl font-semibold text-zinc-100">
          {crew.totalProjects}
          <span className="ml-0.5 text-xs font-normal text-zinc-500">건</span>
        </span>
      </div>
      <div className="flex gap-2 text-xs">
        {applied > 0 && (
          <span className="rounded bg-green-900/50 px-1.5 py-0.5 text-green-400">
            적용 {applied}
          </span>
        )}
        {improving > 0 && (
          <span className="rounded bg-blue-900/50 px-1.5 py-0.5 text-blue-400">
            개선 {improving}
          </span>
        )}
        {building > 0 && (
          <span className="rounded bg-yellow-900/50 px-1.5 py-0.5 text-yellow-400">
            제작중 {building}
          </span>
        )}
        {planning > 0 && (
          <span className="rounded bg-zinc-700/50 px-1.5 py-0.5 text-zinc-400">
            기획 {planning}
          </span>
        )}
      </div>
    </button>
  );
}

function ProjectDetail({ project }: { project: AxProject }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900/20">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-zinc-900/40 transition-colors"
      >
        <span className="font-mono text-xs text-zinc-600 w-6">
          {project.no}
        </span>
        <span className="flex-1 text-sm text-zinc-200 whitespace-pre-line">
          {project.name}
        </span>
        <StageBadge stage={project.stage} />
        <span className="text-xs text-zinc-500">
          {open ? "▲" : "▼"}
        </span>
      </button>
      {open && (
        <div className="border-t border-zinc-800 px-4 py-3 space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="소속" value={project.category} />
            <Field label="유형" value={project.type} />
            <Field label="활용 모델/툴" value={project.tools} />
            <Field label="관리자" value={project.manager} />
          </div>
          {project.problem && (
            <Field label="문제인식" value={project.problem} full />
          )}
          {project.solution && (
            <Field label="해결방안" value={project.solution} full />
          )}
          {project.impact && (
            <Field label="AX 임팩트" value={project.impact} full />
          )}
          {project.note && (
            <Field label="비고" value={project.note} full />
          )}
        </div>
      )}
    </div>
  );
}

function Field({
  label,
  value,
  full,
}: {
  label: string;
  value: string;
  full?: boolean;
}) {
  if (!value) return null;
  return (
    <div className={full ? "sm:col-span-2" : ""}>
      <div className="text-xs font-medium text-zinc-500 mb-1">{label}</div>
      <div className="text-sm text-zinc-300 whitespace-pre-line">{value}</div>
    </div>
  );
}

export function AxDashboard({ data }: { data: CrewSummary[] }) {
  const [selectedCrew, setSelectedCrew] = useState<string | null>(null);
  const [stageFilter, setStageFilter] = useState<string>("all");

  const totalProjects = data.reduce((sum, c) => sum + c.totalProjects, 0);
  const allProjects = data.flatMap((c) => c.projects);

  const stageCount = {
    applied: allProjects.filter((p) => {
      const s = normalizeStageDisplay(p.stage);
      return s === "적용" || s === "적용/개선";
    }).length,
    improving: allProjects.filter(
      (p) => normalizeStageDisplay(p.stage) === "개선"
    ).length,
    building: allProjects.filter(
      (p) => normalizeStageDisplay(p.stage) === "제작중"
    ).length,
    planning: allProjects.filter(
      (p) => normalizeStageDisplay(p.stage) === "기획"
    ).length,
  };

  const selectedData = selectedCrew
    ? data.find((c) => c.name === selectedCrew)
    : null;

  const displayProjects = selectedData
    ? selectedData.projects
    : allProjects;

  const filteredProjects =
    stageFilter === "all"
      ? displayProjects
      : displayProjects.filter((p) => {
          const s = normalizeStageDisplay(p.stage);
          if (stageFilter === "적용") return s === "적용" || s === "적용/개선";
          return s === stageFilter;
        });

  return (
    <div>
      {/* 전체 요약 */}
      <div className="mb-6 grid gap-4 sm:grid-cols-5">
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-4">
          <div className="mb-1 text-xs font-medium text-zinc-500">
            전체 프로젝트
          </div>
          <div className="text-2xl font-semibold text-zinc-100">
            {totalProjects}
            <span className="ml-1 text-sm font-normal text-zinc-500">건</span>
          </div>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-4">
          <div className="mb-1 text-xs font-medium text-zinc-500">적용</div>
          <div className="text-2xl font-semibold text-green-400">
            {stageCount.applied}
          </div>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-4">
          <div className="mb-1 text-xs font-medium text-zinc-500">개선</div>
          <div className="text-2xl font-semibold text-blue-400">
            {stageCount.improving}
          </div>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-4">
          <div className="mb-1 text-xs font-medium text-zinc-500">제작중</div>
          <div className="text-2xl font-semibold text-yellow-400">
            {stageCount.building}
          </div>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-4">
          <div className="mb-1 text-xs font-medium text-zinc-500">기획</div>
          <div className="text-2xl font-semibold text-zinc-400">
            {stageCount.planning}
          </div>
        </div>
      </div>

      {/* 크루원 카드 그리드 */}
      <div className="mb-6">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-medium text-zinc-400">크루원</h2>
          {selectedCrew && (
            <button
              onClick={() => setSelectedCrew(null)}
              className="text-xs text-zinc-500 hover:text-zinc-300"
            >
              전체 보기
            </button>
          )}
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {data.map((crew) => (
            <CrewCard
              key={crew.name}
              crew={crew}
              selected={selectedCrew === crew.name}
              onClick={() =>
                setSelectedCrew(
                  selectedCrew === crew.name ? null : crew.name
                )
              }
            />
          ))}
        </div>
      </div>

      {/* 프로젝트 목록 */}
      <div>
        <div className="mb-3 flex items-center gap-3">
          <h2 className="text-sm font-medium text-zinc-400">
            {selectedCrew ? `${selectedCrew}의 프로젝트` : "전체 프로젝트"}
          </h2>
          <div className="flex rounded-lg border border-zinc-700 overflow-hidden">
            {(
              [
                { key: "all", label: "전체" },
                { key: "적용", label: "적용" },
                { key: "개선", label: "개선" },
                { key: "제작중", label: "제작중" },
                { key: "기획", label: "기획" },
              ] as const
            ).map((tab) => (
              <button
                key={tab.key}
                onClick={() => setStageFilter(tab.key)}
                className={`px-3 py-1.5 text-xs transition-colors ${
                  stageFilter === tab.key
                    ? "bg-zinc-700 text-zinc-100"
                    : "text-zinc-500 hover:text-zinc-300"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <span className="text-xs text-zinc-500 font-mono ml-auto">
            {filteredProjects.length}건
          </span>
        </div>
        <div className="space-y-2">
          {filteredProjects.map((project) => (
            <ProjectDetail
              key={`${project.crew}-${project.no}`}
              project={project}
            />
          ))}
          {filteredProjects.length === 0 && (
            <div className="rounded-xl border border-zinc-800 p-12 text-center text-sm text-zinc-600">
              해당하는 프로젝트가 없습니다.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
