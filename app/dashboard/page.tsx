import { queryEncyclopedia } from "@/lib/notion";
import { PipelineTable } from "@/components/pipeline-table";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const items = await queryEncyclopedia();

  const spCounts = {
    before: items.filter((i) => i.spStatus === "발행 전").length,
    requested: items.filter((i) => i.spStatus === "발행 요청").length,
    done: items.filter((i) => i.spStatus === "발행 완").length,
  };

  const nlCounts = {
    before: items.filter((i) => i.newsletterStatus === "시작 전").length,
    inProgress: items.filter((i) => i.newsletterStatus === "진행 중").length,
    done: items.filter((i) => i.newsletterStatus === "완료").length,
  };

  const linkedinCount = items.filter((i) => i.linkedin).length;

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-xl font-semibold">파이프라인</h1>
        <p className="mt-1 text-sm text-zinc-500">
          AI 백과사전 콘텐츠 현황 — 인라인 편집으로 상태를 직접 변경할 수 있습니다
        </p>
      </div>

      <div className="mb-8">
        <h2 className="mb-3 text-xs font-medium uppercase tracking-wider text-zinc-500">
          OSMU 현황
        </h2>
        <div className="grid grid-cols-3 gap-4">
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 px-5 py-4">
            <p className="text-xs text-zinc-500">블로그 (슬래시페이지)</p>
            <div className="mt-2 flex items-baseline gap-3">
              <span className="text-2xl font-semibold font-mono text-green-400">
                {spCounts.done}
              </span>
              <span className="text-xs text-zinc-500">
                발행 완
              </span>
              <span className="text-sm font-mono text-yellow-400">
                {spCounts.requested}
              </span>
              <span className="text-xs text-zinc-500">
                요청
              </span>
              <span className="text-sm font-mono text-zinc-400">
                {spCounts.before}
              </span>
              <span className="text-xs text-zinc-500">
                대기
              </span>
            </div>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 px-5 py-4">
            <p className="text-xs text-zinc-500">뉴스레터 (스티비)</p>
            <div className="mt-2 flex items-baseline gap-3">
              <span className="text-2xl font-semibold font-mono text-green-400">
                {nlCounts.done}
              </span>
              <span className="text-xs text-zinc-500">
                완료
              </span>
              <span className="text-sm font-mono text-blue-400">
                {nlCounts.inProgress}
              </span>
              <span className="text-xs text-zinc-500">
                진행 중
              </span>
              <span className="text-sm font-mono text-zinc-400">
                {nlCounts.before}
              </span>
              <span className="text-xs text-zinc-500">
                대기
              </span>
            </div>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 px-5 py-4">
            <p className="text-xs text-zinc-500">링크드인</p>
            <div className="mt-2 flex items-baseline gap-3">
              <span className="text-2xl font-semibold font-mono text-blue-400">
                {linkedinCount}
              </span>
              <span className="text-xs text-zinc-500">
                등록
              </span>
              <span className="text-sm font-mono text-zinc-400">
                {items.length - linkedinCount}
              </span>
              <span className="text-xs text-zinc-500">
                미등록
              </span>
            </div>
          </div>
        </div>
      </div>

      <PipelineTable items={items} />
    </div>
  );
}
