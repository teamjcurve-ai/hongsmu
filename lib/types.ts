export interface Author {
  id: string;
  name: string;
  email: string | null;
}

export interface ContentItem {
  id: string;
  title: string;
  authors: Author[];
  spStatus: "발행 전" | "발행 요청" | "발행 완";
  newsletterStatus: "시작 전" | "진행 중" | "완료";
  deadline: string | null;
  newsletterDate: string | null;
  category: string[];
  slackLink: string | null;
  blogLink: string | null;
  linkedin: string | null;
  step2Done: boolean;
  notionUrl: string;
}

export interface AuthorStats {
  name: string;
  total: number;
  published: number;
  inProgress: number;
}

export interface WeeklyStats {
  week: string;
  count: number;
}

export interface OsmuStatus {
  blog: boolean;
  newsletter: boolean;
  linkedin: boolean;
  done: number;
  total: 3;
}

export interface DeadlineStats {
  onTime: number;
  delayed: number;
  noDeadline: number;
}

export interface CategoryStats {
  category: string;
  total: number;
  published: number;
  inProgress: number;
}

export interface NewsItem {
  id: string;
  title: string;
  sourceUrl: string | null;
  spLink: string | null;
  tags: string[];
  date: string | null;
  status: string;
  newsletterUploaded: boolean;
  notionUrl: string;
}

export interface NewsletterSection {
  title: string;
  summary: string;
  imageUrl: string;
  ctaUrl: string;
}

export interface NewsletterDraft {
  publishDate: string;
  main: NewsletterSection & { partnerName: string };
  natives: NewsletterSection[];
  news: NewsletterSection[];
}

export type NotionBlock = { id: string; type: string; [key: string]: unknown };
