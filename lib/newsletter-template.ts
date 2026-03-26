import type { NewsletterDraft } from "./types";

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const FONT_FAMILY = `noto sans kr, noto sans cjk kr, noto sans cjk, Malgun Gothic, apple sd gothic neo, nanum gothic, malgun gothic, dotum, arial, helvetica, Meiryo, MS Gothic, sans-serif`;
const BRAND_COLOR = "#3F58FE";

function buildHeader(publishDate: string): string {
  return `<table role="presentation" class="stb-one-col" style="width: 100%;border:0;" cellpadding="0" cellspacing="0"><tbody><tr><td style="word-break:break-all;text-align:left;margin:0px;line-height:1.7;word-break:break-word;font-size:16px;font-family:${FONT_FAMILY}!important;-ms-text-size-adjust: 100%;-webkit-text-size-adjust: 100%;color:#333333;padding:15px 15px 15px 15px;"><div style="text-align: center;"><span style="color: #666666; font-size: 12px; font-style: italic;">※ 본 메일에는 자사 서비스/프로그램 관련 안내가 포함되어 있습니다.</span></div></td></tr></tbody></table>
<table role="presentation" class="stb-one-col" style="width: 100%;border:0;" cellpadding="0" cellspacing="0"><tbody><tr><td style="text-align:center;font-size:0;box-sizing:border-box;padding:15px 15px 15px 15px;"><img src="https://img2.stibee.com/118801_3148150_1766125810686186260.png" alt="" style="width:340px;display:inline;vertical-align:bottom;text-align:center;max-width:100% !important;height:auto;border:0;" width="340" class="stb-center"></td></tr></tbody></table>
<table width="100%" cellpadding="0" cellspacing="0" style="border:0;background:${BRAND_COLOR};"><tbody><tr><td style="padding:0 0;text-align:left;margin:0px;line-height:1.7;word-break:break-word;font-size:12px;font-family:${FONT_FAMILY}!important;-ms-text-size-adjust: 100%;-webkit-text-size-adjust: 100%;color:#747579;"><table border="0" cellpadding="0" cellspacing="0" style="width: 100%"><tbody><tr><td style="padding:15px 15px 15px 15px;"><div style="text-align: center;"><span style="color: #f5f5f5; font-weight: bold;"><a href="$%permalink%$" style="color: #f5f5f5; font-weight: bold; text-decoration: none;" target="_blank">웹에서 보기</a></span></div></td></tr></tbody></table></td></tr></tbody></table>
<table role="presentation" class="stb-one-col" style="width: 100%;background:${BRAND_COLOR};border:0;" cellpadding="0" cellspacing="0"><tbody><tr><td style="word-break:break-all;text-align:left;margin:0px;line-height:1.7;word-break:break-word;font-size:16px;font-family:${FONT_FAMILY}!important;-ms-text-size-adjust: 100%;-webkit-text-size-adjust: 100%;color:#333333;padding:15px 15px 15px 15px;"><div style="text-align: center;"><span style="font-size: 40px; font-weight: bold; color: #ffffff;">UPDATE NEWS</span></div><div style="text-align: center;"><span style="font-size: 26px; font-weight: bold; color: #ffffff;">${escapeHtml(publishDate)}</span></div></td></tr></tbody></table>
<table role="presentation" class="stb-one-col" style="width: 100%;background:${BRAND_COLOR};border:0;" cellpadding="0" cellspacing="0"><tbody><tr><td style="word-break:break-all;text-align:left;margin:0px;line-height:1.7;word-break:break-word;font-size:16px;font-family:${FONT_FAMILY}!important;-ms-text-size-adjust: 100%;-webkit-text-size-adjust: 100%;color:#333333;padding:15px 15px 15px 15px;"><div>&nbsp;&nbsp;</div></td></tr></tbody></table>`;
}

function buildDivider(): string {
  return `<table width="100%" cellpadding="0" cellspacing="0" style="border:0;"><tbody><tr><td class="stb-text-box" style="height: 50px"></td></tr></tbody></table>
<table width="100%" cellpadding="0" cellspacing="0" style="border:0;"><tbody><tr><td style="height:15px;" colspan="3"></td></tr><tr><td style="width:15px;"></td><td style="height:15px;background: none;padding: 0px;border-top-width:1px;border-top-style:solid;border-top-color:#999999;margin:0 0;"></td><td style="width:15px;"></td></tr></tbody></table>
<table width="100%" cellpadding="0" cellspacing="0" style="border:0;"><tbody><tr><td class="stb-text-box" style="height: 50px"></td></tr></tbody></table>`;
}

function buildMainSection(data: NewsletterDraft["main"]): string {
  const titleLine = data.partnerName
    ? `[팀제이커브 x ${escapeHtml(data.partnerName)}]`
    : "";
  return `<table role="presentation" class="stb-one-col" style="width: 100%;border:0;" cellpadding="0" cellspacing="0"><tbody><tr><td style="word-break:break-all;text-align:left;margin:0px;line-height:1.7;word-break:break-word;font-size:16px;font-family:${FONT_FAMILY}!important;-ms-text-size-adjust: 100%;-webkit-text-size-adjust: 100%;color:#333333;padding:15px 15px 15px 15px;">${titleLine ? `<div style="text-align: center;"><span style="font-size: 26px; font-weight: bold;">${titleLine}</span></div>` : ""}<div style="text-align: center;"><span style="font-size: 26px; font-weight: bold;">${escapeHtml(data.title)}</span></div></td></tr></tbody></table>
${data.imageUrl ? `<table width="100%" cellpadding="0" cellspacing="0" style="border:0;"><tbody><tr><td style="text-align:center;margin:0px;padding:15px 15px 15px 15px;"><img src="${escapeHtml(data.imageUrl)}" alt="" style="width:100%;display:inline;vertical-align:bottom;max-width:100% !important;height:auto;border:0;" width="600"></td></tr></tbody></table>` : ""}
<table role="presentation" class="stb-one-col" style="width: 100%;border:0;" cellpadding="0" cellspacing="0"><tbody><tr><td style="word-break:break-all;text-align:left;margin:0px;line-height:1.7;word-break:break-word;font-size:16px;font-family:${FONT_FAMILY}!important;-ms-text-size-adjust: 100%;-webkit-text-size-adjust: 100%;color:#333333;padding:15px 15px 15px 15px;"><div style="text-align: left;">${escapeHtml(data.summary).replace(/\n/g, "<br>")}</div></td></tr></tbody></table>
${buildCtaButton(data.ctaUrl, "자세히 보기")}`;
}

function buildNativeSection(data: { title: string; summary: string; imageUrl: string; ctaUrl: string }): string {
  // 제목이 길면 2줄로 자연스럽게 표시 (모바일 대응)
  const titleHtml = escapeHtml(data.title);
  return `<table role="presentation" class="stb-one-col" style="width: 100%;border:0;" cellpadding="0" cellspacing="0"><tbody><tr><td style="word-break:break-all;text-align:left;margin:0px;line-height:1.7;word-break:break-word;font-size:16px;font-family:${FONT_FAMILY}!important;-ms-text-size-adjust: 100%;-webkit-text-size-adjust: 100%;color:#333333;padding:15px 15px 15px 15px;"><div style="text-align: center;"><span style="font-size: 20px; font-weight: bold; color: #333333; background-color: #fdf5b5; line-height: 1.6; display: inline; padding: 2px 6px;">AI NATIVE</span></div><div style="text-align: center; margin-top: 4px;"><span style="font-size: 20px; font-weight: bold; color: #333333; background-color: #fdf5b5; line-height: 1.6; display: inline; padding: 2px 6px;">${titleHtml}</span></div></td></tr></tbody></table>
${data.imageUrl ? `<table role="presentation" class="stb-one-col" style="width: 100%;border:0;" cellpadding="0" cellspacing="0"><tbody><tr><td style="text-align:justify;font-size:0;box-sizing:border-box;padding:15px 15px 15px 15px;"><img src="${escapeHtml(data.imageUrl)}" alt="" style="width:100%;display:inline;vertical-align:bottom;max-width:100% !important;height:auto;border:0;" width="600" class="stb-justify"></td></tr></tbody></table>` : ""}
<table role="presentation" class="stb-one-col" style="width: 100%;border:0;" cellpadding="0" cellspacing="0"><tbody><tr><td style="word-break:break-all;text-align:left;margin:0px;line-height:1.7;word-break:break-word;font-size:16px;font-family:${FONT_FAMILY}!important;-ms-text-size-adjust: 100%;-webkit-text-size-adjust: 100%;color:#333333;padding:15px 15px 15px 15px;"><div style="text-align: left;">${escapeHtml(data.summary).replace(/\n/g, "<br>")}</div></td></tr></tbody></table>
${buildCtaButton(data.ctaUrl, "자세히 보기")}`;
}

function buildNewsCards(news: Array<{ title: string; summary: string; imageUrl: string; ctaUrl: string }>): string {
  const cards = news.map(
    (item) => `<div class="stb-column" style="max-width:315px;width:100%!important;margin:0;vertical-align:top;border-collapse:collapse;box-sizing:border-box;font-size:16px;display:inline-block;vertical-align:top;">
<div style="padding:15px 15px 15px 15px;">
${item.imageUrl ? `<p style="text-align:justify;font-size:0;box-sizing:border-box;"><img src="${escapeHtml(item.imageUrl)}" alt="" style="width:100%;display:inline;vertical-align:bottom;max-width:100% !important;height:auto;border:0;" width="285" class="stb-justify"></p>` : ""}
<div style="word-break:break-all;text-align:left;margin:0px;line-height:1.7;word-break:break-word;font-size:16px;font-family:${FONT_FAMILY}!important;-ms-text-size-adjust: 100%;-webkit-text-size-adjust: 100%;color:#333333;">
<div style="text-align: center;"><span style="font-size: 18px; font-weight: bold;">${escapeHtml(item.title)}</span></div>
<div><br></div>
<div>${escapeHtml(item.summary)}</div>
</div>
<table border="0" cellpadding="0" cellspacing="0" style="width:100%;"><tbody><tr><td style="padding:20px 0 0 0;border:0;width:100%;text-align:center;"><table border="0" cellpadding="0" cellspacing="0" style="color:#ffffff;background:${BRAND_COLOR};border-radius:3px;width:auto;box-sizing:border-box;text-decoration:none;outline:0px;font-family:${FONT_FAMILY};text-align:center;display:inline-table;"><tbody><tr><td style="font-size:0;background:none;border-radius:3px;padding:19px 20px;text-align:center;" valign="top"><a href="${escapeHtml(item.ctaUrl || "#")}" style="font-size:16px;display:inline-block;color:#ffffff;text-decoration:none;outline:0px;text-align:center;line-height:1;box-sizing:border-box;width:auto;" target="_blank"><b>자세히 보기</b></a></td></tr></tbody></table></td></tr></tbody></table>
</div>
</div>`
  );

  // 2컬럼: 뉴스1(이미지왼쪽)+뉴스1(텍스트오른쪽), 뉴스2(텍스트왼쪽)+뉴스2(이미지오른쪽), ...
  // 실제 스티비 템플릿은 2컬럼씩 묶으므로 2개씩 그룹화
  const rows: string[] = [];
  for (let i = 0; i < cards.length; i += 2) {
    const pair = cards.slice(i, i + 2);
    rows.push(`<div class="stb-two-col" style="border:0;font-size:0;">
${pair.join("\n")}
</div>`);
  }

  return rows.join(buildDivider());
}

function buildCtaButton(url: string, label: string): string {
  return `<table role="presentation" class="stb-one-col" style="width: 100%;border:0;" cellpadding="0" cellspacing="0"><tbody><tr><td width="100%" style="clear:both;"><table border="0" cellpadding="0" cellspacing="0" style="width:100%;"><tbody><tr><td style="padding:15px 15px 15px 15px;border:0;width:100%;text-align:center;"><table border="0" cellpadding="0" cellspacing="0" style="color:#ffffff;background:${BRAND_COLOR};border-radius:3px;width:auto;box-sizing:border-box;text-decoration:none;outline:0px;font-family:${FONT_FAMILY};text-align:center;display:inline-table;"><tbody><tr><td style="font-size:0;background:none;border-radius:3px;padding:19px 20px;text-align:center;" valign="top"><a href="${escapeHtml(url || "#")}" style="font-size:16px;display:inline-block;color:#ffffff;text-decoration:none;outline:0px;text-align:center;line-height:1;box-sizing:border-box;width:auto;" target="_blank"><b>${escapeHtml(label)}</b></a></td></tr></tbody></table></td></tr></tbody></table></td></tr></tbody></table>`;
}

function buildFooter(): string {
  return `<table role="presentation" class="stb-one-col" style="width: 100%;border:0;" cellpadding="0" cellspacing="0"><tbody><tr><td style="text-align:center;font-size:0;box-sizing:border-box;padding:15px 15px 0 15px;"><a href="https://blog.teamjcurve.com" target="_blank" style="text-decoration: none; color: ${BRAND_COLOR};"><img src="https://img2.stibee.com/118801_3148150_1766133730164823362.png" alt="" style="width:160px;display:inline;vertical-align:bottom;text-align:center;max-width:100% !important;height:auto;border:0;" width="160" class="stb-center"></a></td></tr><tr><td style="word-break:break-all;text-align:left;margin:0px;line-height:1.7;word-break:break-word;font-size:16px;font-family:${FONT_FAMILY}!important;-ms-text-size-adjust: 100%;-webkit-text-size-adjust: 100%;color:#333333;padding:20px 15px 15px 15px;"><div style="text-align: center;"><span style="font-style: italic; font-size: 14px;">AI의 실전 활용과 정보가 가득한</span></div><div style="text-align: center;"><span style="font-style: italic; font-size: 14px;">AI Native Lab 방문하기</span></div></td></tr></tbody></table>
<table width="100%" cellpadding="0" cellspacing="0" style="border:0;"><tbody><tr><td style="height:15px;" colspan="3"></td></tr><tr><td style="width:15px;"></td><td style="height:15px;background: none;padding: 0px;border-top-width:1px;border-top-style:solid;border-top-color:#b7b7b7;margin:0 0;"></td><td style="width:15px;"></td></tr></tbody></table>
<table width="100%" cellpadding="0" cellspacing="0" style="border:0;"><tbody><tr><td style="border:0;padding:15px 15px 15px 15px;"><table border="0" cellpadding="0" cellspacing="0" align="center" style="margin: 0 auto;text-align:center;"><tbody><tr style="padding: 0px; margin: 0px"><td style="list-style: none; padding: 0 10px 0 0; margin: 0px;"><a href="https://www.facebook.com/sharer/sharer.php?u=$%permalink%$" style="border-width: 0px; text-decoration: none; display: block; color: ${BRAND_COLOR};" target="_blank" title="공유하기"><img src="https://resource.stibee.com/editor/icon/share/facebook-snsA.png" style="height: 22px; width: auto; vertical-align: middle" height="22" width="22" alt="공유하기"> <span style="vertical-align: middle; color: rgb(96, 97, 101); font-size: 12px; display: inline-block; margin: 0px 0px 0px 6px">공유하기</span></a></td><td style="list-style: none; padding: 0 10px 0 10px; margin: 0px;"><a href="https://twitter.com/intent/tweet?text=$%permalink%$" style="border-width: 0px; text-decoration: none; display: block; color: ${BRAND_COLOR};" target="_blank" title="게시하기"><img src="https://resource.stibee.com/editor/icon/share/twitter-snsA.png" style="height: 22px; width: auto; vertical-align: middle" height="22" width="22" alt="게시하기"> <span style="vertical-align: middle; color: rgb(96, 97, 101); font-size: 12px; display: inline-block; margin: 0px 0px 0px 6px">게시하기</span></a></td><td style="list-style: none; padding: 0 10px 0 10px; margin: 0px;"><a href="https://www.linkedin.com/sharing/share-offsite/?url=$%permalink%$" style="border-width: 0px; text-decoration: none; display: block; color: ${BRAND_COLOR};" target="_blank" title="공유하기"><img src="https://resource.stibee.com/editor/icon/share/linkedin-snsA.png" style="height: 22px; width: auto; vertical-align: middle" height="22" width="22" alt="공유하기"> <span style="vertical-align: middle; color: rgb(96, 97, 101); font-size: 12px; display: inline-block; margin: 0px 0px 0px 6px">공유하기</span></a></td><td style="list-style: none; padding: 0 0 0 10px; margin: 0px;"><a href="$%permalink%$" style="border-width: 0px; text-decoration: none; display: block; color: ${BRAND_COLOR};" target="_blank" title="웹에서 보기"><img src="https://resource.stibee.com/editor/icon/share/web-snsA.png" style="height: 22px; width: auto; vertical-align: middle" height="22" width="22" alt="웹에서 보기"> <span style="vertical-align: middle; color: rgb(96, 97, 101); font-size: 12px; display: inline-block; margin: 0px 0px 0px 6px">웹에서 보기</span></a></td></tr></tbody></table></td></tr></tbody></table>
<table width="100%" cellpadding="0" cellspacing="0" style="border:0;"><tbody><tr><td style="text-align:center;margin:0px;line-height:1.7;word-break:break-word;font-size:12px;font-family:${FONT_FAMILY}!important;-ms-text-size-adjust: 100%;-webkit-text-size-adjust: 100%;color:#747579;border:0;"><table border="0" cellpadding="0" cellspacing="0" style="width: 100%"><tbody><tr><td style="padding:15px 15px 15px 15px;text-align:center;"><div><span>주식회사 팀제이커브</span><br><span>info@teamjcurve.com</span><br><span>서울특별시 마포구 양화로 186, 스파크 플러스 5층 526호 - 1</span><br><span style="color: #a4a4a4; font-size: 12px;"><a href="$%unsubscribe%$" style="text-decoration: underline; color: #a4a4a4;" target="_blank">수신거부</a>&nbsp;<a href="$%unsubscribe%$" style="text-decoration: underline; color: #a4a4a4;" target="_blank">Unsubscribe</a></span></div></td></tr></tbody></table></td></tr></tbody></table>`;
}

export function buildNewsletterHtml(data: NewsletterDraft): string {
  const newsHeader = `<table role="presentation" class="stb-one-col" style="width: 100%;border:0;" cellpadding="0" cellspacing="0"><tbody><tr><td style="word-break:break-all;text-align:left;margin:0px;line-height:1.7;word-break:break-word;font-size:16px;font-family:${FONT_FAMILY}!important;-ms-text-size-adjust: 100%;-webkit-text-size-adjust: 100%;color:#333333;padding:15px 15px 15px 15px;"><div style="text-align: center;"><span style="font-size: 26px; font-weight: bold;">이번 주 AI 관련 소식</span></div></td></tr></tbody></table>`;

  const nativeSections = data.natives
    .filter((n) => n.title || n.summary)
    .flatMap((n) => [buildNativeSection(n), buildDivider()]);

  const body = [
    buildHeader(data.publishDate),
    buildDivider(),
    buildMainSection(data.main),
    buildDivider(),
    newsHeader,
    ...nativeSections,
    buildNewsCards(data.news),
    buildDivider(),
    buildFooter(),
  ].join("\n");

  return `<!doctype html><html xmlns="http://www.w3.org/1999/xhtml"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="x-apple-disable-message-reformatting"><meta http-equiv="X-UA-Compatible" content="IE=edge"><title></title>
<style>@media screen and (max-width: 460px) { .stb-two-col .stb-column { max-width: 100% !important; } } @media screen and (min-width: 461px) { .stb-two-col .stb-column { max-width: 50% !important; } } @media screen and (max-width: 640px) { img.stb-justify { width: 100% !important; } } .stb-one-col p, .stb-two-col p { margin: 0px !important; }</style></head>
<body><div role="article" aria-roledescription="email" style="-webkit-text-size-adjust: 100%;-ms-text-size-adjust: 100%;padding: 20px 0px;margin: 0 auto;">
<table id="stb-container" role="presentation" style="width:100%;" border="0"><tbody><tr><td align="center">
<div class="outer" style="width:100%;max-width:630px;margin: 0px auto;">
${body}
</div>
</td></tr></tbody></table>
</div></body></html>`;
}
