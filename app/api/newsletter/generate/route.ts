import { NextResponse } from "next/server";
import { generateText } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import {
  getPageBlocks,
  blocksToMarkdown,
  extractFirstImage,
  queryEncyclopedia,
  queryNewsArchive,
} from "@/lib/notion";
import { buildNewsletterPrompt } from "@/lib/newsletter-prompt";
import { buildNewsletterHtml } from "@/lib/newsletter-template";
import type { NewsletterDraft, NewsletterSection } from "@/lib/types";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      mainId,
      nativeIds,
      newsIds,
      publishDate,
    } = body as {
      mainId: string;
      nativeIds: string[];
      newsIds: string[];
      publishDate: string;
    };

    // 모든 콘텐츠 메타데이터 조회 (제목, URL 등)
    const [encyclopedia, newsArchive] = await Promise.all([
      queryEncyclopedia(),
      queryNewsArchive(),
    ]);

    const mainItem = encyclopedia.find((i) => i.id === mainId);
    const nativeItems = nativeIds.map((id) => encyclopedia.find((i) => i.id === id));
    const newsItems = newsIds.map((id) => newsArchive.find((i) => i.id === id));

    if (!mainItem) {
      return NextResponse.json({ error: "메인 콘텐츠를 찾을 수 없습니다" }, { status: 400 });
    }

    // 모든 페이지 블록 병렬 조회
    const allIds = [mainId, ...nativeIds, ...newsIds];
    const allBlocks = await Promise.all(allIds.map((id) => getPageBlocks(id)));

    const mainBlocks = allBlocks[0];
    const nativeBlocks = allBlocks.slice(1, 1 + nativeIds.length);
    const newsBlocks = allBlocks.slice(1 + nativeIds.length);

    // 마크다운 변환
    const mainMarkdown = blocksToMarkdown(mainBlocks);
    const nativeMarkdowns = nativeBlocks.map((b) => blocksToMarkdown(b));
    const newsMarkdowns = newsBlocks.map((b) => blocksToMarkdown(b));

    // 이미지 추출 (만료 경고 포함)
    const mainImage = extractFirstImage(mainBlocks);
    const nativeImages = nativeBlocks.map((b) => extractFirstImage(b));
    const newsImages = newsBlocks.map((b) => extractFirstImage(b));

    const imageWarnings: string[] = [];
    if (mainImage?.isExpiring) imageWarnings.push("메인 콘텐츠");
    nativeImages.forEach((img, i) => {
      if (img?.isExpiring) imageWarnings.push(`사례 ${i + 1}`);
    });
    newsImages.forEach((img, i) => {
      if (img?.isExpiring) imageWarnings.push(`뉴스 ${i + 1}`);
    });

    // AI 프롬프트 생성 + 호출
    const prompt = buildNewsletterPrompt({
      main: { title: mainItem.title, markdown: mainMarkdown },
      natives: nativeIds.map((_, i) => ({
        title: nativeItems[i]?.title || "",
        markdown: nativeMarkdowns[i] || "",
      })),
      news: newsIds.map((_, i) => ({
        title: newsItems[i]?.title || "",
        markdown: newsMarkdowns[i] || "",
      })),
    });

    const { text } = await generateText({
      model: anthropic("claude-sonnet-4-20250514"),
      prompt,
      maxOutputTokens: 4000,
    });

    // JSON 파싱
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json({ error: "AI 응답을 파싱할 수 없습니다" }, { status: 500 });
    }

    const aiResult = JSON.parse(jsonMatch[0]);

    // NewsletterDraft 조립
    // CTA: 백과사전 → blogLink (슬래시페이지), 뉴스 → spLink (슬래시페이지) > sourceUrl (원문)
    const draft: NewsletterDraft = {
      publishDate,
      main: {
        partnerName: aiResult.main?.partnerName || "",
        title: aiResult.main?.title || mainItem.title,
        summary: aiResult.main?.summary || "",
        imageUrl: mainImage?.url || "",
        ctaUrl: mainItem.blogLink || mainItem.notionUrl,
      },
      natives: (aiResult.natives || []).map(
        (n: { title: string; summary: string }, i: number) => ({
          title: n.title || nativeItems[i]?.title || "",
          summary: n.summary || "",
          imageUrl: nativeImages[i]?.url || "",
          ctaUrl: nativeItems[i]?.blogLink || nativeItems[i]?.notionUrl || "",
        })
      ) as NewsletterSection[],
      news: (aiResult.news || []).map(
        (n: { title: string; summary: string }, i: number) => ({
          title: n.title || newsItems[i]?.title || "",
          summary: n.summary || "",
          imageUrl: newsImages[i]?.url || "",
          ctaUrl: newsItems[i]?.spLink || newsItems[i]?.sourceUrl || "",
        })
      ) as NewsletterSection[],
    };

    const html = buildNewsletterHtml(draft);

    return NextResponse.json({
      draft,
      html,
      imageWarnings: imageWarnings.length > 0
        ? `다음 섹션의 이미지는 Notion 호스팅(1시간 만료)입니다: ${imageWarnings.join(", ")}. 외부 이미지 URL로 교체를 권장합니다.`
        : null,
    });
  } catch (error) {
    console.error("Newsletter generate error:", error);
    return NextResponse.json(
      { error: "뉴스레터 생성에 실패했습니다" },
      { status: 500 }
    );
  }
}
