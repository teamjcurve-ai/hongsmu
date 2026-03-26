export function buildNewsletterPrompt(contents: {
  main: { title: string; markdown: string };
  natives: Array<{ title: string; markdown: string }>;
  news: Array<{ title: string; markdown: string }>;
}): string {
  const nativeBlocks = contents.natives
    .map(
      (n, i) => `## AI NATIVE 사례 ${i + 1}
제목: ${n.title}
본문:
${n.markdown.slice(0, 2000)}`
    )
    .join("\n\n");

  const newsBlocks = contents.news
    .map(
      (n, i) => `## 선별 뉴스 ${i + 1}
제목: ${n.title}
본문:
${n.markdown.slice(0, 1000)}`
    )
    .join("\n\n");

  return `당신은 팀제이커브의 뉴스레터 에디터입니다.
팀제이커브는 AI 네이티브 교육/컨설팅 기업이며, 구독자는 기업 HR/교육/AI 담당자입니다.

아래 콘텐츠를 뉴스레터에 맞게 요약해주세요.

## 문체 가이드
- 사람이 직접 쓴 것처럼 자연스럽게 작성해주세요. "~입니다", "~합니다"보다는 "~거든요", "~더라고요", "~인데요" 같은 구어체를 섞어주세요.
- 딱딱한 보도자료 톤이 아니라, 동료에게 흥미로운 소식을 전하는 느낌으로요.
- 핵심 수치나 임팩트가 있으면 반드시 포함하되, 나열식이 아니라 이야기 흐름 속에 녹여주세요.
- 문단을 짧게 끊어주세요. 한 문단에 2-3문장이 적당합니다.
- 적절히 줄바꿈(\\n)을 넣어서, 모바일에서도 읽기 편하게 해주세요.

## 메인 콘텐츠
제목: ${contents.main.title}
본문:
${contents.main.markdown.slice(0, 3000)}

${nativeBlocks}

${newsBlocks}

---

다음 JSON 형식으로만 응답해주세요:
{
  "main": {
    "partnerName": "협업사 또는 주제명 (본문에서 추출, 없으면 빈 문자열)",
    "title": "뉴스레터용 메인 제목 (간결하게, 최대 30자)",
    "summary": "300-500자 요약. 2-3문단으로 나누고, 문단 사이에 \\n\\n을 넣어주세요. 자연스러운 구어체로."
  },
  "natives": [
${contents.natives
  .map(
    (_, i) => `    {
      "title": "사례 ${i + 1}의 뉴스레터용 제목 (20자 이내, 핵심만)",
      "summary": "200-300자 요약. 2문단으로 나누고, \\n\\n으로 구분. AI 활용 사례와 임팩트를 이야기체로."
    }`
  )
  .join(",\n")}
  ],
  "news": [
${contents.news
  .map(
    () => `    { "title": "뉴스 제목 (15자 이내)", "summary": "50-100자. 한두 문장으로 핵심만. 구어체." }`
  )
  .join(",\n")}
  ]
}

주의:
- 반드시 유효한 JSON만 출력하세요.
- 한국어로 작성하세요.
- summary 안에서 줄바꿈은 반드시 \\n으로 표현하세요 (실제 줄바꿈 아님).
- natives 배열은 정확히 ${contents.natives.length}개, news 배열은 정확히 ${contents.news.length}개여야 합니다.`;
}
