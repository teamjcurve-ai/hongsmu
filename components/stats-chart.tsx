"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import type { AuthorStats, WeeklyStats, CategoryStats, DeadlineStats } from "@/lib/types";

export function AuthorChart({ data }: { data: AuthorStats[] }) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-6">
      <h3 className="mb-4 text-sm font-medium text-zinc-400">
        작성자별 발행 건수
      </h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 12, fill: "#71717a" }}
              tickLine={false}
              axisLine={{ stroke: "#27272a" }}
            />
            <YAxis
              tick={{ fontSize: 12, fill: "#71717a" }}
              tickLine={false}
              axisLine={false}
              allowDecimals={false}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "#18181b",
                border: "1px solid #27272a",
                borderRadius: "8px",
                fontSize: "12px",
              }}
              labelStyle={{ color: "#a1a1aa" }}
            />
            <Bar dataKey="published" name="발행 완" fill="#4ade80" radius={[4, 4, 0, 0]} />
            <Bar dataKey="inProgress" name="발행 요청" fill="#facc15" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export function CategoryChart({ data }: { data: CategoryStats[] }) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-6">
      <h3 className="mb-4 text-sm font-medium text-zinc-400">
        카테고리별 현황
      </h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
            <XAxis
              dataKey="category"
              tick={{ fontSize: 11, fill: "#71717a" }}
              tickLine={false}
              axisLine={{ stroke: "#27272a" }}
              interval={0}
              angle={-30}
              textAnchor="end"
              height={50}
            />
            <YAxis
              tick={{ fontSize: 12, fill: "#71717a" }}
              tickLine={false}
              axisLine={false}
              allowDecimals={false}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "#18181b",
                border: "1px solid #27272a",
                borderRadius: "8px",
                fontSize: "12px",
              }}
              labelStyle={{ color: "#a1a1aa" }}
            />
            <Bar dataKey="published" name="발행 완" stackId="a" fill="#4ade80" radius={[0, 0, 0, 0]} />
            <Bar dataKey="inProgress" name="발행 요청" stackId="a" fill="#facc15" radius={[0, 0, 0, 0]} />
            <Bar
              dataKey={(entry: CategoryStats) => entry.total - entry.published - entry.inProgress}
              name="대기"
              stackId="a"
              fill="#3f3f46"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

const DEADLINE_COLORS = ["#4ade80", "#f87171", "#52525b"];

export function DeadlineChart({ data }: { data: DeadlineStats }) {
  const total = data.onTime + data.delayed + data.noDeadline;
  const chartData = [
    { name: "기한 내", value: data.onTime },
    { name: "지연", value: data.delayed },
    { name: "기한 미설정", value: data.noDeadline },
  ].filter((d) => d.value > 0);

  const onTimeRate = total > 0 ? Math.round((data.onTime / (data.onTime + data.delayed || 1)) * 100) : 0;

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-6">
      <h3 className="mb-4 text-sm font-medium text-zinc-400">
        마감 준수율
      </h3>
      <div className="flex items-center gap-6">
        <div className="h-48 w-48">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={45}
                outerRadius={70}
                paddingAngle={2}
                dataKey="value"
              >
                {chartData.map((_, index) => {
                  const originalIndex = [
                    { name: "기한 내", value: data.onTime },
                    { name: "지연", value: data.delayed },
                    { name: "기한 미설정", value: data.noDeadline },
                  ].findIndex((d) => d.name === chartData[index].name);
                  return (
                    <Cell
                      key={`cell-${index}`}
                      fill={DEADLINE_COLORS[originalIndex]}
                    />
                  );
                })}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: "#18181b",
                  border: "1px solid #27272a",
                  borderRadius: "8px",
                  fontSize: "12px",
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="flex flex-col gap-3">
          <div className="text-center">
            <div className="text-3xl font-semibold text-zinc-100">{onTimeRate}%</div>
            <div className="text-xs text-zinc-500">준수율</div>
          </div>
          <div className="flex flex-col gap-1.5 text-xs">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-green-400" />
              <span className="text-zinc-400">기한 내 {data.onTime}건</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
              <span className="text-zinc-400">지연 {data.delayed}건</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-zinc-600" />
              <span className="text-zinc-400">미설정 {data.noDeadline}건</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function WeeklyChart({ data }: { data: WeeklyStats[] }) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-6">
      <h3 className="mb-4 text-sm font-medium text-zinc-400">
        주간 발행 추이
      </h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
            <XAxis
              dataKey="week"
              tick={{ fontSize: 11, fill: "#71717a" }}
              tickLine={false}
              axisLine={{ stroke: "#27272a" }}
            />
            <YAxis
              tick={{ fontSize: 12, fill: "#71717a" }}
              tickLine={false}
              axisLine={false}
              allowDecimals={false}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "#18181b",
                border: "1px solid #27272a",
                borderRadius: "8px",
                fontSize: "12px",
              }}
              labelStyle={{ color: "#a1a1aa" }}
            />
            <Line
              type="monotone"
              dataKey="count"
              name="발행 건수"
              stroke="#818cf8"
              strokeWidth={2}
              dot={{ fill: "#818cf8", r: 3 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
