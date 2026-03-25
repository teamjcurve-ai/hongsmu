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
  assignees: string[];
  direction: string;
  category: string;
  deadline: string | null;
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
  "assignees": ["담당자 이름 배열 (스레드에서 언급된 사람)"],
  "direction": "콘텐츠 방향 요약 (2-3문장)",
  "category": "카테고리 (다음 중 하나: ${CATEGORIES.join(", ")})",
  "deadline": "마감일 (YYYY-MM-DD 형식, 언급 없으면 null)"
}`;

  const { text } = await generateText({
    model: anthropic("claude-sonnet-4-20250514"),
    prompt,
    maxOutputTokens: 500,
  });

  // JSON 파싱
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("Failed to extract JSON from response");
  }

  const parsed = JSON.parse(jsonMatch[0]);

  // 카테고리 검증
  if (!CATEGORIES.includes(parsed.category)) {
    parsed.category = "인사이트"; // 기본값
  }

  return {
    title: parsed.title || "(제목 미정)",
    assignees: Array.isArray(parsed.assignees) ? parsed.assignees : [],
    direction: parsed.direction || "",
    category: parsed.category,
    deadline: parsed.deadline || null,
  };
}
