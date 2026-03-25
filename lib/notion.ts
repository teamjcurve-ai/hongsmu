import type { ContentItem, Author, AuthorStats, WeeklyStats } from "./types";

const NOTION_API_KEY = process.env.TEAMJCURVE_NOTION_API_KEY!;
const DATABASE_ID = process.env.ENCYCLOPEDIA_NOTION_DATABASE_ID!;
const NOTION_BASE = "https://api.notion.com/v1";

async function notionFetch(
  path: string,
  options?: { method?: string; body?: Record<string, unknown> }
) {
  const method = options?.method || (options?.body ? "POST" : "GET");
  const res = await fetch(`${NOTION_BASE}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${NOTION_API_KEY}`,
      "Notion-Version": "2022-06-28",
      "Content-Type": "application/json",
    },
    ...(options?.body && { body: JSON.stringify(options.body) }),
  });
  if (!res.ok) {
    throw new Error(`Notion API error: ${res.status} ${await res.text()}`);
  }
  return res.json();
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function extractTitle(props: any): string {
  return (
    props["제목"]?.title?.map((t: any) => t.plain_text).join("") ||
    "(제목 없음)"
  );
}

function extractPeople(props: any): Author[] {
  const people = props["작성자"]?.people || [];
  return people.map((p: any) => ({
    id: p.id,
    name: p.name || "(이름 없음)",
    email: p.person?.email || null,
  }));
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
  const text =
    props[field]?.rich_text?.map((t: any) => t.plain_text).join("") || "";
  return text || null;
}
/* eslint-enable @typescript-eslint/no-explicit-any */

function pageToContentItem(page: {
  id: string;
  properties: Record<string, unknown>;
}): ContentItem {
  const props = page.properties;
  return {
    id: page.id,
    title: extractTitle(props),
    authors: extractPeople(props),
    spStatus:
      (extractStatus(props, "SP 발행 상태") as ContentItem["spStatus"]) ||
      "발행 전",
    newsletterStatus:
      (extractStatus(
        props,
        "뉴스레터 발행 여부"
      ) as ContentItem["newsletterStatus"]) || "시작 전",
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

    const data = await notionFetch(`/databases/${DATABASE_ID}/query`, {
      body,
    });

    for (const page of data.results) {
      if (page.properties) {
        items.push(pageToContentItem(page));
      }
    }

    hasMore = data.has_more;
    cursor = (data.next_cursor as string | null) ?? undefined;
  }

  return items;
}

// 페이지 상태 변경
export async function updatePageStatus(
  pageId: string,
  field: string,
  value: string
) {
  return notionFetch(`/pages/${pageId}`, {
    method: "PATCH",
    body: {
      properties: {
        [field]: { status: { name: value } },
      },
    },
  });
}

// 체크박스 변경
export async function updatePageCheckbox(
  pageId: string,
  field: string,
  value: boolean
) {
  return notionFetch(`/pages/${pageId}`, {
    method: "PATCH",
    body: {
      properties: {
        [field]: { checkbox: value },
      },
    },
  });
}

// URL 변경
export async function updatePageUrl(
  pageId: string,
  field: string,
  value: string | null
) {
  return notionFetch(`/pages/${pageId}`, {
    method: "PATCH",
    body: {
      properties: {
        [field]: { url: value },
      },
    },
  });
}

// 리치텍스트 변경
export async function updatePageRichText(
  pageId: string,
  field: string,
  value: string
) {
  return notionFetch(`/pages/${pageId}`, {
    method: "PATCH",
    body: {
      properties: {
        [field]: {
          rich_text: value
            ? [{ type: "text", text: { content: value } }]
            : [],
        },
      },
    },
  });
}

// Notion DB에 새 페이지 생성
export async function createPage(params: {
  title: string;
  category: string;
  deadline: string | null;
  slackLink: string | null;
  direction: string;
}) {
  const properties: Record<string, unknown> = {
    "제목": {
      title: [{ type: "text", text: { content: params.title } }],
    },
    "카테고리": {
      multi_select: [{ name: params.category }],
    },
    "SP 발행 상태": {
      status: { name: "발행 전" },
    },
    "뉴스레터 발행 여부": {
      status: { name: "시작 전" },
    },
  };

  if (params.deadline) {
    properties["작성 기한"] = { date: { start: params.deadline } };
  }
  if (params.slackLink) {
    properties["slack 원본 링크"] = { url: params.slackLink };
  }

  const page = await notionFetch("/pages", {
    body: {
      parent: { database_id: DATABASE_ID },
      properties,
      children: params.direction
        ? [
            {
              object: "block",
              type: "heading_2",
              heading_2: {
                rich_text: [{ type: "text", text: { content: "콘텐츠 방향" } }],
              },
            },
            {
              object: "block",
              type: "paragraph",
              paragraph: {
                rich_text: [{ type: "text", text: { content: params.direction } }],
              },
            },
          ]
        : [],
    },
  });

  return page;
}

// DB에 등록된 모든 사용자 목록 (작성자 후보)
export async function getAllAuthors(): Promise<Author[]> {
  const items = await queryEncyclopedia();
  const map = new Map<string, Author>();
  for (const item of items) {
    for (const author of item.authors) {
      if (!map.has(author.id)) {
        map.set(author.id, author);
      }
    }
  }
  return Array.from(map.values()).sort((a, b) =>
    a.name.localeCompare(b.name)
  );
}

export function computeAuthorStats(items: ContentItem[]): AuthorStats[] {
  const map = new Map<string, AuthorStats>();

  for (const item of items) {
    const names =
      item.authors.length > 0
        ? item.authors.map((a) => a.name)
        : ["(미배정)"];

    for (const name of names) {
      if (!map.has(name)) {
        map.set(name, { name, total: 0, published: 0, inProgress: 0 });
      }
      const stats = map.get(name)!;
      stats.total++;
      if (item.spStatus === "발행 완") stats.published++;
      if (item.spStatus === "발행 요청") stats.inProgress++;
    }
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
