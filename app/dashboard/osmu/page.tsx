import { queryEncyclopedia } from "@/lib/notion";
import { OsmuBoard } from "@/components/osmu-board";

export const dynamic = "force-dynamic";

export default async function OsmuPage() {
  const items = await queryEncyclopedia();

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-xl font-semibold">OSMU 채널 관리</h1>
        <p className="mt-1 text-sm text-zinc-500">
          블로그, 뉴스레터, 링크드인 채널별 발행 현황
        </p>
      </div>
      <OsmuBoard items={items} />
    </div>
  );
}
