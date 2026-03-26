import { NextRequest, NextResponse } from "next/server";
import { after } from "next/server";

export const maxDuration = 60;
import { verifySlackRequest } from "@/lib/slack-verify";
import {
  sendMessage,
  getThreadMessages,
  getPermalink,
  getUserName,
  lookupUserByEmail,
} from "@/lib/slack";
import {
  queryEncyclopedia,
  createPage,
  getAllAuthors,
  updatePageStatus,
} from "@/lib/notion";
import {
  extractContentFromThread,
  extractMentionedUserIds,
  computeDeadlines,
  isUrgentContent,
} from "@/lib/extract";
import {
  hasNotionKeyword,
  hasActionKeyword,
  analyzeThreadContent,
  detectIntent,
  extractUrls,
  requestNlmCreate,
  checkNlmJobStatus,
} from "@/lib/analyze";

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
      const eventText = event.text || "";

      if (isInThread && hasNotionKeyword(eventText)) {
        // 1순위: "노션 등록해줘/업로드해줘" → Notion 자동 등록
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
            const schedule = computeDeadlines(existingItems, urgent);

            // 밀려난 콘텐츠가 있으면 Notion 발행일 업데이트
            if (schedule.bumped && schedule.bumpedNewDate) {
              const bumpedDeadline = new Date(schedule.bumpedNewDate);
              bumpedDeadline.setDate(bumpedDeadline.getDate() - 1);

              // Notion에서 발행일 + 작성 기한 변경
              const NOTION_API_KEY = process.env.TEAMJCURVE_NOTION_API_KEY!;
              await fetch(`https://api.notion.com/v1/pages/${schedule.bumped.id}`, {
                method: "PATCH",
                headers: {
                  Authorization: `Bearer ${NOTION_API_KEY}`,
                  "Notion-Version": "2022-06-28",
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  properties: {
                    "발행일(뉴스레터)": { date: { start: schedule.bumpedNewDate } },
                    "작성 기한": { date: { start: bumpedDeadline.toISOString().split("T")[0] } },
                  },
                }),
              });
            }

            // 슬랙 원본 링크
            const permalink = await getPermalink(
              event.channel,
              event.thread_ts
            );

            // Notion 페이지 생성
            const page = await createPage({
              title: extracted.title,
              category: extracted.category,
              deadline: schedule.deadline,
              newsletterDate: schedule.newsletterDate,
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
            confirmText += `> 작성 기한: ${schedule.deadline}\n`;
            confirmText += `> 뉴스레터 발행일: ${schedule.newsletterDate}\n`;
            if (urgent) {
              confirmText += `> *시의성 중요 — 빠른 작성 필요*\n`;
            }
            if (schedule.bumped) {
              const bumpedAuthors = schedule.bumped.authors.map((a) => a.name).join(", ") || "미배정";
              confirmText += `> \n`;
              confirmText += `> *스케줄 조정:* "${schedule.bumped.title}" (${bumpedAuthors})\n`;
              confirmText += `> → ${schedule.bumpedNewDate} 로 발행일 변경됨\n`;
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
      } else if (isInThread && hasActionKeyword(eventText)) {
        // 2순위: NLM 아티팩트 또는 콘텐츠 분석
        const intent = detectIntent(eventText);

        if (intent.action !== "analyze") {
          // NLM 아티팩트 생성 (팟캐스트, 슬라이드, 보고서 등)
          const ACTION_LABELS: Record<string, string> = {
            audio: "팟캐스트",
            video: "비디오",
            slides: "슬라이드",
            report: "보고서",
            mindmap: "마인드맵",
            infographic: "인포그래픽",
            research: "딥리서치",
          };
          const label = ACTION_LABELS[intent.action] || intent.action;

          after(async () => {
            try {
              const messages = await getThreadMessages(event.channel, event.thread_ts);
              const allText = messages.map((m) => m.text).join("\n");
              const urls = extractUrls(allText);

              if (urls.length === 0) {
                await sendMessage(
                  event.channel,
                  `*[홍스무]* ${label} 제작을 위한 URL이 스레드에 없습니다. 링크를 먼저 올려주세요.`,
                  { thread_ts: event.thread_ts }
                );
                return;
              }

              await sendMessage(
                event.channel,
                `*[홍스무]* ${label} 제작을 시작합니다. 완료되면 알려드릴게요.${intent.focus ? `\n> 주제: ${intent.focus}` : ""}\n> 소요 시간: 수 분~10분+`,
                { thread_ts: event.thread_ts }
              );

              const job = await requestNlmCreate(urls, intent.action, intent.focus);
              if (!job) {
                await sendMessage(
                  event.channel,
                  `*[홍스무]* ${label} 제작 요청에 실패했습니다.`,
                  { thread_ts: event.thread_ts }
                );
                return;
              }

              // 폴링으로 완료 대기 (최대 15분)
              const maxWait = 900000;
              const interval = 15000;
              let elapsed = 0;

              while (elapsed < maxWait) {
                await new Promise((r) => setTimeout(r, interval));
                elapsed += interval;

                const status = await checkNlmJobStatus(job.jobId);
                if (!status) continue;

                if (status.status === "completed") {
                  await sendMessage(
                    event.channel,
                    `*[홍스무]* ${label} 제작이 완료되었습니다!\n> NotebookLM에서 확인: https://notebooklm.google.com/notebook/${status.notebookId}`,
                    { thread_ts: event.thread_ts }
                  );
                  return;
                }

                if (status.status === "failed") {
                  await sendMessage(
                    event.channel,
                    `*[홍스무]* ${label} 제작에 실패했습니다.\n> ${status.error || "알 수 없는 오류"}`,
                    { thread_ts: event.thread_ts }
                  );
                  return;
                }
              }

              await sendMessage(
                event.channel,
                `*[홍스무]* ${label} 제작이 아직 진행 중입니다. NotebookLM에서 직접 확인해주세요.`,
                { thread_ts: event.thread_ts }
              );
            } catch (error) {
              console.error("Failed to create NLM artifact:", error);
              await sendMessage(
                event.channel,
                `*[홍스무]* ${label} 제작 중 오류가 발생했습니다.`,
                { thread_ts: event.thread_ts }
              );
            }
          });
        } else {
          // 설명해줘/요약해줘 → 콘텐츠 분석
          after(async () => {
            try {
              await sendMessage(event.channel, "분석 중입니다. 잠시만 기다려주세요...", {
                thread_ts: event.thread_ts,
              });

              const messages = await getThreadMessages(event.channel, event.thread_ts);
              if (messages.length === 0) return;

              const analysis = await analyzeThreadContent(messages);

              await sendMessage(event.channel, analysis, {
                thread_ts: event.thread_ts,
              });
            } catch (error) {
              console.error("Failed to analyze content:", error);
              await sendMessage(
                event.channel,
                "*[홍스무]* 콘텐츠 분석 중 오류가 발생했습니다.",
                { thread_ts: event.thread_ts }
              );
            }
          });
        }
      } else if (isInThread) {
        // 3순위: 스레드에서 키워드 없이 멘션 → 도움말
        after(async () => {
          await sendMessage(
            event.channel,
            `*[홍스무]* 무엇을 도와드릴까요?\n` +
            `> *노션 등록해줘* — 이 스레드 내용을 Notion에 등록\n` +
            `> *설명해줘 / 요약해줘* — 콘텐츠 분석\n` +
            `> *팟캐스트 만들어줘* — 오디오 브리핑 생성\n` +
            `> *슬라이드 만들어줘* — PPT 생성\n` +
            `> *보고서 만들어줘* — 보고서 생성\n` +
            `> *영상 만들어줘* — 비디오 생성`,
            { thread_ts: event.thread_ts }
          );
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
