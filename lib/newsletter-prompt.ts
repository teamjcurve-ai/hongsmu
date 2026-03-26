export function buildNewsletterPrompt(contents: {
  main: { title: string; markdown: string };
  natives: Array<{ title: string; markdown: string }>;
  news: Array<{ title: string; markdown: string }>;
}): string {
  return `당신은 팀제이커브의 뉴스레터 에디터입니다. 아래 콘텐츠를 뉴스레터에 맞게 요약/정제해주세요.

## 메인 콘텐츠
제목: ${contents.main.title}
본문:
${contents.main.markdown.slice(0, 3000)}

## AI NATIVE 사례 1
제목: ${contents.natives[0]?.title || ""}
본문:
${contents.natives[0]?.markdown.slice(0, 2000) || ""}

## AI NATIVE 사례 2
제목: ${contents.natives[1]?.title || ""}
본문:
${contents.natives[1]?.markdown.slice(0, 2000) || ""}

## 선별 뉴스 1
제목: ${contents.news[0]?.title || ""}
본문:
${contents.news[0]?.markdown.slice(0, 1000) || ""}

## 선별 뉴스 2
제목: ${contents.news[1]?.title || ""}
본문:
${contents.news[1]?.markdown.slice(0, 1000) || ""}

## 선별 뉴스 3
제목: ${contents.news[2]?.title || ""}
본문:
${contents.news[2]?.markdown.slice(0, 1000) || ""}

---

다음 JSON 형식으로만 응답해주세요:
{
  "main": {
    "partnerName": "협업사 또는 주제명 (없으면 빈 문자열)",
    "title": "뉴스레터용 메인 제목 (간결하게)",
    "summary": "300-500자 요약. 핵심 내용과 시사점 포함. 뉴스레터 톤(친근하지만 전문적)으로."
  },
  "natives": [
    {
      "title": "AI NATIVE 사례 하나 - 소제목",
      "summary": "200-300자 요약. 어떤 AI 활용 사례인지, 임팩트는 무엇인지."
    },
    {
      "title": "AI NATIVE 사례 둘 - 소제목",
      "summary": "200-300자 요약."
    }
  ],
  "news": [
    { "title": "뉴스 제목 (20자 이내)", "summary": "50-100자 요약" },
    { "title": "뉴스 제목", "summary": "50-100자 요약" },
    { "title": "뉴스 제목", "summary": "50-100자 요약" }
  ]
}

주의:
- 반드시 유효한 JSON만 출력하세요.
- 한국어로 작성하세요.
- 뉴스레터 독자는 기업 HR/교육/AI 담당자입니다.`;
}
