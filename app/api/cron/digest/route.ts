import { NextRequest, NextResponse } from "next/server";
import { queryEncyclopedia, computeAuthorStats } from "@/lib/notion";
import { sendMessage } from "@/lib/slack";

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const channel = process.env.SLACK_CHANNEL_OSMU_RAW;
  if (!channel) {
    return NextResponse.json({ error: "Channel not configured" }, { status: 500 });
  }

  try {
    const items = await queryEncyclopedia();
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    // 이번 주 발행 완료
    const weekAgo = new Date(now);
    weekAgo.setDate(weekAgo.getDate() - 7);
    const publishedThisWeek = items.filter((i) => {
      if (i.spStatus !== "발행 완" || !i.newsletterDate) return false;
      return new Date(i.newsletterDate) >= weekAgo;
    });

    // 현재 진행 중
    const inProgress = items.filter(
      (i) => i.spStatus === "발행 요청"
    );
    const notStarted = items.filter(
      (i) => i.spStatus === "발행 전"
    );

    // 마감 임박
    const urgent = items.filter((i) => {
      if (!i.deadline || i.spStatus === "발행 완") return false;
      const d = new Date(i.deadline);
      d.setHours(0, 0, 0, 0);
      const diff = Math.ceil(
        (d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      );
      return diff <= 7 && diff >= 0;
    });

    // 작성자별 통계
    const authorStats = computeAuthorStats(items);
    const topAuthors = authorStats
      .filter((a) => a.name !== "(미배정)")
      .slice(0, 5);

    let text = `*[홍스무] 주간 콘텐츠 다이제스트*\n\n`;
    text += `*지난 7일 발행 완료:* ${publishedThisWeek.length}건\n`;
    text += `*현재 발행 요청:* ${inProgress.length}건\n`;
    text += `*발행 전 대기:* ${notStarted.length}건\n`;

    if (urgent.length > 0) {
      text += `\n*이번 주 마감 항목*\n`;
      for (const u of urgent) {
        const authors =
          u.authors.map((a) => a.name).join(", ") || "미배정";
        text += `> ${u.title} (${authors}, 마감: ${u.deadline})\n`;
      }
    }

    if (topAuthors.length > 0) {
      text += `\n*누적 발행 TOP 5*\n`;
      for (const a of topAuthors) {
        text += `> ${a.name}: ${a.published}건 발행\n`;
      }
    }

    await sendMessage(channel, text);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Digest cron failed:", error);
    return NextResponse.json(
      { error: "Digest failed" },
      { status: 500 }
    );
  }
}
