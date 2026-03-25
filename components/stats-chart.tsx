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
} from "recharts";
import type { AuthorStats, WeeklyStats } from "@/lib/types";

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
