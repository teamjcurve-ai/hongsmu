"use client";

import { useState, useCallback } from "react";
import type { ContentItem } from "@/lib/types";
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

export function PipelineTable({
  items: initialItems,
}: {
  items: ContentItem[];
}) {
  const [items, setItems] = useState(initialItems);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [authorFilter, setAuthorFilter] = useState<string>("all");
  const [refreshing, setRefreshing] = useState(false);

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
        // 실패 시 새로고침으로 복구
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
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="ml-auto rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-sm text-zinc-400 transition-colors hover:bg-zinc-700 hover:text-zinc-200 disabled:opacity-50"
        >
          {refreshing ? "..." : "새로고침"}
        </button>
        <span className="text-xs text-zinc-500 font-mono">
          {filtered.length}건
        </span>
      </div>

      <div className="overflow-x-auto rounded-xl border border-zinc-800">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-800 bg-zinc-900/50 text-left text-xs text-zinc-500">
              <th className="px-4 py-3 font-medium">제목</th>
              <th className="px-4 py-3 font-medium">작성자</th>
              <th className="px-4 py-3 font-medium">블로그</th>
              <th className="px-4 py-3 font-medium">뉴스레터</th>
              <th className="px-4 py-3 font-medium">링크드인</th>
              <th className="px-4 py-3 font-medium">Step2</th>
              <th className="px-4 py-3 font-medium">마감</th>
              <th className="px-4 py-3 font-medium">D-day</th>
              <th className="px-4 py-3 font-medium">카테고리</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((item) => (
              <tr
                key={item.id}
                className="border-b border-zinc-800/50 transition-colors hover:bg-zinc-900/30"
              >
                <td className="px-4 py-3 max-w-[240px]">
                  <a
                    href={item.notionUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-zinc-200 hover:text-zinc-50 hover:underline truncate block"
                    title={item.title}
                  >
                    {item.title}
                  </a>
                </td>
                <td className="px-4 py-3 text-zinc-400 text-xs">
                  {item.authors.length > 0
                    ? item.authors.map((a) => a.name).join(", ")
                    : "-"}
                </td>
                <td className="px-4 py-3">
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
                </td>
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
                <td className="px-4 py-3 text-xs text-zinc-500 font-mono whitespace-nowrap">
                  {item.deadline || "-"}
                </td>
                <td className="px-4 py-3">
                  <DeadlineBadge deadline={item.deadline} />
                </td>
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
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td
                  colSpan={9}
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
