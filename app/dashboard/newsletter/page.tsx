"use client";

import { useState, useEffect, useCallback } from "react";
import type { ContentItem, NewsItem, NewsletterDraft } from "@/lib/types";
import { buildNewsletterHtml } from "@/lib/newsletter-template";

type Step = 1 | 2 | 3 | 4;

export default function NewsletterPage() {
  const [step, setStep] = useState<Step>(1);

  // Step 1: 데이터 + 선택
  const [encyclopedia, setEncyclopedia] = useState<ContentItem[]>([]);
  const [newsArchive, setNewsArchive] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [mainId, setMainId] = useState<string | null>(null);
  const [nativeIds, setNativeIds] = useState<Set<string>>(new Set());
  const [newsIds, setNewsIds] = useState<Set<string>>(new Set());

  // Step 2-3: 생성 결과
  const [generating, setGenerating] = useState(false);
  const [draft, setDraft] = useState<NewsletterDraft | null>(null);
  const [html, setHtml] = useState<string>("");

  // Step 4: 복사
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch("/api/notion/pages").then((r) => r.json()),
      fetch("/api/newsletter/news").then((r) => r.json()),
    ]).then(([enc, news]) => {
      setEncyclopedia(Array.isArray(enc) ? enc : []);
      setNewsArchive(Array.isArray(news) ? news : []);
      setLoading(false);
    });
  }, []);

  const toggleNative = (id: string) => {
    setNativeIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else if (next.size < 3) next.add(id);
      return next;
    });
  };

  const toggleNews = (id: string) => {
    setNewsIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else if (next.size < 3) next.add(id);
      return next;
    });
  };

  const canProceed = mainId && nativeIds.size >= 1 && nativeIds.size <= 3 && newsIds.size === 3;
  const [imageWarning, setImageWarning] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!canProceed) return;
    setStep(2);
    setGenerating(true);

    const today = new Date();
    const publishDate = `${today.getFullYear()}. ${String(today.getMonth() + 1).padStart(2, "0")}. ${String(today.getDate()).padStart(2, "0")}.`;

    try {
      const res = await fetch("/api/newsletter/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mainId,
          nativeIds: Array.from(nativeIds),
          newsIds: Array.from(newsIds),
          publishDate,
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setDraft(data.draft);
      setHtml(data.html);
      if (data.imageWarnings) setImageWarning(data.imageWarnings);
      setStep(3);
    } catch (err) {
      alert("생성 실패: " + (err instanceof Error ? err.message : "알 수 없는 오류"));
      setStep(1);
    }
    setGenerating(false);
  };

  const updateDraftField = useCallback(
    (
      section: "main" | "natives" | "news",
      index: number,
      field: string,
      value: string
    ) => {
      if (!draft) return;
      const updated = { ...draft };
      if (section === "main") {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (updated.main as any)[field] = value;
      } else {
        const arr = [...updated[section]];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (arr[index] as any)[field] = value;
        updated[section] = arr;
      }
      setDraft(updated);
      setHtml(buildNewsletterHtml(updated));
    },
    [draft]
  );

  const handleCopy = async () => {
    await navigator.clipboard.writeText(html);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div>
        <h1 className="text-xl font-semibold mb-2">뉴스레터 제작</h1>
        <p className="text-sm text-zinc-500">불러오는 중...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-semibold">뉴스레터 제작</h1>
        <p className="mt-1 text-sm text-zinc-500">
          콘텐츠 선택 → AI 초안 생성 → 편집 → HTML 복사
        </p>
      </div>

      {/* 스텝 인디케이터 */}
      <div className="mb-6 flex items-center gap-2">
        {([1, 2, 3, 4] as Step[]).map((s) => (
          <div key={s} className="flex items-center gap-2">
            <div
              className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-medium ${
                step === s
                  ? "bg-indigo-600 text-white"
                  : step > s
                    ? "bg-green-900/50 text-green-400"
                    : "bg-zinc-800 text-zinc-500"
              }`}
            >
              {step > s ? "V" : s}
            </div>
            {s < 4 && <div className="h-px w-8 bg-zinc-800" />}
          </div>
        ))}
        <span className="ml-3 text-xs text-zinc-500">
          {step === 1 && "콘텐츠 선택"}
          {step === 2 && "AI 초안 생성 중..."}
          {step === 3 && "미리보기 + 편집"}
          {step === 4 && "HTML 복사"}
        </span>
      </div>

      {/* Step 1: 콘텐츠 선택 */}
      {step === 1 && (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* 백과사전 */}
          <div>
            <h2 className="mb-3 text-sm font-medium text-zinc-400">
              AI 백과사전 (메인 1건 + 사례 1~3건 선택)
            </h2>
            <div className="space-y-1 max-h-[500px] overflow-y-auto rounded-xl border border-zinc-800 p-3">
              {encyclopedia.map((item) => {
                const isMain = mainId === item.id;
                const isNative = nativeIds.has(item.id);
                return (
                  <div
                    key={item.id}
                    className={`flex items-center gap-3 rounded-lg p-2 transition-colors ${
                      isMain || isNative ? "bg-zinc-800/50" : "hover:bg-zinc-900/30"
                    }`}
                  >
                    <button
                      onClick={() => setMainId(isMain ? null : item.id)}
                      className={`shrink-0 rounded px-2 py-0.5 text-xs font-medium ${
                        isMain
                          ? "bg-indigo-600 text-white"
                          : "bg-zinc-800 text-zinc-500 hover:text-zinc-300"
                      }`}
                    >
                      메인
                    </button>
                    <button
                      onClick={() => {
                        if (item.id !== mainId) toggleNative(item.id);
                      }}
                      disabled={item.id === mainId}
                      className={`shrink-0 rounded px-2 py-0.5 text-xs font-medium ${
                        isNative
                          ? "bg-yellow-700 text-yellow-100"
                          : item.id === mainId
                            ? "bg-zinc-800 text-zinc-600 cursor-not-allowed"
                            : "bg-zinc-800 text-zinc-500 hover:text-zinc-300"
                      }`}
                    >
                      사례
                    </button>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm text-zinc-200">{item.title}</div>
                      <div className="text-xs text-zinc-500">
                        {item.authors.map((a) => a.name).join(", ") || "-"} / {item.newsletterDate || "-"}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 뉴스 아카이브 */}
          <div>
            <h2 className="mb-3 text-sm font-medium text-zinc-400">
              AI 뉴스 아카이브 (3건 선택)
            </h2>
            <div className="space-y-1 max-h-[500px] overflow-y-auto rounded-xl border border-zinc-800 p-3">
              {newsArchive.map((item) => {
                const selected = newsIds.has(item.id);
                return (
                  <div
                    key={item.id}
                    className={`flex items-center gap-3 rounded-lg p-2 cursor-pointer transition-colors ${
                      selected ? "bg-zinc-800/50" : "hover:bg-zinc-900/30"
                    }`}
                    onClick={() => toggleNews(item.id)}
                  >
                    <input
                      type="checkbox"
                      checked={selected}
                      readOnly
                      className="h-3.5 w-3.5 shrink-0 rounded border-zinc-600 bg-zinc-800 accent-indigo-500"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm text-zinc-200">{item.title}</div>
                      <div className="flex gap-2 text-xs text-zinc-500">
                        <span>{item.date || "-"}</span>
                        {item.tags.slice(0, 3).map((t) => (
                          <span key={t} className="rounded bg-zinc-800 px-1 py-0.5">
                            {t}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
              {newsArchive.length === 0 && (
                <div className="p-6 text-center text-sm text-zinc-600">
                  뉴스 아카이브가 비어있습니다. NEWS_ARCHIVE_NOTION_DATABASE_ID 환경변수를 확인해주세요.
                </div>
              )}
            </div>
          </div>

          {/* 선택 현황 + 생성 버튼 */}
          <div className="lg:col-span-2 flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-900/30 p-4">
            <div className="flex gap-4 text-xs text-zinc-500">
              <span>
                메인:{" "}
                <span className={mainId ? "text-indigo-400" : "text-zinc-600"}>
                  {mainId ? "1건 선택" : "미선택"}
                </span>
              </span>
              <span>
                사례:{" "}
                <span className={nativeIds.size >= 1 ? "text-yellow-400" : "text-zinc-600"}>
                  {nativeIds.size}/1~3건
                </span>
              </span>
              <span>
                뉴스:{" "}
                <span className={newsIds.size === 3 ? "text-green-400" : "text-zinc-600"}>
                  {newsIds.size}/3건
                </span>
              </span>
            </div>
            <button
              onClick={handleGenerate}
              disabled={!canProceed}
              className="rounded-lg bg-indigo-600 px-6 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-500 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              초안 생성
            </button>
          </div>
        </div>
      )}

      {/* Step 2: 생성 중 */}
      {step === 2 && generating && (
        <div className="flex flex-col items-center justify-center py-24">
          <div className="mb-4 h-8 w-8 animate-spin rounded-full border-2 border-zinc-700 border-t-indigo-500" />
          <p className="text-sm text-zinc-400">
            AI가 뉴스레터 초안을 생성하고 있습니다...
          </p>
          <p className="mt-1 text-xs text-zinc-600">
            6건의 콘텐츠를 분석 중 (30초~1분 소요)
          </p>
        </div>
      )}

      {/* Step 3: 미리보기 + 편집 */}
      {step === 3 && draft && (
        <div>
          {imageWarning && (
            <div className="mb-4 rounded-lg border border-yellow-800/50 bg-yellow-950/20 px-4 py-2 text-xs text-yellow-400">
              {imageWarning}
            </div>
          )}
          <div className="grid gap-6 lg:grid-cols-2">
          {/* 좌측: 섹션별 편집 */}
          <div className="space-y-4 max-h-[700px] overflow-y-auto pr-2">
            <h2 className="text-sm font-medium text-zinc-400">섹션 편집</h2>

            {/* 메인 콘텐츠 */}
            <SectionEditor
              label="메인 콘텐츠"
              fields={[
                { key: "partnerName", label: "협업사명", value: draft.main.partnerName },
                { key: "title", label: "제목", value: draft.main.title },
                { key: "summary", label: "요약", value: draft.main.summary, multiline: true },
                { key: "imageUrl", label: "이미지 URL", value: draft.main.imageUrl },
                { key: "ctaUrl", label: "CTA 링크", value: draft.main.ctaUrl },
              ]}
              onChange={(field, value) => updateDraftField("main", 0, field, value)}
            />

            {/* 네이티브 사례 */}
            {draft.natives.map((n, i) => (
              <SectionEditor
                key={`native-${i}`}
                label={`AI NATIVE 사례 ${i + 1}`}
                fields={[
                  { key: "title", label: "제목", value: n.title },
                  { key: "summary", label: "요약", value: n.summary, multiline: true },
                  { key: "imageUrl", label: "이미지 URL", value: n.imageUrl },
                  { key: "ctaUrl", label: "CTA 링크", value: n.ctaUrl },
                ]}
                onChange={(field, value) => updateDraftField("natives", i, field, value)}
              />
            ))}

            {/* 선별 뉴스 */}
            {draft.news.map((n, i) => (
              <SectionEditor
                key={`news-${i}`}
                label={`선별 뉴스 ${i + 1}`}
                fields={[
                  { key: "title", label: "제목", value: n.title },
                  { key: "summary", label: "요약", value: n.summary, multiline: true },
                  { key: "imageUrl", label: "이미지 URL", value: n.imageUrl },
                  { key: "ctaUrl", label: "CTA 링크", value: n.ctaUrl },
                ]}
                onChange={(field, value) => updateDraftField("news", i, field, value)}
              />
            ))}
          </div>

          {/* 우측: 미리보기 */}
          <div>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-medium text-zinc-400">미리보기</h2>
              <button
                onClick={() => setStep(4)}
                className="rounded-lg bg-green-700 px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-green-600"
              >
                초안 검토 완료
              </button>
            </div>
            <div className="rounded-xl border border-zinc-800 bg-white overflow-hidden">
              <iframe
                srcDoc={html}
                style={{ width: "100%", height: "600px", border: "none" }}
                title="뉴스레터 미리보기"
              />
            </div>
          </div>
        </div>
        </div>
      )}

      {/* Step 4: HTML 복사 */}
      {step === 4 && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setStep(3)}
              className="rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2 text-sm text-zinc-400 hover:text-zinc-200"
            >
              편집으로 돌아가기
            </button>
            <button
              onClick={handleCopy}
              className="rounded-lg bg-indigo-600 px-6 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-500"
            >
              {copied ? "복사됨" : "HTML 클립보드에 복사"}
            </button>
            <span className="text-xs text-zinc-500">
              복사 후 스티비 이메일 편집기에서 HTML 모드로 붙여넣기하세요
            </span>
          </div>
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-4">
            <textarea
              value={html}
              readOnly
              className="h-96 w-full rounded-lg border border-zinc-700 bg-zinc-950 p-4 font-mono text-xs text-zinc-400 outline-none"
            />
          </div>
        </div>
      )}
    </div>
  );
}

function SectionEditor({
  label,
  fields,
  onChange,
}: {
  label: string;
  fields: Array<{ key: string; label: string; value: string; multiline?: boolean }>;
  onChange: (field: string, value: string) => void;
}) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900/20 p-3">
      <div className="mb-2 text-xs font-medium text-zinc-500">{label}</div>
      <div className="space-y-2">
        {fields.map((f) => (
          <div key={f.key}>
            <label className="mb-0.5 block text-xs text-zinc-600">{f.label}</label>
            {f.multiline ? (
              <textarea
                value={f.value}
                onChange={(e) => onChange(f.key, e.target.value)}
                rows={3}
                className="w-full rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-sm text-zinc-200 outline-none focus:border-zinc-600"
              />
            ) : (
              <input
                type="text"
                value={f.value}
                onChange={(e) => onChange(f.key, e.target.value)}
                className="w-full rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-sm text-zinc-200 outline-none focus:border-zinc-600"
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
