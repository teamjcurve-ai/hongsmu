import {
  queryEncyclopedia,
  computeAuthorStats,
  computeWeeklyStats,
} from "@/lib/notion";
import { AuthorChart, WeeklyChart } from "@/components/stats-chart";

export const revalidate = 300;

export default async function StatsPage() {
  const items = await queryEncyclopedia();
  const authorStats = computeAuthorStats(items);
  const weeklyStats = computeWeeklyStats(items);

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-xl font-semibold">통계</h1>
        <p className="mt-1 text-sm text-zinc-500">
          담당자별, 주간 발행 현황
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <AuthorChart data={authorStats} />
        <WeeklyChart data={weeklyStats} />
      </div>

      <div className="mt-6 rounded-xl border border-zinc-800 bg-zinc-900/30 p-6">
        <h3 className="mb-4 text-sm font-medium text-zinc-400">
          작성자별 상세
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800 text-left text-xs text-zinc-500">
                <th className="px-4 py-2 font-medium">작성자</th>
                <th className="px-4 py-2 font-medium text-right">전체</th>
                <th className="px-4 py-2 font-medium text-right">발행 완</th>
                <th className="px-4 py-2 font-medium text-right">발행 요청</th>
              </tr>
            </thead>
            <tbody>
              {authorStats.map((s) => (
                <tr
                  key={s.name}
                  className="border-b border-zinc-800/50"
                >
                  <td className="px-4 py-2 text-zinc-300">{s.name}</td>
                  <td className="px-4 py-2 text-right font-mono text-zinc-400">
                    {s.total}
                  </td>
                  <td className="px-4 py-2 text-right font-mono text-green-400">
                    {s.published}
                  </td>
                  <td className="px-4 py-2 text-right font-mono text-yellow-400">
                    {s.inProgress}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
