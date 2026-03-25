import { generateText } from "ai";
import { anthropic } from "@ai-sdk/anthropic";

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

// 시의성 판단 → 마감일 계산
export function computeDeadlines(
  isUrgent: boolean
): { deadline: string; newsletterDate: string } {
  const now = new Date();

  if (isUrgent) {
    // 시의성 중요: 3일 후 작성 기한, 그 다음 수요일 발행
    const deadline = new Date(now);
    deadline.setDate(deadline.getDate() + 3);

    const newsletterDate = getNextWednesday(deadline);
    return {
      deadline: formatDate(deadline),
      newsletterDate: formatDate(newsletterDate),
    };
  }

  // 기본: 다음 수요일 발행, 그 전날(화요일) 작성 기한
  const nextWed = getNextWednesday(now);
  const deadline = new Date(nextWed);
  deadline.setDate(deadline.getDate() - 1);

  return {
    deadline: formatDate(deadline),
    newsletterDate: formatDate(nextWed),
  };
}

function getNextWednesday(from: Date): Date {
  const d = new Date(from);
  const day = d.getDay(); // 0=일, 3=수
  let daysUntilWed = (3 - day + 7) % 7;
  if (daysUntilWed === 0) daysUntilWed = 7; // 이미 수요일이면 다음 주
  d.setDate(d.getDate() + daysUntilWed);
  return d;
}

function formatDate(d: Date): string {
  return d.toISOString().split("T")[0];
}
