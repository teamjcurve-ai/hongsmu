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
