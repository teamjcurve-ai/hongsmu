import { generateText } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import type { ContentItem } from "./types";

const CATEGORIES = [
  "고객미팅",
  "리서치",
  "업무노하우",
  "신규모듈",
  "교육피드백",
  "모듈업데이트",
  "인사이트",
  "고객사례",
  "직장인 이야기",
  "해외사례",
];

const WEEKLY_QUOTA = 4;

export interface ExtractedContent {
  title: string;
  direction: string;
  category: string;
}

export async function extractContentFromThread(
  originalMessage: string,
  threadMessages: string[]
): Promise<ExtractedContent> {
  const prompt = `아래는 슬랙 채널에 올라온 AI 관련 소재 원본과, 미팅 후 달린 스레드 답글들입니다.
이 내용을 분석해서 콘텐츠 등록에 필요한 정보를 추출해주세요.

[원본 메시지]
${originalMessage}

[스레드 답글들]
${threadMessages.map((m, i) => `${i + 1}. ${m}`).join("\n")}

다음 JSON 형식으로만 응답해주세요. 설명 없이 JSON만:
{
  "title": "블로그 콘텐츠 제목 (원본 소재와 토론 내용 기반으로 적절하게)",
  "direction": "콘텐츠 방향 요약 (2-3문장)",
  "category": "카테고리 (다음 중 하나: ${CATEGORIES.join(", ")})"
}`;

  const { text } = await generateText({
    model: anthropic("claude-sonnet-4-20250514"),
    prompt,
    maxOutputTokens: 500,
  });

  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("Failed to extract JSON from response");
  }

  const parsed = JSON.parse(jsonMatch[0]);

  if (!CATEGORIES.includes(parsed.category)) {
    parsed.category = "인사이트";
  }

  return {
    title: parsed.title || "(제목 미정)",
    direction: parsed.direction || "",
    category: parsed.category,
  };
}

// 스레드 텍스트에서 슬랙 멘션 ID 추출 (<@U12345> 형태)
export function extractMentionedUserIds(messages: string[]): string[] {
  const ids = new Set<string>();
  const pattern = /<@(U[A-Z0-9]+)>/g;
  for (const msg of messages) {
    let match;
    while ((match = pattern.exec(msg)) !== null) {
      ids.add(match[1]);
    }
  }
  return Array.from(ids);
}

// 시의성 판단
export function isUrgentContent(texts: string[]): boolean {
  const combined = texts.join(" ");
  return (
    combined.includes("시의성 중요") ||
    combined.includes("시의성중요") ||
    combined.includes("긴급")
  );
}

export interface ScheduleResult {
  deadline: string;
  newsletterDate: string;
  bumped: ContentItem | null; // 밀려난 콘텐츠 (시의성 중요 시)
  bumpedNewDate: string | null; // 밀려난 콘텐츠의 새 발행일
}

// 기존 스케줄을 확인해서 발행일 + 작성 기한 계산
export function computeDeadlines(
  existingItems: ContentItem[],
  isUrgent: boolean
): ScheduleResult {
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  // 기존 콘텐츠의 발행일별 그룹핑
  const weekGroups = new Map<string, ContentItem[]>();
  for (const item of existingItems) {
    if (item.newsletterDate && item.spStatus !== "발행 완") {
      const wed = formatDate(getWednesdayOfWeek(new Date(item.newsletterDate)));
      if (!weekGroups.has(wed)) weekGroups.set(wed, []);
      weekGroups.get(wed)!.push(item);
    }
  }

  if (isUrgent) {
    // 시의성 중요: 가장 가까운 수요일에 강제 배정
    const nextWed = getNextWednesday(now);
    const nextWedKey = formatDate(nextWed);
    const deadline = new Date(nextWed);
    deadline.setDate(deadline.getDate() - 1);

    const weekItems = weekGroups.get(nextWedKey) || [];

    if (weekItems.length >= WEEKLY_QUOTA) {
      // 쿼터 초과 → 가장 여유 있는 항목을 다음 주로 밀기
      // 마감일이 가장 먼 항목 = 가장 여유 있는 항목
      const sorted = [...weekItems].sort((a, b) => {
        const aDate = a.deadline ? new Date(a.deadline).getTime() : 0;
        const bDate = b.deadline ? new Date(b.deadline).getTime() : 0;
        return bDate - aDate; // 마감일이 먼 순
      });
      const toBump = sorted[0];

      // 밀려날 콘텐츠의 새 발행일: 다음 빈 슬롯 찾기
      let bumpTarget = new Date(nextWed);
      bumpTarget.setDate(bumpTarget.getDate() + 7);
      for (let i = 0; i < 12; i++) {
        const key = formatDate(bumpTarget);
        const count = (weekGroups.get(key) || []).length;
        if (count < WEEKLY_QUOTA) break;
        bumpTarget = new Date(bumpTarget);
        bumpTarget.setDate(bumpTarget.getDate() + 7);
      }

      return {
        deadline: formatDate(deadline),
        newsletterDate: nextWedKey,
        bumped: toBump,
        bumpedNewDate: formatDate(bumpTarget),
      };
    }

    return {
      deadline: formatDate(deadline),
      newsletterDate: nextWedKey,
      bumped: null,
      bumpedNewDate: null,
    };
  }

  // 일반: 주당 4건 미만인 가장 가까운 수요일 찾기
  let candidate = getNextWednesday(now);
  for (let i = 0; i < 12; i++) {
    const key = formatDate(candidate);
    const count = (weekGroups.get(key) || []).length;
    if (count < WEEKLY_QUOTA) {
      const deadline = new Date(candidate);
      deadline.setDate(deadline.getDate() - 1);
      return {
        deadline: formatDate(deadline),
        newsletterDate: key,
        bumped: null,
        bumpedNewDate: null,
      };
    }
    candidate = new Date(candidate);
    candidate.setDate(candidate.getDate() + 7);
  }

  // 12주 내 빈 슬롯이 없으면 다음 주
  const fallback = getNextWednesday(now);
  const deadlineFallback = new Date(fallback);
  deadlineFallback.setDate(deadlineFallback.getDate() - 1);
  return {
    deadline: formatDate(deadlineFallback),
    newsletterDate: formatDate(fallback),
    bumped: null,
    bumpedNewDate: null,
  };
}

function getNextWednesday(from: Date): Date {
  const d = new Date(from);
  const day = d.getDay();
  let daysUntilWed = (3 - day + 7) % 7;
  if (daysUntilWed === 0) daysUntilWed = 7;
  d.setDate(d.getDate() + daysUntilWed);
  return d;
}

// 주어진 날짜가 속한 주의 수요일
function getWednesdayOfWeek(d: Date): Date {
  const result = new Date(d);
  const day = result.getDay();
  const diff = 3 - day;
  result.setDate(result.getDate() + diff);
  return result;
}

function formatDate(d: Date): string {
  return d.toISOString().split("T")[0];
}
