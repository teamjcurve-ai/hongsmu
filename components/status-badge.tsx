const spStyles: Record<string, string> = {
  "발행 전": "bg-zinc-700/50 text-zinc-400",
  "발행 요청": "bg-yellow-900/50 text-yellow-400",
  "발행 완": "bg-green-900/50 text-green-400",
};

const nlStyles: Record<string, string> = {
  "시작 전": "bg-zinc-700/50 text-zinc-400",
  "진행 중": "bg-blue-900/50 text-blue-400",
  "완료": "bg-green-900/50 text-green-400",
};

export function SpStatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex rounded-md px-2 py-0.5 text-xs font-medium ${spStyles[status] || spStyles["발행 전"]}`}
    >
      {status}
    </span>
  );
}

export function NlStatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex rounded-md px-2 py-0.5 text-xs font-medium ${nlStyles[status] || nlStyles["시작 전"]}`}
    >
      {status}
    </span>
  );
}
