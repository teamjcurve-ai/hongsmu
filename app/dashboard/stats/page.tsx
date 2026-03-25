import {
  queryEncyclopedia,
  computeAuthorStats,
  computeWeeklyStats,
  computeOsmuStatus,
  computeDeadlineStats,
  computeCategoryStats,
} from "@/lib/notion";
import {
  AuthorChart,
  WeeklyChart,
  CategoryChart,
  DeadlineChart,
} from "@/components/stats-chart";

export const dynamic = "force-dynamic";

export default async function StatsPage() {
  const items = await queryEncyclopedia();
  const authorStats = computeAuthorStats(items);
  const weeklyStats = computeWeeklyStats(items);
  const deadlineStats = computeDeadlineStats(items);
  const categoryStats = computeCategoryStats(items);

  const osmuComplete = items.filter(
    (i) => computeOsmuStatus(i).done === 3
  ).length;
  const osmuRate =
    items.length > 0 ? Math.round((osmuComplete / items.length) * 100) : 0;

  const deadlineTotal = deadlineStats.onTime + deadlineStats.delayed;
  const deadlineRate =
    deadlineTotal > 0
      ? Math.round((deadlineStats.onTime / deadlineTotal) * 100)
      : 0;

  const now = new Date();
  const dayOfWeek = now.getDay();
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = new Date(now);
  monday.setDate(now.getDate() + mondayOffset);
  monday.setHours(0, 0, 0, 0);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);

  const thisWeekCount = items.filter((i) => {
    if (!i.newsletterDate) return false;
    const d = new Date(i.newsletterDate);
    return d >= monday && d <= sunday;
  }).length;

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-xl font-semibold">통계</h1>
        <p className="mt-1 text-sm text-zinc-500">
          담당자별, 주간 발행 현황 및 운영 지표
        </p>
      </div>

      {/* KPI 카드 */}
      <div className="mb-6 grid gap-4 sm:grid-cols-4">
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-4">
          <div className="mb-1 text-xs font-medium text-zinc-500">
            전체 콘텐츠
          </div>
          <div className="text-2xl font-semibold text-zinc-100">
            {items.length}
            <span className="ml-1 text-sm font-normal text-zinc-500">건</span>
          </div>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-4">
          <div className="mb-1 text-xs font-medium text-zinc-500">
            OSMU 완료율
          </div>
          <div className="text-2xl font-semibold text-zinc-100">
            {osmuRate}
            <span className="ml-0.5 text-sm font-normal text-zinc-500">%</span>
          </div>
          <div className="mt-1 text-xs text-zinc-600">
            {osmuComplete}/{items.length}건 3채널 완료
          </div>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-4">
          <div className="mb-1 text-xs font-medium text-zinc-500">
            마감 준수율
          </div>
          <div className="text-2xl font-semibold text-zinc-100">
            {deadlineRate}
            <span className="ml-0.5 text-sm font-normal text-zinc-500">%</span>
          </div>
          <div className="mt-1 text-xs text-zinc-600">
            지연 {deadlineStats.delayed}건
          </div>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-4">
          <div className="mb-1 text-xs font-medium text-zinc-500">
            이번 주 발행 예정
          </div>
          <div className="text-2xl font-semibold text-zinc-100">
            {thisWeekCount}
            <span className="ml-1 text-sm font-normal text-zinc-500">건</span>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <AuthorChart data={authorStats} />
        <WeeklyChart data={weeklyStats} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <CategoryChart data={categoryStats} />
        <DeadlineChart data={deadlineStats} />
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
