import { NextRequest, NextResponse } from "next/server";
import { after } from "next/server";
import { verifySlackRequest } from "@/lib/slack-verify";
import {
  sendMessage,
  getThreadMessages,
  getPermalink,
  getUserName,
  lookupUserByEmail,
} from "@/lib/slack";
import { queryEncyclopedia, createPage, getAllAuthors } from "@/lib/notion";
import {
  extractContentFromThread,
  extractMentionedUserIds,
  computeDeadlines,
  isUrgentContent,
} from "@/lib/extract";

// 슬랙 유저 ID → Notion people ID 매핑
async function resolveNotionAuthorIds(
  slackUserIds: string[],
  botUserId: string
): Promise<{ notionIds: string[]; names: string[] }> {
  // 봇 자신은 제외
  const filtered = slackUserIds.filter((id) => id !== botUserId);
  if (filtered.length === 0) return { notionIds: [], names: [] };

  // Notion DB에 등록된 모든 작성자 목록
  const notionAuthors = await getAllAuthors();

  const notionIds: string[] = [];
  const names: string[] = [];

  for (const slackId of filtered) {
    // 슬랙 유저 이름으로 Notion 작성자 매칭
    const slackName = await getUserName(slackId);

    // 이름 기반 매칭
    const match = notionAuthors.find(
      (a) =>
        a.name === slackName ||
        a.name.includes(slackName) ||
        slackName.includes(a.name)
    );

    if (match) {
      notionIds.push(match.id);
      names.push(match.name);
    } else {
      names.push(slackName);
    }
  }

  return { notionIds, names };
}

export async function POST(request: NextRequest) {
  const body = await request.text();
  const payload = JSON.parse(body);

  if (payload.type === "url_verification") {
    return NextResponse.json({ challenge: payload.challenge });
  }

  const timestamp = request.headers.get("x-slack-request-timestamp") || "";
  const signature = request.headers.get("x-slack-signature") || "";
  const signingSecret = process.env.SLACK_SIGNING_SECRET;

  if (!signingSecret) {
    return NextResponse.json({ error: "Not configured" }, { status: 500 });
  }

  if (!verifySlackRequest(signingSecret, timestamp, body, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  if (payload.type === "event_callback") {
    const event = payload.event;

    if (event.bot_id || event.subtype === "bot_message") {
      return NextResponse.json({ ok: true });
    }

    if (event.type === "app_mention") {
      const isInThread = event.thread_ts && event.thread_ts !== event.ts;

      if (isInThread) {
        // 스레드에서 @홍스무 멘션 → Notion 자동 등록
        after(async () => {
          try {
            const messages = await getThreadMessages(
              event.channel,
              event.thread_ts
            );
            if (messages.length === 0) return;

            const original = messages[0];
            const replies = await Promise.all(
              messages.slice(1).map(async (m) => {
                const name = await getUserName(m.user);
                return `${name}: ${m.text}`;
              })
            );

            // AI로 제목, 방향, 카테고리 추출
            const extracted = await extractContentFromThread(
              original.text,
              replies
            );

            // 스레드 전체 텍스트에서 멘션된 사용자 추출 (봇 제외)
            const allTexts = messages.map((m) => m.text);
            const mentionedSlackIds = extractMentionedUserIds(allTexts);
            const botUserId = payload.authorizations?.[0]?.user_id || "";
            const { notionIds, names } = await resolveNotionAuthorIds(
              mentionedSlackIds,
              botUserId
            );

            // 시의성 판단 + 기존 스케줄 확인
            const urgent = isUrgentContent(allTexts);
            const existingItems = await queryEncyclopedia();
            const { deadline, newsletterDate } = computeDeadlines(
              existingItems,
              urgent
            );

            // 슬랙 원본 링크
            const permalink = await getPermalink(
              event.channel,
              event.thread_ts
            );

            // Notion 페이지 생성
            const page = await createPage({
              title: extracted.title,
              category: extracted.category,
              deadline,
              newsletterDate,
              slackLink: permalink,
              direction: extracted.direction,
              authorIds: notionIds.length > 0 ? notionIds : undefined,
            });

            const pageId = (page as { id: string }).id;
            const notionUrl = `https://notion.so/${pageId.replace(/-/g, "")}`;

            // 확인 메시지
            let confirmText = `*[홍스무] Notion에 등록했습니다*\n`;
            confirmText += `> 제목: ${extracted.title}\n`;
            confirmText += `> 카테고리: ${extracted.category}\n`;
            if (names.length > 0) {
              confirmText += `> 담당자: ${names.join(", ")}\n`;
            }
            confirmText += `> 작성 기한: ${deadline}\n`;
            confirmText += `> 뉴스레터 발행일: ${newsletterDate}\n`;
            if (urgent) {
              confirmText += `> *시의성 중요 — 빠른 작성 필요*\n`;
            }
            confirmText += `> <${notionUrl}|Notion에서 보기>`;

            await sendMessage(event.channel, confirmText, {
              thread_ts: event.thread_ts,
            });
          } catch (error) {
            console.error("Failed to create Notion page:", error);
            await sendMessage(
              event.channel,
              `*[홍스무]* 등록 중 오류가 발생했습니다. 수동으로 등록해주세요.`,
              { thread_ts: event.thread_ts }
            );
          }
        });
      } else {
        // 일반 채널에서 @홍스무 멘션 → 현황 요약
        after(async () => {
          try {
            const items = await queryEncyclopedia();
            const spBefore = items.filter(
              (i) => i.spStatus === "발행 전"
            ).length;
            const spRequested = items.filter(
              (i) => i.spStatus === "발행 요청"
            ).length;
            const spDone = items.filter(
              (i) => i.spStatus === "발행 완"
            ).length;

            const now = new Date();
            now.setHours(0, 0, 0, 0);
            const urgent = items.filter((i) => {
              if (!i.deadline || i.spStatus === "발행 완") return false;
              const d = new Date(i.deadline);
              d.setHours(0, 0, 0, 0);
              const diff = Math.ceil(
                (d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
              );
              return diff <= 3;
            });

            let text = `*[홍스무] AI 백과사전 현황*\n`;
            text += `> 블로그: 발행 완 ${spDone} | 발행 요청 ${spRequested} | 대기 ${spBefore}\n`;
            text += `> 전체 ${items.length}건\n`;

            if (urgent.length > 0) {
              text += `\n*마감 임박 (D-3 이내)*\n`;
              for (const u of urgent) {
                const authors =
                  u.authors.map((a) => a.name).join(", ") || "미배정";
                text += `> - ${u.title} (${authors}, 마감: ${u.deadline})\n`;
              }
            }

            await sendMessage(event.channel, text);
          } catch (error) {
            console.error("Failed to respond to mention:", error);
          }
        });
      }
    }
  }

  return NextResponse.json({ ok: true });
}
