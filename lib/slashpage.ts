// 슬래시페이지 카테고리별 blog.teamjcurve.com 섹션 ID 매핑
const CATEGORY_SECTION_MAP: Record<string, string> = {
  "AI Leadership": "y9e1xp2x5v3g5m7k35vz",
  "AI NEWS": "d367nxm3q8w5ymj98pv1",
  "생산성을 높이는 가이드북": "qrx6zk25rnn63mv314y5",
  "해외 AI 도입 사례": "91kwev26v1z592y46jpg",
  "HR 트렌드": "xjqy1g2v94vqdm6vd54z",
  "AI Strategy": "1q3vdn2px4zge2xy49pr",
  "AI Native Lab 실험 일지": "91kwev26888ry2y46jpg",
  "AI 신규 모듈 개발": "dk58wg2egggn32nqevxz",
};

// 기본 섹션 (카테고리 매칭 안 될 때)
const DEFAULT_SECTION = "d367nxm3q8w5ymj98pv1"; // AI NEWS

/**
 * slashpage.com URL을 blog.teamjcurve.com URL로 변환
 * 입력: https://slashpage.com/teamjcurve/36nj8v2wq9kr325ykq9z
 * 출력: https://blog.teamjcurve.com/{sectionId}?post=36nj8v2wq9kr325ykq9z
 */
export function convertSpLink(
  spUrl: string | null,
  categories: string[] = []
): string {
  if (!spUrl) return "https://blog.teamjcurve.com";

  // slug 추출: slashpage.com/teamjcurve/{slug} 또는 blog.teamjcurve.com/{sectionId}?post={slug}
  let slug = "";

  if (spUrl.includes("slashpage.com/teamjcurve/")) {
    slug = spUrl.split("slashpage.com/teamjcurve/")[1]?.split("?")[0] || "";
  } else if (spUrl.includes("blog.teamjcurve.com/")) {
    // 이미 변환된 URL이면 그대로 반환
    return spUrl;
  }

  if (!slug) return spUrl;

  // 카테고리로 섹션 ID 결정
  let sectionId = DEFAULT_SECTION;
  for (const cat of categories) {
    // 부분 매칭 (카테고리명이 정확히 같지 않을 수 있으므로)
    for (const [key, id] of Object.entries(CATEGORY_SECTION_MAP)) {
      if (cat.includes(key) || key.includes(cat)) {
        sectionId = id;
        break;
      }
    }
  }

  return `https://blog.teamjcurve.com/${sectionId}?post=${slug}`;
}
