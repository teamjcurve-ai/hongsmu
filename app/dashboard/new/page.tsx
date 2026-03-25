"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const CATEGORIES = [
  "고객미팅", "리서치", "업무노하우", "신규모듈",
  "교육피드백", "모듈업데이트", "인사이트", "고객사례",
  "직장인 이야기", "해외사례",
];

export default function NewContentPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("인사이트");
  const [deadline, setDeadline] = useState("");
  const [newsletterDate, setNewsletterDate] = useState("");
  const [direction, setDirection] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      setError("제목을 입력해주세요.");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const res = await fetch("/api/notion/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          category,
          deadline: deadline || null,
          newsletterDate: newsletterDate || null,
          direction: direction.trim(),
        }),
      });

      if (!res.ok) throw new Error("Failed to create");

      router.push("/dashboard");
    } catch {
      setError("생성에 실패했습니다. 다시 시도해주세요.");
      setSaving(false);
    }
  }

  return (
    <div className="max-w-xl">
      <div className="mb-8">
        <button
          onClick={() => router.push("/dashboard")}
          className="text-sm text-zinc-500 hover:text-zinc-300"
        >
          ← 파이프라인
        </button>
        <h1 className="mt-4 text-xl font-semibold">새 콘텐츠 등록</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="mb-1.5 block text-xs font-medium text-zinc-500">
            제목 *
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="콘텐츠 제목"
            className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2.5 text-sm text-zinc-100 outline-none placeholder-zinc-600 focus:border-zinc-500"
            autoFocus
          />
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-medium text-zinc-500">
            카테고리
          </label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2.5 text-sm text-zinc-300 outline-none"
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-zinc-500">
              작성 기한
            </label>
            <input
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2.5 text-sm text-zinc-300 outline-none"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-zinc-500">
              발행일 (뉴스레터)
            </label>
            <input
              type="date"
              value={newsletterDate}
              onChange={(e) => setNewsletterDate(e.target.value)}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2.5 text-sm text-zinc-300 outline-none"
            />
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-medium text-zinc-500">
            콘텐츠 방향
          </label>
          <textarea
            value={direction}
            onChange={(e) => setDirection(e.target.value)}
            placeholder="콘텐츠 방향, 핵심 메시지, 참고 자료 등"
            rows={4}
            className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2.5 text-sm text-zinc-100 outline-none placeholder-zinc-600 focus:border-zinc-500 resize-none"
          />
        </div>

        {error && <p className="text-sm text-red-400">{error}</p>}

        <button
          type="submit"
          disabled={saving}
          className="w-full rounded-lg bg-zinc-100 px-4 py-2.5 text-sm font-medium text-zinc-900 transition-colors hover:bg-zinc-200 disabled:opacity-50"
        >
          {saving ? "등록 중..." : "Notion에 등록"}
        </button>
      </form>
    </div>
  );
}
