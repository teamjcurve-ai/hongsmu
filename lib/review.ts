import { generateText } from "ai";
import { anthropic } from "@ai-sdk/anthropic";

export interface ReviewResult {
  pageId: string;
  title: string;
  score: number; // 0-100
  charCount: number;
  headingCount: number;
  imageCount: number;
  issues: ReviewIssue[];
  passed: boolean;
  reviewedAt: string;
}

export interface ReviewIssue {
  type: "error" | "warning" | "info";
  category: "typo" | "structure" | "image" | "seo" | "length";
  message: string;
}

// Notion 블록을 마크다운으로 변환 (검수용 간소 버전)
export function blocksToMarkdown(
  blocks: Array<{ type: string; [key: string]: unknown }>
): string {
  const lines: string[] = [];

  for (const block of blocks) {
    const type = block.type;
    const data = block[type] as Record<string, unknown> | undefined;
    if (!data) continue;

    const richText = (data.rich_text as Array<{ plain_text: string }>) || [];
    const text = richText.map((t) => t.plain_text).join("");

    switch (type) {
      case "heading_1":
        lines.push(`# ${text}`);
        break;
      case "heading_2":
        lines.push(`## ${text}`);
        break;
      case "heading_3":
        lines.push(`### ${text}`);
        break;
      case "paragraph":
        lines.push(text);
        break;
      case "bulleted_list_item":
        lines.push(`- ${text}`);
        break;
      case "numbered_list_item":
        lines.push(`1. ${text}`);
        break;
      case "quote":
        lines.push(`> ${text}`);
        break;
      case "code": {
        const lang = (data.language as string) || "";
        lines.push(`\`\`\`${lang}\n${text}\n\`\`\``);
        break;
      }
      case "image": {
        const imgData = data as {
          type?: string;
          file?: { url?: string };
          external?: { url?: string };
          caption?: Array<{ plain_text: string }>;
        };
        const url =
          imgData.type === "file"
            ? imgData.file?.url
            : imgData.external?.url;
        const caption =
          imgData.caption?.map((c) => c.plain_text).join("") || "";
        lines.push(`![${caption}](${url || ""})`);
        break;
      }
      case "divider":
        lines.push("---");
        break;
      default:
        if (text) lines.push(text);
    }
  }

  return lines.join("\n\n");
}

// 구조 검사 (AI 없이)
function checkStructure(
  markdown: string,
  blocks: Array<{ type: string; [key: string]: unknown }>
): { issues: ReviewIssue[]; charCount: number; headingCount: number; imageCount: number } {
  const issues: ReviewIssue[] = [];

  // 글자 수 (마크다운 문법 제외 순수 텍스트)
  const plainText = markdown
    .replace(/^#+\s/gm, "")
    .replace(/!\[.*?\]\(.*?\)/g, "")
    .replace(/\[.*?\]\(.*?\)/g, "")
    .replace(/[*_~`]/g, "")
    .replace(/^[->\s]+/gm, "")
    .trim();
  const charCount = plainText.replace(/\s/g, "").length;

  if (charCount < 1000) {
    issues.push({
      type: "warning",
      category: "length",
      message: `본문이 ${charCount}자입니다. 최소 1,000자 이상을 권장합니다.`,
    });
  }

  // H2 헤딩 수
  const h2Matches = markdown.match(/^## .+/gm) || [];
  const headingCount = h2Matches.length;

  if (headingCount < 3) {
    issues.push({
      type: "warning",
      category: "structure",
      message: `H2 헤딩이 ${headingCount}개입니다. 최소 3개 이상 사용을 권장합니다.`,
    });
  }

  // 이미지 수
  const imageBlocks = blocks.filter((b) => b.type === "image");
  const imageCount = imageBlocks.length;

  if (imageCount < headingCount) {
    issues.push({
      type: "warning",
      category: "image",
      message: `이미지가 ${imageCount}장인데 헤딩이 ${headingCount}개입니다. 문단별 이미지 1장씩 권장합니다.`,
    });
  }

  if (imageCount === 0) {
    issues.push({
      type: "error",
      category: "image",
      message: "이미지가 하나도 없습니다. 문단별 최소 1장의 이미지를 넣어주세요.",
    });
  }

  // 이미지 alt 텍스트 체크
  for (let i = 0; i < imageBlocks.length; i++) {
    const imgData = imageBlocks[i].image as {
      caption?: Array<{ plain_text: string }>;
    } | undefined;
    const caption =
      imgData?.caption?.map((c) => c.plain_text).join("") || "";
    if (!caption.trim()) {
      issues.push({
        type: "warning",
        category: "image",
        message: `${i + 1}번째 이미지에 alt 텍스트(캡션)가 없습니다. SEO를 위해 추가해주세요.`,
      });
    }
  }

  return { issues, charCount, headingCount, imageCount };
}

// AI 기반 오탈자 + SEO 검수
async function checkWithAI(markdown: string): Promise<ReviewIssue[]> {
  const prompt = `다음 블로그 글을 검수해주세요. 오탈자, 맞춤법, SEO/GEO 관점에서 분석합니다.

[블로그 글]
${markdown.slice(0, 8000)}

다음 JSON 배열 형식으로만 응답해주세요. 설명 없이 JSON만:
[
  {"type": "error|warning|info", "category": "typo|seo", "message": "구체적인 지적 내용"}
]

검수 기준:
1. 오탈자/맞춤법 오류 (type: "error", category: "typo")
2. 띄어쓰기 오류 (type: "warning", category: "typo")
3. SEO: 제목에 키워드 포함 여부, 메타 설명 가능 여부, 내부/외부 링크 유무 (type: "info", category: "seo")
4. GEO: AI 검색엔진이 인용하기 좋은 구조인지 (명확한 정의, Q&A 형식, 구조화된 답변) (type: "info", category: "seo")

발견된 것만 응답하세요. 없으면 빈 배열 [].`;

  const { text } = await generateText({
    model: anthropic("claude-sonnet-4-20250514"),
    prompt,
    maxOutputTokens: 1500,
  });

  const jsonMatch = text.match(/\[[\s\S]*\]/);
  if (!jsonMatch) return [];

  try {
    const parsed = JSON.parse(jsonMatch[0]);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

// Notion 페이지 블록 조회
async function getPageBlocks(
  pageId: string
): Promise<Array<{ type: string; [key: string]: unknown }>> {
  const NOTION_API_KEY = process.env.TEAMJCURVE_NOTION_API_KEY!;
  const blocks: Array<{ type: string; [key: string]: unknown }> = [];
  let cursor: string | undefined = undefined;
  let hasMore = true;

  while (hasMore) {
    const endpoint: string = `https://api.notion.com/v1/blocks/${pageId}/children?page_size=100${cursor ? `&start_cursor=${cursor}` : ""}`;
    const res = await fetch(endpoint, {
      headers: {
        Authorization: `Bearer ${NOTION_API_KEY}`,
        "Notion-Version": "2022-06-28",
      },
    });
    const data = await res.json();
    blocks.push(...(data.results || []));
    hasMore = data.has_more;
    cursor = data.next_cursor ?? undefined;
  }

  return blocks;
}

// 메인 검수 함수
export async function reviewContent(
  pageId: string,
  title: string
): Promise<ReviewResult> {
  const blocks = await getPageBlocks(pageId);
  const markdown = blocksToMarkdown(blocks);

  // 구조 검사
  const structure = checkStructure(markdown, blocks);

  // AI 검수
  const aiIssues = await checkWithAI(markdown);

  const allIssues = [...structure.issues, ...aiIssues];
  const errorCount = allIssues.filter((i) => i.type === "error").length;
  const warningCount = allIssues.filter((i) => i.type === "warning").length;

  // 점수 계산 (100점 기준, error -15, warning -5)
  const score = Math.max(0, 100 - errorCount * 15 - warningCount * 5);

  return {
    pageId,
    title,
    score,
    charCount: structure.charCount,
    headingCount: structure.headingCount,
    imageCount: structure.imageCount,
    issues: allIssues,
    passed: errorCount === 0 && score >= 60,
    reviewedAt: new Date().toISOString(),
  };
}
