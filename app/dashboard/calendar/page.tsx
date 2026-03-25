import { queryEncyclopedia } from "@/lib/notion";

export const dynamic = "force-dynamic";

function getWednesdaysRange(): string[] {
  const weeks: string[] = [];
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  // 4주 전부터 8주 후까지
  const start = new Date(now);
  start.setDate(start.getDate() - 28);

  for (let i = 0; i < 12; i++) {
    const d = new Date(start);
    d.setDate(d.getDate() + i * 7);
    // 해당 주의 수요일 찾기
    const day = d.getDay();
    const diff = 3 - day;
    d.setDate(d.getDate() + diff);
    weeks.push(d.toISOString().split("T")[0]);
  }

  return weeks;
}

function getWednesdayOfWeek(dateStr: string): string {
  const d = new Date(dateStr);
  const day = d.getDay();
  const diff = 3 - day;
  d.setDate(d.getDate() + diff);
  return d.toISOString().split("T")[0];
}

export default async function CalendarPage() {
  const items = await queryEncyclopedia();
  const wednesdays = getWednesdaysRange();

  // 주차별 그룹핑
  const weekMap = new Map<
    string,
    Array<{ title: string; authors: string; spStatus: string; id: string }>
  >();

  for (const wed of wednesdays) {
    weekMap.set(wed, []);
  }

  for (const item of items) {
    if (!item.newsletterDate) continue;
    const wed = getWednesdayOfWeek(item.newsletterDate);
    if (!weekMap.has(wed)) weekMap.set(wed, []);
    weekMap.get(wed)!.push({
      title: item.title,
      authors: item.authors.map((a) => a.name).join(", ") || "미배정",
      spStatus: item.spStatus,
      id: item.id,
    });
  }

  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const todayWed = getWednesdayOfWeek(now.toISOString().split("T")[0]);

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-xl font-semibold">발행 캘린더</h1>
        <p className="mt-1 text-sm text-zinc-500">
          주간 뉴스레터 발행 스케줄 (주당 4건 쿼터)
        </p>
      </div>

      <div className="space-y-3">
        {wednesdays.map((wed) => {
          const weekItems = weekMap.get(wed) || [];
          const isThisWeek = wed === todayWed;
          const isPast = wed < todayWed;
          const count = weekItems.length;
          const isFull = count >= 4;

          return (
            <div
              key={wed}
              className={`rounded-xl border p-5 ${
                isThisWeek
                  ? "border-blue-800 bg-blue-950/20"
                  : isPast
                    ? "border-zinc-800/50 bg-zinc-900/10 opacity-60"
                    : "border-zinc-800 bg-zinc-900/30"
              }`}
            >
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-zinc-300">
                    {wed} (수)
                  </span>
                  {isThisWeek && (
                    <span className="rounded bg-blue-900/50 px-2 py-0.5 text-xs text-blue-400">
                      이번 주
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`text-xs font-mono ${
                      isFull
                        ? "text-green-400"
                        : count === 0
                          ? "text-zinc-600"
                          : "text-zinc-400"
                    }`}
                  >
                    {count}/4
                  </span>
                  <div className="flex gap-0.5">
                    {[0, 1, 2, 3].map((i) => (
                      <div
                        key={i}
                        className={`h-2 w-5 rounded-sm ${
                          i < count
                            ? weekItems[i]?.spStatus === "발행 완"
                              ? "bg-green-500"
                              : weekItems[i]?.spStatus === "발행 요청"
                                ? "bg-yellow-500"
                                : "bg-zinc-500"
                            : "bg-zinc-800"
                        }`}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {weekItems.length > 0 ? (
                <div className="space-y-1.5">
                  {weekItems.map((item, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between text-sm"
                    >
                      <a
                        href={`/dashboard/content/${item.id}`}
                        className="text-zinc-300 hover:text-zinc-100 hover:underline truncate max-w-[60%]"
                      >
                        {item.title}
                      </a>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-zinc-500">
                          {item.authors}
                        </span>
                        <span
                          className={`rounded px-1.5 py-0.5 text-xs ${
                            item.spStatus === "발행 완"
                              ? "bg-green-900/50 text-green-400"
                              : item.spStatus === "발행 요청"
                                ? "bg-yellow-900/50 text-yellow-400"
                                : "bg-zinc-700 text-zinc-400"
                          }`}
                        >
                          {item.spStatus}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-zinc-600">배정된 콘텐츠 없음</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
