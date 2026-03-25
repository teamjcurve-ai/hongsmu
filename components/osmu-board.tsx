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

type OsmuFilter = "all" | "incomplete" | "complete";

function computeOsmu(item: ContentItem) {
  const blog = item.spStatus === "발행 완";
  const newsletter = item.newsletterStatus === "완료";
  const linkedin = !!item.linkedin;
  const done = [blog, newsletter, linkedin].filter(Boolean).length;
  return { blog, newsletter, linkedin, done };
}

function ChannelDot({ done }: { done: boolean }) {
  return (
    <span
      className={`inline-block h-2.5 w-2.5 rounded-full ${done ? "bg-green-400" : "bg-zinc-600"}`}
    />
  );
}

function OsmuProgress({ done }: { done: number }) {
  return (
    <div className="flex items-center gap-2">
      <span className="font-mono text-xs text-zinc-300">{done}/3</span>
      <div className="flex h-1.5 w-16 overflow-hidden rounded-full bg-zinc-800">
        <div
          className={`h-full rounded-full transition-all ${
            done === 3
              ? "bg-green-400"
              : done >= 2
                ? "bg-yellow-400"
                : done === 1
                  ? "bg-orange-400"
                  : "bg-zinc-700"
          }`}
          style={{ width: `${(done / 3) * 100}%` }}
        />
      </div>
    </div>
  );
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

export function OsmuBoard({ items: initialItems }: { items: ContentItem[] }) {
  const [items, setItems] = useState(initialItems);
  const [osmuFilter, setOsmuFilter] = useState<OsmuFilter>("all");
  const [authorFilter, setAuthorFilter] = useState<string>("all");
  const [refreshing, setRefreshing] = useState(false);

  const authors = Array.from(
    new Set(
      items.flatMap((i) =>
        i.authors.length > 0 ? i.authors.map((a) => a.name) : ["(미배정)"]
      )
    )
  ).sort();

  // 채널별 집계
  const blogDone = items.filter((i) => i.spStatus === "발행 완").length;
  const blogInProgress = items.filter((i) => i.spStatus === "발행 요청").length;
  const blogWaiting = items.filter((i) => i.spStatus === "발행 전").length;
  const nlDone = items.filter((i) => i.newsletterStatus === "완료").length;
  const nlInProgress = items.filter((i) => i.newsletterStatus === "진행 중").length;
  const nlWaiting = items.filter((i) => i.newsletterStatus === "시작 전").length;
  const liDone = items.filter((i) => !!i.linkedin).length;
  const liWaiting = items.filter((i) => !i.linkedin).length;

  const allOsmu = items.map((i) => computeOsmu(i));
  const osmuComplete = allOsmu.filter((o) => o.done === 3).length;
  const osmuRate =
    items.length > 0 ? Math.round((osmuComplete / items.length) * 100) : 0;

  const filtered = items.filter((item) => {
    const osmu = computeOsmu(item);
    if (osmuFilter === "incomplete" && osmu.done === 3) return false;
    if (osmuFilter === "complete" && osmu.done < 3) return false;
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
      {/* 채널별 요약 카드 */}
      <div className="mb-6 grid gap-4 sm:grid-cols-4">
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-4">
          <div className="mb-2 text-xs font-medium text-zinc-500">블로그 (SP)</div>
          <div className="flex items-baseline gap-3">
            <span className="text-2xl font-semibold text-green-400">{blogDone}</span>
            <span className="text-xs text-zinc-500">
              요청 <span className="font-mono text-yellow-400">{blogInProgress}</span>
              {" / "}
              대기 <span className="font-mono text-zinc-400">{blogWaiting}</span>
            </span>
          </div>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-4">
          <div className="mb-2 text-xs font-medium text-zinc-500">뉴스레터</div>
          <div className="flex items-baseline gap-3">
            <span className="text-2xl font-semibold text-green-400">{nlDone}</span>
            <span className="text-xs text-zinc-500">
              진행 <span className="font-mono text-blue-400">{nlInProgress}</span>
              {" / "}
              대기 <span className="font-mono text-zinc-400">{nlWaiting}</span>
            </span>
          </div>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-4">
          <div className="mb-2 text-xs font-medium text-zinc-500">링크드인</div>
          <div className="flex items-baseline gap-3">
            <span className="text-2xl font-semibold text-blue-400">{liDone}</span>
            <span className="text-xs text-zinc-500">
              미등록 <span className="font-mono text-zinc-400">{liWaiting}</span>
            </span>
          </div>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-4">
          <div className="mb-2 text-xs font-medium text-zinc-500">OSMU 달성률</div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-semibold text-zinc-100">{osmuRate}%</span>
            <span className="text-xs text-zinc-500">
              <span className="font-mono text-green-400">{osmuComplete}</span>/{items.length}건 완료
            </span>
          </div>
        </div>
      </div>

      {/* 필터 */}
      <div className="mb-4 flex items-center gap-3">
        <div className="flex rounded-lg border border-zinc-700 overflow-hidden">
          {(
            [
              { key: "all", label: "전체" },
              { key: "incomplete", label: "미완료 있음" },
              { key: "complete", label: "전체 완료" },
            ] as const
          ).map((tab) => (
            <button
              key={tab.key}
              onClick={() => setOsmuFilter(tab.key)}
              className={`px-3 py-1.5 text-xs transition-colors ${
                osmuFilter === tab.key
                  ? "bg-zinc-700 text-zinc-100"
                  : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
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
        <span className="text-xs text-zinc-500 font-mono">{filtered.length}건</span>
      </div>

      {/* 테이블 */}
      <div className="overflow-x-auto rounded-xl border border-zinc-800">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-800 bg-zinc-900/50 text-left text-xs text-zinc-500">
              <th className="px-4 py-3 font-medium">제목</th>
              <th className="px-4 py-3 font-medium">작성자</th>
              <th className="px-4 py-3 font-medium text-center">블로그</th>
              <th className="px-4 py-3 font-medium text-center">뉴스레터</th>
              <th className="px-4 py-3 font-medium text-center">링크드인</th>
              <th className="px-4 py-3 font-medium">OSMU 달성</th>
              <th className="px-4 py-3 font-medium">마감</th>
              <th className="px-4 py-3 font-medium">D-day</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((item) => {
              const osmu = computeOsmu(item);
              return (
                <tr
                  key={item.id}
                  className="border-b border-zinc-800/50 transition-colors hover:bg-zinc-900/30"
                >
                  <td className="px-4 py-3 max-w-[220px]">
                    <a
                      href={`/dashboard/content/${item.id}`}
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
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <ChannelDot done={osmu.blog} />
                      <select
                        value={item.spStatus}
                        onChange={(e) =>
                          handleStatusChange(
                            item.id,
                            "SP 발행 상태",
                            e.target.value,
                            "spStatus"
                          )
                        }
                        className={`cursor-pointer rounded-md border-0 px-2 py-0.5 text-xs font-medium outline-none ${spColors[item.spStatus]}`}
                      >
                        {SP_OPTIONS.map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <ChannelDot done={osmu.newsletter} />
                      <select
                        value={item.newsletterStatus}
                        onChange={(e) =>
                          handleStatusChange(
                            item.id,
                            "뉴스레터 발행 여부",
                            e.target.value,
                            "newsletterStatus"
                          )
                        }
                        className={`cursor-pointer rounded-md border-0 px-2 py-0.5 text-xs font-medium outline-none ${nlColors[item.newsletterStatus]}`}
                      >
                        {NL_OPTIONS.map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <ChannelDot done={osmu.linkedin} />
                      <span
                        className={`rounded-md px-2 py-0.5 text-xs font-medium ${
                          item.linkedin
                            ? "bg-blue-900/50 text-blue-300"
                            : "bg-zinc-700 text-zinc-400"
                        }`}
                      >
                        {item.linkedin ? "완료" : "미등록"}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <OsmuProgress done={osmu.done} />
                  </td>
                  <td className="px-4 py-3 text-xs text-zinc-500 font-mono whitespace-nowrap">
                    {item.deadline || "-"}
                  </td>
                  <td className="px-4 py-3">
                    <DeadlineBadge deadline={item.deadline} />
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td
                  colSpan={8}
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
