import { NextResponse } from "next/server";
import { generateText } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { put } from "@vercel/blob";
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
import { convertSpLink } from "@/lib/slashpage";

// Notion 임시 이미지를 Vercel Blob에 업로드하여 영구 URL 반환
async function persistImage(
  imageResult: { url: string; isExpiring: boolean } | null,
  label: string
): Promise<string> {
  if (!imageResult || !imageResult.url) return "";
  if (!imageResult.isExpiring) return imageResult.url; // 외부 URL은 그대로

  try {
    const res = await fetch(imageResult.url);
    if (!res.ok) return imageResult.url;
    const blob = await res.blob();
    const ext = blob.type.includes("png") ? "png" : blob.type.includes("webp") ? "webp" : "jpg";
    const filename = `newsletter/${label}-${Date.now()}.${ext}`;
    const { url } = await put(filename, blob, { access: "public" });
    return url;
  } catch {
    return imageResult.url; // 실패 시 원본 URL 그대로
  }
}

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

    // 이미지 추출 + Vercel Blob에 영구화
    const mainImageRaw = extractFirstImage(mainBlocks);
    const nativeImagesRaw = nativeBlocks.map((b) => extractFirstImage(b));
    const newsImagesRaw = newsBlocks.map((b) => extractFirstImage(b));

    const [mainImageUrl, ...restImageUrls] = await Promise.all([
      persistImage(mainImageRaw, "main"),
      ...nativeImagesRaw.map((img, i) => persistImage(img, `native-${i}`)),
      ...newsImagesRaw.map((img, i) => persistImage(img, `news-${i}`)),
    ]);
    const nativeImageUrls = restImageUrls.slice(0, nativeIds.length);
    const newsImageUrls = restImageUrls.slice(nativeIds.length);

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
        imageUrl: mainImageUrl,
        ctaUrl: convertSpLink(mainItem.blogLink || mainItem.spLink, mainItem.category),
      },
      natives: (aiResult.natives || []).map(
        (n: { title: string; summary: string }, i: number) => ({
          title: n.title || nativeItems[i]?.title || "",
          summary: n.summary || "",
          imageUrl: nativeImageUrls[i] || "",
          ctaUrl: convertSpLink(nativeItems[i]?.blogLink || nativeItems[i]?.spLink || null, nativeItems[i]?.category || []),
        })
      ) as NewsletterSection[],
      news: (aiResult.news || []).map(
        (n: { title: string; summary: string }, i: number) => ({
          title: n.title || newsItems[i]?.title || "",
          summary: n.summary || "",
          imageUrl: newsImageUrls[i] || "",
          ctaUrl: newsItems[i]?.spLink
            ? convertSpLink(newsItems[i]!.spLink, newsItems[i]!.tags)
            : newsItems[i]?.sourceUrl || "",
        })
      ) as NewsletterSection[],
    };

    const html = buildNewsletterHtml(draft);

    return NextResponse.json({ draft, html });
  } catch (error) {
    console.error("Newsletter generate error:", error);
    return NextResponse.json(
      { error: "뉴스레터 생성에 실패했습니다" },
      { status: 500 }
    );
  }
}
