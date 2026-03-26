import { fetchAllCrewData } from "@/lib/sheets";
import { AxDashboard } from "@/components/ax-dashboard";

export const dynamic = "force-dynamic";

export default async function AxPage() {
  let data;
  let error = false;

  try {
    data = await fetchAllCrewData();
  } catch {
    error = true;
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-xl font-semibold">AX 프로젝트 현황</h1>
        <p className="mt-1 text-sm text-zinc-500">
          크루원별 AI Transformation 프로젝트 관리
        </p>
      </div>
      {error ? (
        <div className="rounded-xl border border-red-800/50 bg-red-950/20 p-6 text-center text-sm text-red-400">
          Google Sheets 데이터를 불러오지 못했습니다. 환경변수를 확인해 주세요.
        </div>
      ) : (
        <AxDashboard data={data!} />
      )}
    </div>
  );
}
