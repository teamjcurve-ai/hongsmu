"use client";

import { useState } from "react";
import type { ContentItem } from "@/lib/types";
import { SpStatusBadge, NlStatusBadge } from "./status-badge";
import { DeadlineBadge } from "./deadline-badge";

export function PipelineTable({ items }: { items: ContentItem[] }) {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [authorFilter, setAuthorFilter] = useState<string>("all");

  const authors = Array.from(
    new Set(items.map((i) => i.author || "(미배정)"))
  ).sort();

  const filtered = items.filter((item) => {
    if (statusFilter !== "all" && item.spStatus !== statusFilter) return false;
    if (
      authorFilter !== "all" &&
      (item.author || "(미배정)") !== authorFilter
    )
      return false;
    return true;
  });

  return (
    <div>
      <div className="mb-4 flex gap-3">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-sm text-zinc-300 outline-none"
        >
          <option value="all">모든 상태</option>
          <option value="발행 전">발행 전</option>
          <option value="발행 요청">발행 요청</option>
          <option value="발행 완">발행 완</option>
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
        <span className="ml-auto self-center text-xs text-zinc-500 font-mono">
          {filtered.length}건
        </span>
      </div>

      <div className="overflow-x-auto rounded-xl border border-zinc-800">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-800 bg-zinc-900/50 text-left text-xs text-zinc-500">
              <th className="px-4 py-3 font-medium">제목</th>
              <th className="px-4 py-3 font-medium">작성자</th>
              <th className="px-4 py-3 font-medium">SP 상태</th>
              <th className="px-4 py-3 font-medium">뉴스레터</th>
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
                <td className="px-4 py-3">
                  <a
                    href={item.notionUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-zinc-200 hover:text-zinc-50 hover:underline"
                  >
                    {item.title}
                  </a>
                </td>
                <td className="px-4 py-3 text-zinc-400">
                  {item.author || "-"}
                </td>
                <td className="px-4 py-3">
                  <SpStatusBadge status={item.spStatus} />
                </td>
                <td className="px-4 py-3">
                  <NlStatusBadge status={item.newsletterStatus} />
                </td>
                <td className="px-4 py-3 text-xs text-zinc-500 font-mono">
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
                  colSpan={7}
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
