import { NextRequest, NextResponse } from "next/server";
import { queryEncyclopedia } from "@/lib/notion";
import { sendDM, lookupUserByEmail, sendMessage } from "@/lib/slack";

const HONGROGUE_LINK =
  "https://chatgpt.com/g/g-696edb75c0148191811cdf8e60685e45-timjeikeobeu-ai-native-beulrogeu-gihoeg-coan-jejagbos";
const ENCYCLOPEDIA_DB_LINK =
  "https://www.notion.so/lilacberets/2c29c7b3864f8060bb57d6a3cdbb78ce?v=2c29c7b3864f81caad20000c84514996";

function buildReminderMessage(
  title: string,
  dday: string,
  deadline: string,
  notionUrl: string
): string {
  let text = `*[홍스무] 콘텐츠 작성 리마인더 (${dday})*\n\n`;
  text += `*${title}*\n`;
  text += `작성 기한: ${deadline}\n\n`;

  text += `---\n\n`;

  text += `*작성 가이드*\n`;
  text += `1. <${HONGROGUE_LINK}|홍로그>에 접속 후 콘텐츠 제작\n`;
  text += `2. <${notionUrl}|공유된 노션 페이지>에 내용 기입 (문단마다 이미지 1장씩 넣어주세요.)\n`;
  text += `3. <${ENCYCLOPEDIA_DB_LINK}|AI 백과사전 DB>에 접속\n`;
  text += `4. Step2 진행여부 체크\n`;
  text += `5. SP 발행 상태를 "발행 요청"으로 변경\n`;

  if (dday === "D-Day") {
    text += `\n*오늘이 마감일입니다. 꼭 완료 부탁드립니다.*`;
  } else if (dday === "D-1") {
    text += `\n*내일이 마감일입니다. 마무리해주세요.*`;
  }

  return text;
}

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const items = await queryEncyclopedia();
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    // D-2, D-1, D-Day + Step2 미완료 + 발행 완이 아닌 항목
    const targets = items.filter((i) => {
      if (!i.deadline) return false;
      if (i.spStatus === "발행 완") return false;
      if (i.step2Done) return false; // Step2 체크 완료되면 독려 안 함

      const d = new Date(i.deadline);
      d.setHours(0, 0, 0, 0);
      const diff = Math.ceil(
        (d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      );
      return diff >= 0 && diff <= 2; // D-2, D-1, D-Day
    });

    if (targets.length === 0) {
      return NextResponse.json({ message: "No items to remind", sent: 0 });
    }

    let sentCount = 0;

    for (const item of targets) {
      const d = new Date(item.deadline!);
      d.setHours(0, 0, 0, 0);
      const diff = Math.ceil(
        (d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      );
      const dday = diff === 0 ? "D-Day" : `D-${diff}`;

      const text = buildReminderMessage(
        item.title,
        dday,
        item.deadline!,
        item.notionUrl
      );

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

      // 작성자가 없으면 채널에 발송
      if (item.authors.length === 0) {
        const channel = process.env.SLACK_CHANNEL_OSMU_RAW;
        if (channel) {
          await sendMessage(channel, text);
          sentCount++;
        }
      }
    }

    return NextResponse.json({
      message: `Sent ${sentCount} reminders for ${targets.length} items`,
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
