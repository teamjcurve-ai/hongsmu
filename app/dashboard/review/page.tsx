"use client";

import { useState, useEffect } from "react";
import type { ContentItem } from "@/lib/types";
import type { ReviewResult } from "@/lib/review";

function ScoreBadge({ score }: { score: number }) {
  const color =
    score >= 80
      ? "bg-green-900/50 text-green-400"
      : score >= 60
        ? "bg-yellow-900/50 text-yellow-400"
        : "bg-red-900/50 text-red-400";
  return (
    <span className={`rounded-md px-2 py-0.5 text-xs font-mono font-medium ${color}`}>
      {score}점
    </span>
  );
}

function IssueTag({ type }: { type: string }) {
  const color =
    type === "error"
      ? "bg-red-900/50 text-red-400"
      : type === "warning"
        ? "bg-yellow-900/50 text-yellow-400"
        : "bg-blue-900/50 text-blue-400";
  const label = type === "error" ? "오류" : type === "warning" ? "경고" : "참고";
  return (
    <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${color}`}>
      {label}
    </span>
  );
}

function CategoryTag({ category }: { category: string }) {
  const labels: Record<string, string> = {
    typo: "맞춤법",
    structure: "구조",
    image: "이미지",
    seo: "SEO",
    length: "분량",
  };
  return (
    <span className="rounded bg-zinc-800 px-1.5 py-0.5 text-xs text-zinc-400">
      {labels[category] || category}
    </span>
  );
}

export default function ReviewPage() {
  const [items, setItems] = useState<ContentItem[]>([]);
  const [results, setResults] = useState<Map<string, ReviewResult>>(new Map());
  const [reviewing, setReviewing] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/notion/pages")
      .then((res) => res.json())
      .then((data) => {
        // 발행 요청 상태인 항목만
        const reviewable = data.filter(
          (i: ContentItem) => i.spStatus === "발행 요청" || i.step2Done
        );
        setItems(reviewable);
        setLoading(false);
      });
  }, []);

  async function handleReview(item: ContentItem) {
    setReviewing(item.id);
    try {
      const res = await fetch("/api/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pageId: item.id, title: item.title }),
      });
      const result = await res.json();
      setResults((prev) => new Map(prev).set(item.id, result));
    } catch {
      // ignore
    }
    setReviewing(null);
  }

  async function handleReviewAll() {
    for (const item of items) {
      if (!results.has(item.id)) {
        await handleReview(item);
      }
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-zinc-500">
        불러오는 중...
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">콘텐츠 검수</h1>
          <p className="mt-1 text-sm text-zinc-500">
            발행 요청 또는 Step2 완료된 콘텐츠를 자동 검수합니다
          </p>
        </div>
        <button
          onClick={handleReviewAll}
          disabled={reviewing !== null}
          className="rounded-lg bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-900 transition-colors hover:bg-zinc-200 disabled:opacity-50"
        >
          전체 검수
        </button>
      </div>

      {items.length === 0 && (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 px-6 py-12 text-center text-zinc-500">
          검수 대상 콘텐츠가 없습니다. (발행 요청 또는 Step2 완료 항목)
        </div>
      )}

      <div className="space-y-4">
        {items.map((item) => {
          const result = results.get(item.id);
          return (
            <div
              key={item.id}
              className="rounded-xl border border-zinc-800 bg-zinc-900/30"
            >
              <div className="flex items-center justify-between px-6 py-4">
                <div className="flex items-center gap-4">
                  <a
                    href={item.notionUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-medium text-zinc-200 hover:underline"
                  >
                    {item.title}
                  </a>
                  <span className="text-xs text-zinc-500">
                    {item.authors.map((a) => a.name).join(", ") || "미배정"}
                  </span>
                  {result && <ScoreBadge score={result.score} />}
                </div>
                <button
                  onClick={() => handleReview(item)}
                  disabled={reviewing === item.id}
                  className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-xs text-zinc-400 transition-colors hover:bg-zinc-700 hover:text-zinc-200 disabled:opacity-50"
                >
                  {reviewing === item.id
                    ? "검수 중..."
                    : result
                      ? "재검수"
                      : "검수"}
                </button>
              </div>

              {result && (
                <div className="border-t border-zinc-800 px-6 py-4">
                  <div className="mb-3 flex gap-6 text-xs text-zinc-500">
                    <span>
                      글자 수:{" "}
                      <span
                        className={`font-mono ${result.charCount < 1000 ? "text-yellow-400" : "text-zinc-300"}`}
                      >
                        {result.charCount.toLocaleString()}
                      </span>
                    </span>
                    <span>
                      H2 헤딩:{" "}
                      <span
                        className={`font-mono ${result.headingCount < 3 ? "text-yellow-400" : "text-zinc-300"}`}
                      >
                        {result.headingCount}개
                      </span>
                    </span>
                    <span>
                      이미지:{" "}
                      <span className="font-mono text-zinc-300">
                        {result.imageCount}장
                      </span>
                    </span>
                    <span>
                      {result.passed ? (
                        <span className="text-green-400">통과</span>
                      ) : (
                        <span className="text-red-400">수정 필요</span>
                      )}
                    </span>
                  </div>

                  {result.issues.length > 0 ? (
                    <div className="space-y-2">
                      {result.issues.map((issue, i) => (
                        <div
                          key={i}
                          className="flex items-start gap-2 text-sm"
                        >
                          <IssueTag type={issue.type} />
                          <CategoryTag category={issue.category} />
                          <span className="text-zinc-300">
                            {issue.message}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-green-400">
                      검수 통과 - 발견된 이슈가 없습니다.
                    </p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
