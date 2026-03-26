import { generateText } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import * as cheerio from "cheerio";
import { YoutubeTranscript } from "youtube-transcript";
import { getPageBlocks, blocksToMarkdown } from "./notion";

// Slack 메시지에서 URL 추출
export function extractUrls(text: string): string[] {
  const urls: string[] = [];
  // Slack 포맷: <https://...> 또는 <https://...|label>
  const slackPattern = /<(https?:\/\/[^|>]+)(?:\|[^>]*)?>/g;
  let match;
  while ((match = slackPattern.exec(text)) !== null) {
    urls.push(match[1]);
  }
  // 일반 URL (Slack 포맷이 아닌 경우)
  if (urls.length === 0) {
    const plainPattern = /https?:\/\/[^\s<>]+/g;
    while ((match = plainPattern.exec(text)) !== null) {
      urls.push(match[0]);
    }
  }
  return [...new Set(urls)];
}

type UrlType = "youtube" | "notion" | "web";

function classifyUrl(url: string): UrlType {
  if (
    url.includes("youtube.com/watch") ||
    url.includes("youtu.be/") ||
    url.includes("youtube.com/shorts")
  ) {
    return "youtube";
  }
  if (url.includes("notion.so/") || url.includes("notion.site/")) {
    return "notion";
  }
  return "web";
}

// YouTube 영상 ID 추출
function extractYoutubeId(url: string): string | null {
  const patterns = [
    /youtube\.com\/watch\?v=([^&]+)/,
    /youtu\.be\/([^?]+)/,
    /youtube\.com\/shorts\/([^?]+)/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  return null;
}

// Notion URL에서 page ID 추출
function extractNotionPageId(url: string): string | null {
  // https://www.notion.so/workspace/Page-Title-{32hex}
  // 또는 https://www.notion.so/{32hex}
  const match = url.match(/([a-f0-9]{32})(?:\?|$|#)/);
  if (match) return match[1];
  // 하이픈 포함 UUID
  const uuidMatch = url.match(
    /([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/
  );
  if (uuidMatch) return uuidMatch[1];
  return null;
}

// 웹페이지 본문 크롤링
async function fetchWebContent(url: string): Promise<string> {
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; HongsmuBot/1.0)",
        Accept: "text/html",
      },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return `[페이지 접근 실패: ${res.status}]`;
    const html = await res.text();
    const $ = cheerio.load(html);

    // 불필요한 요소 제거
    $("script, style, nav, footer, header, aside, iframe, noscript").remove();

    // 본문 추출 우선순위
    let text = "";
    const selectors = ["article", "main", '[role="main"]', ".post-content", ".entry-content", ".article-body"];
    for (const sel of selectors) {
      const el = $(sel);
      if (el.length && el.text().trim().length > 100) {
        text = el.text().trim();
        break;
      }
    }
    if (!text) {
      text = $("body").text().trim();
    }

    // 제목
    const title = $("title").text().trim() || $("h1").first().text().trim();

    // 텍스트 정리 (연속 공백/줄바꿈 제거)
    text = text.replace(/\s+/g, " ").slice(0, 5000);

    return title ? `[제목: ${title}]\n${text}` : text;
  } catch {
    return `[페이지 크롤링 실패: ${url}]`;
  }
}

// NotebookLM API를 통한 콘텐츠 분석 (YouTube, 웹 등)
const NLM_API_URL = process.env.NLM_API_URL || "https://hongsmu-nlm-api-767636756095.asia-northeast3.run.app";
const NLM_API_SECRET = process.env.NLM_API_SECRET || "hongsmu-nlm-2026";

async function fetchViaNlm(urls: string[]): Promise<string | null> {
  try {
    const res = await fetch(`${NLM_API_URL}/analyze`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${NLM_API_SECRET}`,
      },
      body: JSON.stringify({
        urls,
        question:
          "이 콘텐츠의 핵심 내용을 한국어로 상세히 설명해주세요. 주요 포인트, 시사점, 그리고 기업 AI 도입 관점에서의 의미를 포함해주세요.",
      }),
      signal: AbortSignal.timeout(120000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.answer || null;
  } catch {
    return null;
  }
}

// YouTube 자막 추출 (NLM 실패 시 폴백)
async function fetchYoutubeContent(url: string): Promise<string> {
  const videoId = extractYoutubeId(url);
  if (!videoId) return `[YouTube ID 추출 실패: ${url}]`;

  // 자막 시도
  try {
    const transcript = await YoutubeTranscript.fetchTranscript(videoId, {
      lang: "ko",
    });
    if (transcript.length > 0) {
      const text = transcript.map((t) => t.text).join(" ").slice(0, 5000);
      return `[YouTube 자막]\n${text}`;
    }
  } catch {
    try {
      const transcript = await YoutubeTranscript.fetchTranscript(videoId);
      if (transcript.length > 0) {
        const text = transcript.map((t) => t.text).join(" ").slice(0, 5000);
        return `[YouTube 자막 (영어)]\n${text}`;
      }
    } catch {
      // 자막 없음
    }
  }

  // 자막 실패 시 oEmbed
  try {
    const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`;
    const res = await fetch(oembedUrl, { signal: AbortSignal.timeout(5000) });
    if (res.ok) {
      const data = await res.json();
      return `[YouTube 영상: ${data.title}] (by ${data.author_name})\n자막을 가져올 수 없어 제목 정보만 확인됨.`;
    }
  } catch {
    // oEmbed도 실패
  }

  return `[YouTube 영상: ${url}] (자막/정보 추출 실패)`;
}

// Notion 페이지 본문 추출
async function fetchNotionContent(url: string): Promise<string> {
  const pageId = extractNotionPageId(url);
  if (!pageId) return `[Notion 페이지 ID 추출 실패: ${url}]`;

  try {
    const blocks = await getPageBlocks(pageId);
    const markdown = blocksToMarkdown(blocks);
    return `[Notion 페이지]\n${markdown.slice(0, 5000)}`;
  } catch {
    return `[Notion 페이지 접근 실패: ${url}]`;
  }
}

// URL을 분류하고 내용을 가져오기
async function fetchUrlContent(url: string): Promise<string> {
  const type = classifyUrl(url);
  switch (type) {
    case "youtube":
      return fetchYoutubeContent(url);
    case "notion":
      return fetchNotionContent(url);
    case "web":
      return fetchWebContent(url);
  }
}

// NLM 아티팩트 생성 요청
export type NlmAction = "audio" | "video" | "slides" | "report" | "mindmap" | "infographic" | "research" | "analyze";

interface NlmIntent {
  action: NlmAction;
  focus: string;
}

const ACTION_KEYWORDS: Record<string, NlmAction> = {
  "팟캐스트": "audio",
  "오디오": "audio",
  "podcast": "audio",
  "영상": "video",
  "비디오": "video",
  "video": "video",
  "슬라이드": "slides",
  "발표자료": "slides",
  "ppt": "slides",
  "PPT": "slides",
  "보고서": "report",
  "리포트": "report",
  "report": "report",
  "마인드맵": "mindmap",
  "mindmap": "mindmap",
  "인포그래픽": "infographic",
  "리서치": "research",
  "딥리서치": "research",
};

// 사용자 의도 파악
export function detectIntent(text: string): NlmIntent {
  const cleaned = text.replace(/<@[A-Z0-9]+>/g, "").trim();

  // 아티팩트 생성 키워드 확인
  for (const [keyword, action] of Object.entries(ACTION_KEYWORDS)) {
    if (cleaned.includes(keyword)) {
      // focus 추출: 키워드 앞뒤 텍스트에서 주제 파악
      const focus = cleaned
        .replace(keyword, "")
        .replace(/만들어줘|만들어 줘|제작해줘|제작해 줘|생성해줘|생성해 줘|해줘|해 줘|좀|으로|을|를|이|가/g, "")
        .trim();
      return { action, focus };
    }
  }

  // 기본: 설명/요약
  return { action: "analyze", focus: "" };
}

// Notion 등록 키워드 감지
export function hasNotionKeyword(text: string): boolean {
  const keywords = [
    "노션 등록", "노션 업로드", "노션에 등록", "노션에 업로드",
    "등록해줘", "등록해 줘", "업로드해줘", "업로드해 줘",
  ];
  return keywords.some((k) => text.includes(k));
}

// NLM 또는 분석 키워드 감지
export function hasActionKeyword(text: string): boolean {
  const keywords = [
    "설명해줘", "설명해 줘", "요약해줘", "요약해 줘",
    ...Object.keys(ACTION_KEYWORDS),
    "만들어줘", "만들어 줘", "제작해줘", "제작해 줘", "생성해줘", "생성해 줘",
  ];
  return keywords.some((k) => text.includes(k));
}

// NLM 아티팩트 비동기 생성 요청
export async function requestNlmCreate(
  urls: string[],
  action: NlmAction,
  focus: string = ""
): Promise<{ jobId: string; status: string } | null> {
  try {
    const res = await fetch(`${NLM_API_URL}/create`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${NLM_API_SECRET}`,
      },
      body: JSON.stringify({ urls, action, focus, language: "ko" }),
      signal: AbortSignal.timeout(30000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return { jobId: data.job_id, status: data.status };
  } catch {
    return null;
  }
}

// NLM 작업 상태 확인
export async function checkNlmJobStatus(
  jobId: string
): Promise<{ status: string; error: string; notebookId: string } | null> {
  try {
    const res = await fetch(`${NLM_API_URL}/job/${jobId}`, {
      headers: { Authorization: `Bearer ${NLM_API_SECRET}` },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return {
      status: data.status,
      error: data.error || "",
      notebookId: data.notebook_id || "",
    };
  } catch {
    return null;
  }
}

// 메인: 스레드 콘텐츠 분석 + AI 요약
export async function analyzeThreadContent(
  messages: Array<{ user: string; text: string }>
): Promise<string> {
  // 1. 모든 메시지에서 URL 추출
  const allText = messages.map((m) => m.text).join("\n");
  const urls = extractUrls(allText);

  // 2. NLM API로 심층 분석 시도 (YouTube/웹 모두 지원)
  let nlmAnalysis: string | null = null;
  if (urls.length > 0) {
    nlmAnalysis = await fetchViaNlm(urls.slice(0, 5));
  }

  // 3. NLM 실패 시 개별 URL 크롤링 폴백
  let urlContents: Array<{ url: string; content: string }> = [];
  if (!nlmAnalysis) {
    urlContents = await Promise.all(
      urls.slice(0, 5).map(async (url) => {
        const content = await fetchUrlContent(url);
        return { url, content };
      })
    );
  }

  // 4. AI 프롬프트 구성
  const threadText = messages
    .map((m) => m.text)
    .join("\n---\n")
    .slice(0, 3000);

  const linkAnalysis = nlmAnalysis
    ? `[NotebookLM 심층 분석 결과]\n${nlmAnalysis}`
    : urlContents
        .map((u) => `### ${u.url}\n${u.content}`)
        .join("\n\n");

  const prompt = `당신은 팀제이커브의 AI 콘텐츠 분석가입니다.
아래는 크루원이 Slack 채널에 올린 콘텐츠입니다. 미팅에 참석하지 못하는 크루원 대신 내용을 설명해야 합니다.

## 스레드 내용
${threadText}

${linkAnalysis ? `## 링크 분석 결과\n${linkAnalysis}` : ""}

---

다음 형식으로 요약해주세요. Slack mrkdwn 문법을 사용하세요.

*요약*
스레드에 올라온 콘텐츠가 무엇인지 2-3문단으로 설명. 자연스러운 구어체로 작성.

*핵심 포인트*
- 포인트 1
- 포인트 2
- 포인트 3
(최대 5개)

*미팅에서 논의할 만한 질문*
- 질문 1
- 질문 2

주의:
- Slack mrkdwn 문법 사용 (*굵게*, _기울임_, \`코드\`, >인용)
- 친근하지만 전문적인 톤
- 한국어로 작성
- 링크 분석이 실패한 경우에도 스레드 텍스트만으로 최선의 요약을 해주세요`;

  const { text } = await generateText({
    model: anthropic("claude-sonnet-4-20250514"),
    prompt,
    maxOutputTokens: 1500,
  });

  return text;
}
