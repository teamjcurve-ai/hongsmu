import { NextRequest, NextResponse } from "next/server";
import { reviewContent } from "@/lib/review";
import { sendDM, lookupUserByEmail } from "@/lib/slack";
import type { Author } from "@/lib/types";

function buildFeedbackMessage(
  authorName: string,
  title: string,
  notionUrl: string,
  autoFixed: Array<{ description: string; before: string; after: string }>,
  humanRequired: string[]
): string {
  let text = `${authorName}님! 이번에 작성하신 '${title}' 콘텐츠에 대한 피드백을 공유해 드립니다.\n\n`;

  if (autoFixed.length > 0) {
    const fixSummary = autoFixed.map((f) => f.description).join(", ");
    if (humanRequired.length > 0) {
      text += `제가 *${fixSummary}* 은 고쳤는데, 아래 사항은 직접 수정해주셔야 합니다.\n\n`;
    } else {
      text += `제가 *${fixSummary}* 을 수정해두었습니다. 확인 부탁드립니다.\n\n`;
    }

    text += `*자동 수정 내역*\n`;
    for (const fix of autoFixed) {
      text += `> ${fix.description}: "${fix.before}" → "${fix.after}"\n`;
    }
    text += `\n`;
  }

  if (humanRequired.length > 0) {
    text += `*직접 수정이 필요한 사항*\n`;
    for (const item of humanRequired) {
      text += `> - ${item}\n`;
    }
    text += `\n`;
  }

  if (autoFixed.length === 0 && humanRequired.length === 0) {
    text += `검수 결과, 수정할 사항이 없습니다. 잘 작성해주셨습니다.\n\n`;
  }

  text += `<${notionUrl}|노션에서 확인하기>`;

  return text;
}

export async function POST(request: NextRequest) {
  try {
    const { pageId, title, authors, notionUrl } = await request.json();

    if (!pageId || !title) {
      return NextResponse.json(
        { error: "pageId and title are required" },
        { status: 400 }
      );
    }

    const result = await reviewContent(pageId, title);

    // 담당자에게 피드백 DM 발송
    if (authors && Array.isArray(authors) && authors.length > 0) {
      const hasFixOrIssue =
        result.autoFixed.length > 0 || result.humanRequired.length > 0;

      if (hasFixOrIssue) {
        for (const author of authors as Author[]) {
          if (!author.email) continue;
          const slackUserId = await lookupUserByEmail(author.email);
          if (slackUserId) {
            const feedbackText = buildFeedbackMessage(
              author.name,
              title,
              notionUrl || `https://notion.so/${pageId.replace(/-/g, "")}`,
              result.autoFixed,
              result.humanRequired
            );
            try {
              await sendDM(slackUserId, feedbackText);
            } catch (error) {
              console.error(`Feedback DM failed for ${author.name}:`, error);
            }
          }
        }
      }
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Review failed:", error);
    return NextResponse.json(
      { error: "Review failed" },
      { status: 500 }
    );
  }
}
