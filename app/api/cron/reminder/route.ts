import { NextRequest, NextResponse } from "next/server";
import { queryEncyclopedia } from "@/lib/notion";
import { sendDM, lookupUserByEmail, sendMessage } from "@/lib/slack";

const GPTS_LINK =
  "https://chatgpt.com/g/g-696edb75c0148191811cdf8e60685e45-timjeikeobeu-ai-native-beulrogeu-gihoeg-coan-jejagbos";

export async function GET(request: NextRequest) {
  // Vercel Cron 인증
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const items = await queryEncyclopedia();
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    // 마감 D-3 이내 + 아직 발행 완이 아닌 항목
    const urgent = items.filter((i) => {
      if (!i.deadline || i.spStatus === "발행 완") return false;
      const d = new Date(i.deadline);
      d.setHours(0, 0, 0, 0);
      const diff = Math.ceil(
        (d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      );
      return diff <= 3;
    });

    if (urgent.length === 0) {
      return NextResponse.json({ message: "No urgent items", sent: 0 });
    }

    let sentCount = 0;

    for (const item of urgent) {
      const d = new Date(item.deadline!);
      d.setHours(0, 0, 0, 0);
      const diff = Math.ceil(
        (d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      );
      const dday =
        diff < 0
          ? `D+${Math.abs(diff)}`
          : diff === 0
            ? "D-Day"
            : `D-${diff}`;

      const text =
        `*[홍스무 리마인더]* ${dday}\n` +
        `> *${item.title}*\n` +
        `> 현재 상태: ${item.spStatus}\n` +
        `> 마감일: ${item.deadline}\n` +
        `> <${item.notionUrl}|Notion에서 보기>\n` +
        `> <${GPTS_LINK}|콘텐츠 작성 도우미 (GPTs)>`;

      // 각 작성자에게 DM 발송
      for (const author of item.authors) {
        if (!author.email) continue;
        const slackUserId = await lookupUserByEmail(author.email);
        if (slackUserId) {
          try {
            await sendDM(slackUserId, text);
            sentCount++;
          } catch (error) {
            console.error(`DM failed for ${author.name}:`, error);
          }
        }
      }

      // 작성자가 없거나 DM 실패 시 채널에 발송
      if (item.authors.length === 0) {
        const channel = process.env.SLACK_CHANNEL_OSMU_RAW;
        if (channel) {
          await sendMessage(channel, text);
          sentCount++;
        }
      }
    }

    return NextResponse.json({
      message: `Sent ${sentCount} reminders for ${urgent.length} items`,
      sent: sentCount,
    });
  } catch (error) {
    console.error("Reminder cron failed:", error);
    return NextResponse.json(
      { error: "Reminder failed" },
      { status: 500 }
    );
  }
}
