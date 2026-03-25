"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import type { ContentItem } from "@/lib/types";

const SP_OPTIONS = ["발행 전", "발행 요청", "발행 완"];
const NL_OPTIONS = ["시작 전", "진행 중", "완료"];
const CATEGORIES = [
  "고객미팅", "리서치", "업무노하우", "신규모듈",
  "교육피드백", "모듈업데이트", "인사이트", "고객사례",
  "직장인 이야기", "해외사례",
];

async function updateField(
  pageId: string,
  field: string,
  value: unknown,
  type: string
) {
  await fetch("/api/notion/update", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ pageId, field, value, type }),
  });
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-medium text-zinc-500">{label}</label>
      {children}
    </div>
  );
}

export default function ContentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [item, setItem] = useState<ContentItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/notion/pages")
      .then((res) => res.json())
      .then((data: ContentItem[]) => {
        const found = data.find((i) => i.id === id);
        setItem(found || null);
        setLoading(false);
      });
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-zinc-500">
        불러오는 중...
      </div>
    );
  }

  if (!item) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <p className="text-zinc-500">콘텐츠를 찾을 수 없습니다.</p>
        <button
          onClick={() => router.push("/dashboard")}
          className="text-sm text-zinc-400 hover:text-zinc-200"
        >
          파이프라인으로 돌아가기
        </button>
      </div>
    );
  }

  const handleSave = async (field: string, value: unknown, type: string) => {
    setSaving(true);
    setSaved(false);
    try {
      await updateField(id, field, value, type);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      // ignore
    }
    setSaving(false);
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <button
          onClick={() => router.push("/dashboard")}
          className="text-sm text-zinc-500 hover:text-zinc-300"
        >
          ← 파이프라인
        </button>
        <div className="flex items-center gap-3">
          {saving && (
            <span className="text-xs text-zinc-500">저장 중...</span>
          )}
          {saved && (
            <span className="text-xs text-green-400">저장됨</span>
          )}
          <a
            href={item.notionUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-xs text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200"
          >
            Notion에서 열기
          </a>
        </div>
      </div>

      <h1 className="mb-8 text-xl font-semibold text-zinc-100">
        {item.title}
      </h1>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-6">
          <h2 className="mb-4 text-sm font-medium text-zinc-400">
            기본 정보
          </h2>
          <div className="space-y-4">
            <Field label="작성자">
              <p className="text-sm text-zinc-300">
                {item.authors.length > 0
                  ? item.authors.map((a) => a.name).join(", ")
                  : "(미배정)"}
              </p>
            </Field>

            <Field label="카테고리">
              <select
                defaultValue={item.category[0] || ""}
                onChange={(e) =>
                  handleSave("카테고리", [{ name: e.target.value }], "multi_select_raw")
                }
                className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-300 outline-none"
              >
                <option value="">선택</option>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </Field>

            <Field label="작성 기한">
              <input
                type="date"
                defaultValue={item.deadline || ""}
                onChange={(e) =>
                  handleSave("작성 기한", e.target.value || null, "date")
                }
                className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-300 outline-none"
              />
            </Field>

            <Field label="발행일 (뉴스레터)">
              <input
                type="date"
                defaultValue={item.newsletterDate || ""}
                onChange={(e) =>
                  handleSave("발행일(뉴스레터)", e.target.value || null, "date")
                }
                className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-300 outline-none"
              />
            </Field>
          </div>
        </div>

        <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-6">
          <h2 className="mb-4 text-sm font-medium text-zinc-400">
            발행 상태
          </h2>
          <div className="space-y-4">
            <Field label="SP 발행 상태 (블로그)">
              <select
                defaultValue={item.spStatus}
                onChange={(e) =>
                  handleSave("SP 발행 상태", e.target.value, "status")
                }
                className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-300 outline-none"
              >
                {SP_OPTIONS.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </Field>

            <Field label="뉴스레터 발행 여부">
              <select
                defaultValue={item.newsletterStatus}
                onChange={(e) =>
                  handleSave("뉴스레터 발행 여부", e.target.value, "status")
                }
                className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-300 outline-none"
              >
                {NL_OPTIONS.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </Field>

            <Field label="Step2 진행 여부">
              <input
                type="checkbox"
                defaultChecked={item.step2Done}
                onChange={(e) =>
                  handleSave("Step2 진행 여부", e.target.checked, "checkbox")
                }
                className="h-5 w-5 rounded border-zinc-600 bg-zinc-800 accent-green-500"
              />
            </Field>

            <Field label="링크드인">
              <input
                type="text"
                defaultValue={item.linkedin || ""}
                placeholder="링크드인 URL 또는 내용"
                onBlur={(e) =>
                  handleSave("링크드인", e.target.value, "rich_text")
                }
                className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-300 outline-none placeholder-zinc-600"
              />
            </Field>
          </div>
        </div>

        <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-6 lg:col-span-2">
          <h2 className="mb-4 text-sm font-medium text-zinc-400">
            링크
          </h2>
          <div className="grid gap-4 sm:grid-cols-3">
            {item.slackLink && (
              <a
                href={item.slackLink}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-3 text-sm text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200"
              >
                Slack 원본
              </a>
            )}
            {item.blogLink && (
              <a
                href={item.blogLink}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-3 text-sm text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200"
              >
                블로그 링크
              </a>
            )}
            <a
              href={item.notionUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-3 text-sm text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200"
            >
              Notion 페이지
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
