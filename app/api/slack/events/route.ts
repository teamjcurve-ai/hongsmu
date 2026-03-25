import { NextRequest, NextResponse } from "next/server";
import { after } from "next/server";
import { verifySlackRequest } from "@/lib/slack-verify";
import {
  sendMessage,
  getThreadMessages,
  getPermalink,
  getUserName,
} from "@/lib/slack";
import { queryEncyclopedia, createPage } from "@/lib/notion";
import { extractContentFromThread } from "@/lib/extract";

const OSMU_CHANNEL = process.env.SLACK_CHANNEL_OSMU_RAW;

export async function POST(request: NextRequest) {
  const body = await request.text();
  const payload = JSON.parse(body);

  // URL verification challenge
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

    // 봇 자신의 메시지는 무시
    if (event.bot_id || event.subtype === "bot_message") {
      return NextResponse.json({ ok: true });
    }

    // 스레드 메시지에서 "등록" 감지 → Notion 페이지 자동 생성
    if (
      event.type === "message" &&
      event.thread_ts &&
      event.thread_ts !== event.ts &&
      event.channel === OSMU_CHANNEL &&
      event.text?.includes("등록")
    ) {
      after(async () => {
        try {
          // 스레드 전체 메시지 가져오기
          const messages = await getThreadMessages(
            event.channel,
            event.thread_ts
          );

          if (messages.length === 0) return;

          // 원본 메시지 (스레드 첫 번째)
          const original = messages[0];
          // 스레드 답글들 (사용자 이름으로 변환)
          const replies = await Promise.all(
            messages.slice(1).map(async (m) => {
              const name = await getUserName(m.user);
              return `${name}: ${m.text}`;
            })
          );

          // AI로 콘텐츠 정보 추출
          const extracted = await extractContentFromThread(
            original.text,
            replies
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
            deadline: extracted.deadline,
            slackLink: permalink,
            direction: extracted.direction,
          });

          const pageId = (page as { id: string }).id;
          const notionUrl = `https://notion.so/${pageId.replace(/-/g, "")}`;

          // 스레드에 확인 메시지
          let confirmText = `*[홍스무] Notion에 등록했습니다*\n`;
          confirmText += `> 제목: ${extracted.title}\n`;
          confirmText += `> 카테고리: ${extracted.category}\n`;
          if (extracted.assignees.length > 0) {
            confirmText += `> 담당자: ${extracted.assignees.join(", ")}\n`;
          }
          if (extracted.deadline) {
            confirmText += `> 마감: ${extracted.deadline}\n`;
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
    }

    // 봇 멘션 시 현황 요약 응답
    if (event.type === "app_mention") {
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

  return NextResponse.json({ ok: true });
}
