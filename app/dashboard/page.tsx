import { queryEncyclopedia } from "@/lib/notion";
import { PipelineTable } from "@/components/pipeline-table";

export const revalidate = 300; // 5분 캐시

export default async function DashboardPage() {
  const items = await queryEncyclopedia();

  const counts = {
    total: items.length,
    before: items.filter((i) => i.spStatus === "발행 전").length,
    requested: items.filter((i) => i.spStatus === "발행 요청").length,
    done: items.filter((i) => i.spStatus === "발행 완").length,
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-xl font-semibold">파이프라인</h1>
        <p className="mt-1 text-sm text-zinc-500">
          AI 백과사전 콘텐츠 현황
        </p>
      </div>

      <div className="mb-8 grid grid-cols-4 gap-4">
        <SummaryCard label="전체" value={counts.total} />
        <SummaryCard label="발행 전" value={counts.before} color="zinc" />
        <SummaryCard label="발행 요청" value={counts.requested} color="yellow" />
        <SummaryCard label="발행 완" value={counts.done} color="green" />
      </div>

      <PipelineTable items={items} />
    </div>
  );
}

function SummaryCard({
  label,
  value,
  color = "zinc",
}: {
  label: string;
  value: number;
  color?: "zinc" | "yellow" | "green";
}) {
  const valueColor =
    color === "green"
      ? "text-green-400"
      : color === "yellow"
        ? "text-yellow-400"
        : "text-zinc-100";

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 px-5 py-4">
      <p className="text-xs text-zinc-500">{label}</p>
      <p className={`mt-1 text-2xl font-semibold font-mono ${valueColor}`}>
        {value}
      </p>
    </div>
  );
}
