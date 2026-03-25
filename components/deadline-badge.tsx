export function DeadlineBadge({ deadline }: { deadline: string | null }) {
  if (!deadline) return <span className="text-xs text-zinc-600">-</span>;

  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const target = new Date(deadline);
  target.setHours(0, 0, 0, 0);
  const diff = Math.ceil(
    (target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  );

  let style = "text-zinc-400";
  let label = "";

  if (diff < 0) {
    style = "text-red-400 font-medium";
    label = `D+${Math.abs(diff)}`;
  } else if (diff === 0) {
    style = "text-red-400 font-medium";
    label = "D-Day";
  } else if (diff <= 3) {
    style = "text-red-400 font-medium";
    label = `D-${diff}`;
  } else if (diff <= 7) {
    style = "text-orange-400";
    label = `D-${diff}`;
  } else {
    label = `D-${diff}`;
  }

  return <span className={`text-xs font-mono ${style}`}>{label}</span>;
}
