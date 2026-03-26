"use client";

import { useState, useCallback, useEffect } from "react";
import type { ContentItem } from "@/lib/types";
import type { ReviewResult } from "@/lib/review";
import { DeadlineBadge } from "./deadline-badge";

const SP_OPTIONS = ["발행 전", "발행 요청", "발행 완"] as const;
const NL_OPTIONS = ["시작 전", "진행 중", "완료"] as const;

const spColors: Record<string, string> = {
  "발행 전": "bg-zinc-700 text-zinc-300",
  "발행 요청": "bg-yellow-900/80 text-yellow-300",
  "발행 완": "bg-green-900/80 text-green-300",
};

const nlColors: Record<string, string> = {
  "시작 전": "bg-zinc-700 text-zinc-300",
  "진행 중": "bg-blue-900/80 text-blue-300",
  "완료": "bg-green-900/80 text-green-300",
};

type ColumnKey =
  | "title"
  | "author"
  | "blog"
  | "newsletter"
  | "linkedin"
  | "step2"
  | "review"
  | "deadline"
  | "dday"
  | "category";

const ALL_COLUMNS: { key: ColumnKey; label: string; default: boolean }[] = [
  { key: "title", label: "제목", default: true },
  { key: "author", label: "작성자", default: true },
  { key: "blog", label: "블로그", default: true },
  { key: "newsletter", label: "뉴스레터", default: true },
  { key: "linkedin", label: "링크드인", default: false },
  { key: "step2", label: "Step2", default: false },
  { key: "review", label: "검수", default: false },
  { key: "deadline", label: "마감", default: true },
  { key: "dday", label: "D-day", default: true },
  { key: "category", label: "카테고리", default: false },
];

const STORAGE_KEY = "hongsmu-columns";

function loadColumns(): Set<ColumnKey> {
  if (typeof window === "undefined") {
    return new Set(ALL_COLUMNS.filter((c) => c.default).map((c) => c.key));
  }
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return new Set(JSON.parse(saved) as ColumnKey[]);
  } catch {
    // ignore
  }
  return new Set(ALL_COLUMNS.filter((c) => c.default).map((c) => c.key));
}

async function updateNotion(
  pageId: string,
  field: string,
  value: string | boolean,
  type: string
) {
  const res = await fetch("/api/notion/update", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ pageId, field, value, type }),
  });
  if (!res.ok) throw new Error("Update failed");
}

function InlineSelect({
  value,
  options,
  colors,
  onChange,
}: {
  value: string;
  options: readonly string[];
  colors: Record<string, string>;
  onChange: (v: string) => void;
}) {
  const [saving, setSaving] = useState(false);

  return (
    <select
      value={value}
      disabled={saving}
      onChange={async (e) => {
        setSaving(true);
        onChange(e.target.value);
        setSaving(false);
      }}
      className={`cursor-pointer rounded-md border-0 px-2 py-0.5 text-xs font-medium outline-none ${colors[value] || "bg-zinc-700 text-zinc-300"} ${saving ? "opacity-50" : ""}`}
    >
      {options.map((opt) => (
        <option key={opt} value={opt}>
          {opt}
        </option>
      ))}
    </select>
  );
}

function ColumnToggle({
  visible,
  onToggle,
}: {
  visible: Set<ColumnKey>;
  onToggle: (key: ColumnKey) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-sm text-zinc-400 transition-colors hover:bg-zinc-700 hover:text-zinc-200"
      >
        열 설정
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full z-20 mt-1 w-40 rounded-lg border border-zinc-700 bg-zinc-800 p-2 shadow-xl">
            {ALL_COLUMNS.filter((c) => c.key !== "title").map((col) => (
              <label
                key={col.key}
                className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-xs text-zinc-300 hover:bg-zinc-700"
              >
                <input
                  type="checkbox"
                  checked={visible.has(col.key)}
                  onChange={() => onToggle(col.key)}
                  className="h-3.5 w-3.5 rounded border-zinc-600 bg-zinc-900 accent-green-500"
                />
                {col.label}
              </label>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function BatchBar({
  count,
  onBatchSp,
  onBatchNl,
  onClear,
}: {
  count: number;
  onBatchSp: (v: string) => void;
  onBatchNl: (v: string) => void;
  onClear: () => void;
}) {
  return (
    <div className="mb-3 flex items-center gap-3 rounded-lg border border-indigo-800/50 bg-indigo-950/30 px-4 py-2">
      <span className="text-sm font-medium text-indigo-300">
        {count}건 선택
      </span>
      <div className="flex items-center gap-2">
        <span className="text-xs text-zinc-500">SP:</span>
        <select
          defaultValue=""
          onChange={(e) => {
            if (e.target.value) onBatchSp(e.target.value);
            e.target.value = "";
          }}
          className="rounded-md border border-zinc-700 bg-zinc-800 px-2 py-1 text-xs text-zinc-300 outline-none"
        >
          <option value="" disabled>
            변경
          </option>
          {SP_OPTIONS.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-xs text-zinc-500">뉴스레터:</span>
        <select
          defaultValue=""
          onChange={(e) => {
            if (e.target.value) onBatchNl(e.target.value);
            e.target.value = "";
          }}
          className="rounded-md border border-zinc-700 bg-zinc-800 px-2 py-1 text-xs text-zinc-300 outline-none"
        >
          <option value="" disabled>
            변경
          </option>
          {NL_OPTIONS.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      </div>
      <button
        onClick={onClear}
        className="ml-auto text-xs text-zinc-500 hover:text-zinc-300"
      >
        선택 해제
      </button>
    </div>
  );
}

function ReviewBadge({
  result,
  onReview,
  reviewing,
}: {
  result: ReviewResult | null;
  onReview: () => void;
  reviewing: boolean;
}) {
  if (reviewing) {
    return <span className="text-xs text-zinc-500">검수 중...</span>;
  }

  if (!result) {
    return (
      <button
        onClick={onReview}
        className="rounded-md bg-zinc-800 px-2 py-0.5 text-xs text-zinc-400 transition-colors hover:bg-zinc-700 hover:text-zinc-200"
      >
        검수
      </button>
    );
  }

  const color =
    result.score >= 80
      ? "text-green-400"
      : result.score >= 60
        ? "text-yellow-400"
        : "text-red-400";

  const errorCount = result.issues.filter((i) => i.type === "error").length;
  const warnCount = result.issues.filter((i) => i.type === "warning").length;

  return (
    <button
      onClick={onReview}
      className="group flex items-center gap-1.5"
      title={result.issues.map((i) => `[${i.type}] ${i.message}`).join("\n")}
    >
      <span className={`font-mono text-xs font-medium ${color}`}>
        {result.score}
      </span>
      {(errorCount > 0 || warnCount > 0) && (
        <span className="text-xs text-zinc-500">
          {errorCount > 0 && (
            <span className="text-red-400">{errorCount}</span>
          )}
          {errorCount > 0 && warnCount > 0 && "/"}
          {warnCount > 0 && (
            <span className="text-yellow-400">{warnCount}</span>
          )}
        </span>
      )}
    </button>
  );
}

function ReviewDetail({ result }: { result: ReviewResult }) {
  return (
    <tr>
      <td colSpan={12} className="px-4 py-3 bg-zinc-900/50">
        <div className="flex gap-6 mb-3 text-xs text-zinc-500">
          <span>
            글자 수:{" "}
            <span className={`font-mono ${result.charCount < 1000 ? "text-yellow-400" : "text-zinc-300"}`}>
              {result.charCount.toLocaleString()}
            </span>
          </span>
          <span>
            H2:{" "}
            <span className={`font-mono ${result.headingCount < 3 ? "text-yellow-400" : "text-zinc-300"}`}>
              {result.headingCount}개
            </span>
          </span>
          <span>
            이미지: <span className="font-mono text-zinc-300">{result.imageCount}장</span>
          </span>
        </div>

        {result.autoFixed.length > 0 && (
          <div className="mb-3">
            <p className="text-xs font-medium text-green-400 mb-1">자동 수정 완료</p>
            <div className="space-y-1">
              {result.autoFixed.map((fix, i) => (
                <div key={i} className="text-xs text-zinc-400">
                  <span className="rounded bg-green-900/30 px-1 py-0.5 text-green-400">수정</span>{" "}
                  {fix.description}: <span className="line-through text-zinc-600">{fix.before}</span> → <span className="text-zinc-200">{fix.after}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {result.humanRequired.length > 0 && (
          <div className="mb-3">
            <p className="text-xs font-medium text-yellow-400 mb-1">담당자 수정 필요 (DM 발송됨)</p>
            <div className="space-y-1">
              {result.humanRequired.map((item, i) => (
                <div key={i} className="text-xs text-zinc-400">
                  <span className="rounded bg-yellow-900/30 px-1 py-0.5 text-yellow-400">수동</span>{" "}
                  {item}
                </div>
              ))}
            </div>
          </div>
        )}

        {result.issues.length > 0 && (
          <div>
            <p className="text-xs font-medium text-zinc-500 mb-1">전체 이슈</p>
            <div className="space-y-1">
              {result.issues.map((issue, i) => (
                <div key={i} className="flex items-start gap-2 text-xs">
                  <span
                    className={`rounded px-1 py-0.5 font-medium ${
                      issue.type === "error"
                        ? "bg-red-900/50 text-red-400"
                        : issue.type === "warning"
                          ? "bg-yellow-900/50 text-yellow-400"
                          : "bg-blue-900/50 text-blue-400"
                    }`}
                  >
                    {issue.type === "error" ? "오류" : issue.type === "warning" ? "경고" : "참고"}
                  </span>
                  <span className="text-zinc-400">{issue.message}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {result.issues.length === 0 && result.autoFixed.length === 0 && (
          <p className="text-xs text-green-400">검수 통과 - 이슈 없음</p>
        )}
      </td>
    </tr>
  );
}

export function PipelineTable({
  items: initialItems,
}: {
  items: ContentItem[];
}) {
  const [items, setItems] = useState(initialItems);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [authorFilter, setAuthorFilter] = useState<string>("all");
  const [refreshing, setRefreshing] = useState(false);
  const [reviews, setReviews] = useState<Map<string, ReviewResult>>(new Map());
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [visibleCols, setVisibleCols] = useState<Set<ColumnKey>>(loadColumns);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [batchLoading, setBatchLoading] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(visibleCols)));
    } catch {
      // ignore
    }
  }, [visibleCols]);

  const toggleColumn = (key: ColumnKey) => {
    setVisibleCols((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const show = (key: ColumnKey) => visibleCols.has(key);

  const authors = Array.from(
    new Set(
      items.flatMap((i) =>
        i.authors.length > 0 ? i.authors.map((a) => a.name) : ["(미배정)"]
      )
    )
  ).sort();

  const filtered = items.filter((item) => {
    if (statusFilter !== "all" && item.spStatus !== statusFilter) return false;
    if (authorFilter !== "all") {
      const itemAuthors =
        item.authors.length > 0
          ? item.authors.map((a) => a.name)
          : ["(미배정)"];
      if (!itemAuthors.includes(authorFilter)) return false;
    }
    return true;
  });

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selected.size === filtered.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filtered.map((i) => i.id)));
    }
  };

  const handleStatusChange = useCallback(
    async (
      pageId: string,
      field: string,
      value: string,
      itemField: "spStatus" | "newsletterStatus"
    ) => {
      setItems((prev) =>
        prev.map((item) =>
          item.id === pageId
            ? { ...item, [itemField]: value as ContentItem[typeof itemField] }
            : item
        )
      );
      try {
        await updateNotion(pageId, field, value, "status");
      } catch {
        handleRefresh();
      }
    },
    []
  );

  const handleCheckboxChange = useCallback(
    async (pageId: string, field: string, value: boolean) => {
      setItems((prev) =>
        prev.map((item) =>
          item.id === pageId ? { ...item, step2Done: value } : item
        )
      );
      try {
        await updateNotion(pageId, field, value, "checkbox");
      } catch {
        handleRefresh();
      }
    },
    []
  );

  const handleBatchStatus = async (
    field: string,
    value: string,
    itemField: "spStatus" | "newsletterStatus"
  ) => {
    if (selected.size === 0) return;
    setBatchLoading(true);
    const ids = Array.from(selected);
    setItems((prev) =>
      prev.map((item) =>
        ids.includes(item.id)
          ? { ...item, [itemField]: value as ContentItem[typeof itemField] }
          : item
      )
    );
    const results = await Promise.allSettled(
      ids.map((id) => updateNotion(id, field, value, "status"))
    );
    const failed = results.filter((r) => r.status === "rejected").length;
    if (failed > 0) handleRefresh();
    setSelected(new Set());
    setBatchLoading(false);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const res = await fetch("/api/notion/pages");
      const data = await res.json();
      setItems(data);
    } catch {
      // ignore
    }
    setRefreshing(false);
  };

  const handleReview = async (item: ContentItem) => {
    if (reviews.has(item.id)) {
      setExpandedId(expandedId === item.id ? null : item.id);
      return;
    }

    setReviewingId(item.id);
    try {
      const res = await fetch("/api/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pageId: item.id,
          title: item.title,
          authors: item.authors,
          notionUrl: item.notionUrl,
        }),
      });
      const result = await res.json();
      setReviews((prev) => new Map(prev).set(item.id, result));
      setExpandedId(item.id);
    } catch {
      // ignore
    }
    setReviewingId(null);
  };

  return (
    <div>
      <div className="mb-4 flex items-center gap-3">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-sm text-zinc-300 outline-none"
        >
          <option value="all">모든 상태</option>
          {SP_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <select
          value={authorFilter}
          onChange={(e) => setAuthorFilter(e.target.value)}
          className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-sm text-zinc-300 outline-none"
        >
          <option value="all">모든 작성자</option>
          {authors.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>
        <div className="ml-auto flex items-center gap-2">
          <ColumnToggle visible={visibleCols} onToggle={toggleColumn} />
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-sm text-zinc-400 transition-colors hover:bg-zinc-700 hover:text-zinc-200 disabled:opacity-50"
          >
            {refreshing ? "..." : "새로고침"}
          </button>
          <span className="text-xs text-zinc-500 font-mono">
            {filtered.length}건
          </span>
        </div>
      </div>

      {selected.size > 0 && (
        <BatchBar
          count={selected.size}
          onBatchSp={(v) =>
            handleBatchStatus("SP 발행 상태", v, "spStatus")
          }
          onBatchNl={(v) =>
            handleBatchStatus("뉴스레터 발행 여부", v, "newsletterStatus")
          }
          onClear={() => setSelected(new Set())}
        />
      )}

      <div className={`overflow-x-auto rounded-xl border border-zinc-800 ${batchLoading ? "opacity-50 pointer-events-none" : ""}`}>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-800 bg-zinc-900/50 text-left text-xs text-zinc-500">
              <th className="px-3 py-3 w-8">
                <input
                  type="checkbox"
                  checked={filtered.length > 0 && selected.size === filtered.length}
                  onChange={toggleSelectAll}
                  className="h-3.5 w-3.5 rounded border-zinc-600 bg-zinc-800 accent-indigo-500"
                />
              </th>
              {show("title") && <th className="px-4 py-3 font-medium">제목</th>}
              {show("author") && <th className="px-4 py-3 font-medium">작성자</th>}
              {show("blog") && <th className="px-4 py-3 font-medium">블로그</th>}
              {show("newsletter") && <th className="px-4 py-3 font-medium">뉴스레터</th>}
              {show("linkedin") && <th className="px-4 py-3 font-medium">링크드인</th>}
              {show("step2") && <th className="px-4 py-3 font-medium">Step2</th>}
              {show("review") && <th className="px-4 py-3 font-medium">검수</th>}
              {show("deadline") && <th className="px-4 py-3 font-medium">마감</th>}
              {show("dday") && <th className="px-4 py-3 font-medium">D-day</th>}
              {show("category") && <th className="px-4 py-3 font-medium">카테고리</th>}
            </tr>
          </thead>
          <tbody>
            {filtered.map((item) => (
              <>
                <tr
                  key={item.id}
                  className={`border-b border-zinc-800/50 transition-colors hover:bg-zinc-900/30 ${selected.has(item.id) ? "bg-indigo-950/20" : ""}`}
                >
                  <td className="px-3 py-3">
                    <input
                      type="checkbox"
                      checked={selected.has(item.id)}
                      onChange={() => toggleSelect(item.id)}
                      className="h-3.5 w-3.5 rounded border-zinc-600 bg-zinc-800 accent-indigo-500"
                    />
                  </td>
                  {show("title") && (
                    <td className="px-4 py-3 max-w-[220px]">
                      <a
                        href={`/dashboard/content/${item.id}`}
                        className="text-zinc-200 hover:text-zinc-50 hover:underline truncate block"
                        title={item.title}
                      >
                        {item.title}
                      </a>
                    </td>
                  )}
                  {show("author") && (
                    <td className="px-4 py-3 text-zinc-400 text-xs">
                      {item.authors.length > 0
                        ? item.authors.map((a) => a.name).join(", ")
                        : "-"}
                    </td>
                  )}
                  {show("blog") && (
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <InlineSelect
                          value={item.spStatus}
                          options={SP_OPTIONS}
                          colors={spColors}
                          onChange={(v) =>
                            handleStatusChange(
                              item.id,
                              "SP 발행 상태",
                              v,
                              "spStatus"
                            )
                          }
                        />
                        {item.spLink && (
                          <a
                            href={item.spLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-zinc-500 hover:text-zinc-200 transition-colors"
                            title={item.spLink}
                          >
                            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                          </a>
                        )}
                      </div>
                    </td>
                  )}
                  {show("newsletter") && (
                    <td className="px-4 py-3">
                      <InlineSelect
                        value={item.newsletterStatus}
                        options={NL_OPTIONS}
                        colors={nlColors}
                        onChange={(v) =>
                          handleStatusChange(
                            item.id,
                            "뉴스레터 발행 여부",
                            v,
                            "newsletterStatus"
                          )
                        }
                      />
                    </td>
                  )}
                  {show("linkedin") && (
                    <td className="px-4 py-3">
                      {item.linkedin ? (
                        <span className="rounded-md bg-blue-900/50 px-2 py-0.5 text-xs text-blue-300">
                          완료
                        </span>
                      ) : (
                        <span className="rounded-md bg-zinc-700 px-2 py-0.5 text-xs text-zinc-400">
                          미등록
                        </span>
                      )}
                    </td>
                  )}
                  {show("step2") && (
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={item.step2Done}
                        onChange={(e) =>
                          handleCheckboxChange(
                            item.id,
                            "Step2 진행 여부",
                            e.target.checked
                          )
                        }
                        className="h-4 w-4 rounded border-zinc-600 bg-zinc-800 accent-green-500"
                      />
                    </td>
                  )}
                  {show("review") && (
                    <td className="px-4 py-3">
                      <ReviewBadge
                        result={reviews.get(item.id) || null}
                        onReview={() => handleReview(item)}
                        reviewing={reviewingId === item.id}
                      />
                    </td>
                  )}
                  {show("deadline") && (
                    <td className="px-4 py-3 text-xs text-zinc-500 font-mono whitespace-nowrap">
                      {item.deadline || "-"}
                    </td>
                  )}
                  {show("dday") && (
                    <td className="px-4 py-3">
                      <DeadlineBadge deadline={item.deadline} />
                    </td>
                  )}
                  {show("category") && (
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {item.category.map((c) => (
                          <span
                            key={c}
                            className="rounded bg-zinc-800 px-1.5 py-0.5 text-xs text-zinc-400"
                          >
                            {c}
                          </span>
                        ))}
                      </div>
                    </td>
                  )}
                </tr>
                {expandedId === item.id && reviews.has(item.id) && (
                  <ReviewDetail
                    key={`review-${item.id}`}
                    result={reviews.get(item.id)!}
                  />
                )}
              </>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td
                  colSpan={12}
                  className="px-4 py-12 text-center text-zinc-600"
                >
                  해당하는 콘텐츠가 없습니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
