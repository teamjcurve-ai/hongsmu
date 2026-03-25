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

// 기존 스케줄을 확인해서 발행일 + 작성 기한 계산
export function computeDeadlines(
  existingItems: ContentItem[],
  isUrgent: boolean
): { deadline: string; newsletterDate: string } {
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  if (isUrgent) {
    // 시의성 중요: 가장 가까운 수요일에 강제 배정 (슬롯 무시)
    const nextWed = getNextWednesday(now);
    const deadline = new Date(nextWed);
    deadline.setDate(deadline.getDate() - 1);
    return {
      deadline: formatDate(deadline),
      newsletterDate: formatDate(nextWed),
    };
  }

  // 일반: 주당 4건 미만인 가장 가까운 수요일 찾기
  // 기존 콘텐츠의 발행일별 카운트
  const weekCounts = new Map<string, number>();
  for (const item of existingItems) {
    if (item.newsletterDate) {
      const wed = formatDate(getWednesdayOfWeek(new Date(item.newsletterDate)));
      weekCounts.set(wed, (weekCounts.get(wed) || 0) + 1);
    }
  }

  // 이번 주 수요일부터 최대 12주 앞까지 빈 슬롯 탐색
  let candidate = getNextWednesday(now);
  for (let i = 0; i < 12; i++) {
    const key = formatDate(candidate);
    const count = weekCounts.get(key) || 0;
    if (count < WEEKLY_QUOTA) {
      const deadline = new Date(candidate);
      deadline.setDate(deadline.getDate() - 1);
      return {
        deadline: formatDate(deadline),
        newsletterDate: key,
      };
    }
    // 다음 주 수요일
    candidate = new Date(candidate);
    candidate.setDate(candidate.getDate() + 7);
  }

  // 12주 내 빈 슬롯이 없으면 그냥 다음 주 수요일
  const fallback = getNextWednesday(now);
  const deadline = new Date(fallback);
  deadline.setDate(deadline.getDate() - 1);
  return {
    deadline: formatDate(deadline),
    newsletterDate: formatDate(fallback),
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
