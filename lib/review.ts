import { generateText } from "ai";
import { anthropic } from "@ai-sdk/anthropic";

export interface ReviewResult {
  pageId: string;
  title: string;
  score: number;
  charCount: number;
  headingCount: number;
  imageCount: number;
  issues: ReviewIssue[];
  autoFixed: AutoFix[];
  humanRequired: string[];
  passed: boolean;
  reviewedAt: string;
}

export interface ReviewIssue {
  type: "error" | "warning" | "info";
  category: "typo" | "structure" | "image" | "seo" | "length";
  message: string;
}

export interface AutoFix {
  blockId: string;
  description: string;
  before: string;
  after: string;
}

// Notion 블록을 마크다운으로 변환
export function blocksToMarkdown(
  blocks: Array<{ id: string; type: string; [key: string]: unknown }>
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

// 구조 검사
function checkStructure(
  markdown: string,
  blocks: Array<{ id: string; type: string; [key: string]: unknown }>
): {
  issues: ReviewIssue[];
  humanRequired: string[];
  charCount: number;
  headingCount: number;
  imageCount: number;
  imageBlocksMissingAlt: Array<{ id: string; index: number }>;
} {
  const issues: ReviewIssue[] = [];
  const humanRequired: string[] = [];

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
    humanRequired.push(`분량이 ${charCount}자로 부족합니다. 1,000자 이상으로 보충해주세요.`);
  }

  const h2Matches = markdown.match(/^## .+/gm) || [];
  const headingCount = h2Matches.length;

  if (headingCount < 3) {
    issues.push({
      type: "warning",
      category: "structure",
      message: `H2 헤딩이 ${headingCount}개입니다. 최소 3개 이상 사용을 권장합니다.`,
    });
    humanRequired.push(`H2 헤딩이 ${headingCount}개뿐입니다. 3개 이상으로 구조를 나눠주세요.`);
  }

  const imageBlocks = blocks.filter((b) => b.type === "image");
  const imageCount = imageBlocks.length;

  if (imageCount < headingCount) {
    issues.push({
      type: "warning",
      category: "image",
      message: `이미지가 ${imageCount}장인데 헤딩이 ${headingCount}개입니다. 문단별 이미지 1장씩 권장합니다.`,
    });
    humanRequired.push(`이미지가 ${imageCount}장으로 부족합니다. 문단별 1장씩 넣어주세요.`);
  }

  if (imageCount === 0) {
    issues.push({
      type: "error",
      category: "image",
      message: "이미지가 하나도 없습니다.",
    });
    humanRequired.push("이미지가 하나도 없습니다. 문단별 최소 1장의 이미지를 넣어주세요.");
  }

  const imageBlocksMissingAlt: Array<{ id: string; index: number }> = [];
  for (let i = 0; i < imageBlocks.length; i++) {
    const imgData = imageBlocks[i].image as {
      caption?: Array<{ plain_text: string }>;
    } | undefined;
    const caption = imgData?.caption?.map((c) => c.plain_text).join("") || "";
    if (!caption.trim()) {
      imageBlocksMissingAlt.push({ id: imageBlocks[i].id, index: i + 1 });
      issues.push({
        type: "warning",
        category: "image",
        message: `${i + 1}번째 이미지에 alt 텍스트(캡션)가 없습니다.`,
      });
    }
  }

  return { issues, humanRequired, charCount, headingCount, imageCount, imageBlocksMissingAlt };
}

// AI 기반 오탈자 검수 + 수정안 생성
async function checkAndFixWithAI(
  blocks: Array<{ id: string; type: string; [key: string]: unknown }>
): Promise<{ issues: ReviewIssue[]; fixes: Array<{ blockId: string; original: string; fixed: string; description: string }> }> {
  // 텍스트 블록만 추출
  const textBlocks: Array<{ id: string; type: string; text: string }> = [];
  for (const block of blocks) {
    const data = block[block.type] as Record<string, unknown> | undefined;
    if (!data) continue;
    const richText = (data.rich_text as Array<{ plain_text: string }>) || [];
    const text = richText.map((t) => t.plain_text).join("");
    if (text.trim()) {
      textBlocks.push({ id: block.id, type: block.type, text });
    }
  }

  if (textBlocks.length === 0) return { issues: [], fixes: [] };

  const blocksJson = textBlocks.map((b) => ({
    id: b.id,
    type: b.type,
    text: b.text,
  }));

  const prompt = `다음은 블로그 글의 텍스트 블록들입니다. 각 블록의 오탈자, 맞춤법, 띄어쓰기 오류를 찾아 수정안을 제시해주세요.
또한 SEO/GEO 관점에서 개선점도 알려주세요.

[블록 목록]
${JSON.stringify(blocksJson, null, 2)}

다음 JSON 형식으로만 응답해주세요:
{
  "fixes": [
    {"blockId": "블록ID", "original": "원문 문장", "fixed": "수정된 문장", "description": "수정 이유"}
  ],
  "seo": [
    {"type": "info", "message": "SEO/GEO 관련 제안"}
  ]
}

주의:
- 오탈자가 있는 블록만 fixes에 포함하세요.
- 수정이 필요 없으면 fixes는 빈 배열.
- fixed에는 해당 블록의 전체 텍스트를 수정된 버전으로 넣어주세요.`;

  const { text } = await generateText({
    model: anthropic("claude-sonnet-4-20250514"),
    prompt,
    maxOutputTokens: 2000,
  });

  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return { issues: [], fixes: [] };

  try {
    const parsed = JSON.parse(jsonMatch[0]);
    const issues: ReviewIssue[] = [];
    const fixes: Array<{ blockId: string; original: string; fixed: string; description: string }> = [];

    for (const fix of parsed.fixes || []) {
      issues.push({
        type: "error",
        category: "typo",
        message: `${fix.description}: "${fix.original}" → "${fix.fixed}"`,
      });
      fixes.push(fix);
    }

    for (const seo of parsed.seo || []) {
      issues.push({
        type: "info",
        category: "seo",
        message: seo.message,
      });
    }

    return { issues, fixes };
  } catch {
    return { issues: [], fixes: [] };
  }
}

// AI로 이미지 alt 텍스트 생성
async function generateAltTexts(
  blocks: Array<{ id: string; type: string; [key: string]: unknown }>,
  missingAltBlocks: Array<{ id: string; index: number }>,
  markdown: string
): Promise<Array<{ blockId: string; altText: string }>> {
  if (missingAltBlocks.length === 0) return [];

  const prompt = `다음 블로그 글에 이미지가 ${missingAltBlocks.length}장 있는데 alt 텍스트가 없습니다.
글의 맥락을 바탕으로 각 이미지에 적절한 alt 텍스트를 생성해주세요.

[블로그 글]
${markdown.slice(0, 4000)}

[alt 텍스트가 없는 이미지]
${missingAltBlocks.map((b) => `${b.index}번째 이미지 (blockId: ${b.id})`).join("\n")}

다음 JSON 배열로만 응답해주세요:
[{"blockId": "블록ID", "altText": "생성된 alt 텍스트 (20자 이내, 한국어)"}]`;

  const { text } = await generateText({
    model: anthropic("claude-sonnet-4-20250514"),
    prompt,
    maxOutputTokens: 500,
  });

  const jsonMatch = text.match(/\[[\s\S]*\]/);
  if (!jsonMatch) return [];

  try {
    return JSON.parse(jsonMatch[0]);
  } catch {
    return [];
  }
}

// Notion 블록 텍스트 수정
async function updateBlockText(blockId: string, newText: string, blockType: string) {
  const NOTION_API_KEY = process.env.TEAMJCURVE_NOTION_API_KEY!;
  await fetch(`https://api.notion.com/v1/blocks/${blockId}`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${NOTION_API_KEY}`,
      "Notion-Version": "2022-06-28",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      [blockType]: {
        rich_text: [{ type: "text", text: { content: newText } }],
      },
    }),
  });
}

// Notion 이미지 캡션 수정
async function updateImageCaption(blockId: string, caption: string) {
  const NOTION_API_KEY = process.env.TEAMJCURVE_NOTION_API_KEY!;
  await fetch(`https://api.notion.com/v1/blocks/${blockId}`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${NOTION_API_KEY}`,
      "Notion-Version": "2022-06-28",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      image: {
        caption: [{ type: "text", text: { content: caption } }],
      },
    }),
  });
}

// Notion 페이지 블록 조회
async function getPageBlocks(
  pageId: string
): Promise<Array<{ id: string; type: string; [key: string]: unknown }>> {
  const NOTION_API_KEY = process.env.TEAMJCURVE_NOTION_API_KEY!;
  const blocks: Array<{ id: string; type: string; [key: string]: unknown }> = [];
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

// 메인 검수 + 자동 수정
export async function reviewContent(
  pageId: string,
  title: string
): Promise<ReviewResult> {
  const blocks = await getPageBlocks(pageId);
  const markdown = blocksToMarkdown(blocks);

  // 구조 검사
  const structure = checkStructure(markdown, blocks);

  // AI 오탈자 검수 + 수정안
  const aiResult = await checkAndFixWithAI(blocks);

  // 자동 수정 실행
  const autoFixed: AutoFix[] = [];

  // 1. 오탈자 자동 수정
  for (const fix of aiResult.fixes) {
    try {
      const block = blocks.find((b) => b.id === fix.blockId);
      if (block) {
        await updateBlockText(fix.blockId, fix.fixed, block.type);
        autoFixed.push({
          blockId: fix.blockId,
          description: fix.description,
          before: fix.original,
          after: fix.fixed,
        });
      }
    } catch (error) {
      console.error(`Failed to fix block ${fix.blockId}:`, error);
    }
  }

  // 2. alt 텍스트 자동 생성 + 적용
  if (structure.imageBlocksMissingAlt.length > 0) {
    const altTexts = await generateAltTexts(
      blocks,
      structure.imageBlocksMissingAlt,
      markdown
    );
    for (const alt of altTexts) {
      try {
        await updateImageCaption(alt.blockId, alt.altText);
        autoFixed.push({
          blockId: alt.blockId,
          description: "이미지 alt 텍스트 자동 생성",
          before: "(없음)",
          after: alt.altText,
        });
      } catch (error) {
        console.error(`Failed to set alt text for ${alt.blockId}:`, error);
      }
    }
  }

  const allIssues = [...structure.issues, ...aiResult.issues];
  const errorCount = allIssues.filter((i) => i.type === "error").length;
  const warningCount = allIssues.filter((i) => i.type === "warning").length;
  const score = Math.max(0, 100 - errorCount * 15 - warningCount * 5);

  // 자동 수정한 항목은 issue에서 제거하지 않지만, 수정 완료 표시
  const humanRequired = structure.humanRequired;

  return {
    pageId,
    title,
    score,
    charCount: structure.charCount,
    headingCount: structure.headingCount,
    imageCount: structure.imageCount,
    issues: allIssues,
    autoFixed,
    humanRequired,
    passed: errorCount === 0 && score >= 60,
    reviewedAt: new Date().toISOString(),
  };
}
