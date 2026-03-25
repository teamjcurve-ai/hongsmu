import { NextRequest, NextResponse } from "next/server";
import { verifySlackRequest } from "@/lib/slack-verify";
import { sendMessage } from "@/lib/slack";
import { queryEncyclopedia } from "@/lib/notion";
import { after } from "next/server";

export async function POST(request: NextRequest) {
  const body = await request.text();
  const payload = JSON.parse(body);

  // URL verification challenge — 서명 검증 전에 처리 (최초 설정용)
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

  // Event callback
  if (payload.type === "event_callback") {
    const event = payload.event;

    // 봇 멘션 시 현황 요약 응답
    if (event.type === "app_mention") {
      // 3초 내 200 반환, 실제 처리는 after()로
      after(async () => {
        try {
          const items = await queryEncyclopedia();
          const spBefore = items.filter((i) => i.spStatus === "발행 전").length;
          const spRequested = items.filter((i) => i.spStatus === "발행 요청").length;
          const spDone = items.filter((i) => i.spStatus === "발행 완").length;

          // 마감 임박 항목
          const now = new Date();
          now.setHours(0, 0, 0, 0);
          const urgent = items.filter((i) => {
            if (!i.deadline || i.spStatus === "발행 완") return false;
            const d = new Date(i.deadline);
            d.setHours(0, 0, 0, 0);
            const diff = Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
            return diff <= 3;
          });

          let text = `*[홍스무] AI 백과사전 현황*\n`;
          text += `> 블로그: 발행 완 ${spDone} | 발행 요청 ${spRequested} | 대기 ${spBefore}\n`;
          text += `> 전체 ${items.length}건\n`;

          if (urgent.length > 0) {
            text += `\n*마감 임박 (D-3 이내)*\n`;
            for (const u of urgent) {
              const authors = u.authors.map((a) => a.name).join(", ") || "미배정";
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
