import type { ContentItem, AuthorStats, WeeklyStats } from "./types";

const NOTION_API_KEY = process.env.TEAMJCURVE_NOTION_API_KEY!;
const DATABASE_ID = process.env.ENCYCLOPEDIA_NOTION_DATABASE_ID!;
const NOTION_BASE = "https://api.notion.com/v1";

async function notionFetch(path: string, body?: Record<string, unknown>) {
  const res = await fetch(`${NOTION_BASE}${path}`, {
    method: body ? "POST" : "GET",
    headers: {
      Authorization: `Bearer ${NOTION_API_KEY}`,
      "Notion-Version": "2022-06-28",
      "Content-Type": "application/json",
    },
    ...(body && { body: JSON.stringify(body) }),
    next: { revalidate: 300 },
  });
  if (!res.ok) {
    throw new Error(`Notion API error: ${res.status} ${await res.text()}`);
  }
  return res.json();
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function extractTitle(props: any): string {
  const titleProp = props["제목"];
  return titleProp?.title?.map((t: any) => t.plain_text).join("") || "(제목 없음)";
}

function extractPeople(props: any): { name: string | null; email: string | null } {
  const person = props["작성자"]?.people?.[0];
  return {
    name: person?.name || null,
    email: person?.person?.email || null,
  };
}

function extractStatus(props: any, field: string): string | null {
  return props[field]?.status?.name || null;
}

function extractDate(props: any, field: string): string | null {
  return props[field]?.date?.start || null;
}

function extractMultiSelect(props: any, field: string): string[] {
  return props[field]?.multi_select?.map((o: any) => o.name) || [];
}

function extractUrl(props: any, field: string): string | null {
  return props[field]?.url || null;
}

function extractCheckbox(props: any, field: string): boolean {
  return props[field]?.checkbox || false;
}

function extractRichText(props: any, field: string): string | null {
  const text = props[field]?.rich_text?.map((t: any) => t.plain_text).join("") || "";
  return text || null;
}
/* eslint-enable @typescript-eslint/no-explicit-any */

function pageToContentItem(page: { id: string; properties: Record<string, unknown> }): ContentItem {
  const props = page.properties;
  const author = extractPeople(props);
  return {
    id: page.id,
    title: extractTitle(props),
    author: author.name,
    authorEmail: author.email,
    spStatus: (extractStatus(props, "SP 발행 상태") as ContentItem["spStatus"]) || "발행 전",
    newsletterStatus: (extractStatus(props, "뉴스레터 발행 여부") as ContentItem["newsletterStatus"]) || "시작 전",
    deadline: extractDate(props, "작성 기한"),
    newsletterDate: extractDate(props, "발행일(뉴스레터)"),
    category: extractMultiSelect(props, "카테고리"),
    slackLink: extractUrl(props, "slack 원본 링크"),
    blogLink: extractUrl(props, "블로그 링크"),
    linkedin: extractRichText(props, "링크드인"),
    step2Done: extractCheckbox(props, "Step2 진행 여부"),
    notionUrl: `https://notion.so/${page.id.replace(/-/g, "")}`,
  };
}

export async function queryEncyclopedia(): Promise<ContentItem[]> {
  const items: ContentItem[] = [];
  let cursor: string | undefined = undefined;
  let hasMore = true;

  while (hasMore) {
    const body: Record<string, unknown> = {
      page_size: 100,
      sorts: [{ property: "작성 기한", direction: "descending" }],
    };
    if (cursor) body.start_cursor = cursor;

    const data = await notionFetch(`/databases/${DATABASE_ID}/query`, body);

    for (const page of data.results) {
      if (page.properties) {
        items.push(pageToContentItem(page));
      }
    }

    hasMore = data.has_more;
    cursor = data.next_cursor ?? undefined;
  }

  return items;
}

export function computeAuthorStats(items: ContentItem[]): AuthorStats[] {
  const map = new Map<string, AuthorStats>();

  for (const item of items) {
    const name = item.author || "(미배정)";
    if (!map.has(name)) {
      map.set(name, { name, total: 0, published: 0, inProgress: 0 });
    }
    const stats = map.get(name)!;
    stats.total++;
    if (item.spStatus === "발행 완") stats.published++;
    if (item.spStatus === "발행 요청") stats.inProgress++;
  }

  return Array.from(map.values()).sort((a, b) => b.total - a.total);
}

export function computeWeeklyStats(items: ContentItem[]): WeeklyStats[] {
  const map = new Map<string, number>();

  for (const item of items) {
    if (!item.newsletterDate) continue;
    const date = new Date(item.newsletterDate);
    const weekStart = new Date(date);
    weekStart.setDate(date.getDate() - date.getDay() + 1);
    const key = weekStart.toISOString().split("T")[0];
    map.set(key, (map.get(key) || 0) + 1);
  }

  return Array.from(map.entries())
    .map(([week, count]) => ({ week, count }))
    .sort((a, b) => a.week.localeCompare(b.week))
    .slice(-12);
}
