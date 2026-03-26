import crypto from "crypto";
import https from "https";

const SHEET_ID = "1O9vH_7f_ZvJ8VZh0xS8xiz2MMTIjWDVbSH--U7dVtI8";

// 크루원 탭 목록 (종합, 예시 제외)
const CREW_TABS = [
  "장현민",
  "홍지민",
  "김의현",
  "윤성환",
  "김기현",
  "좌행운",
  "김승찬",
  "민현진",
  "박동현",
  "장재익",
];

export interface AxProject {
  no: number;
  crew: string; // 크루원 이름 (탭 이름)
  category: string; // 소속 (AP/CB/MC/개인)
  name: string; // 프로젝트 이름
  link: string | null; // 하이퍼링크 (있는 경우)
  stage: string; // 단계
  type: string; // 유형
  problem: string; // 문제인식
  solution: string; // 해결방안
  tools: string; // 활용 모델/툴
  impact: string; // AX 임팩트
  manager: string; // 관리자
  note: string; // 비고
}

export interface CrewSummary {
  name: string;
  totalProjects: number;
  byStage: Record<string, number>;
  byType: Record<string, number>;
  projects: AxProject[];
}

function getServiceAccountKey() {
  const keyJson = process.env.GOOGLE_SHEETS_SERVICE_ACCOUNT_KEY;
  if (!keyJson) throw new Error("GOOGLE_SHEETS_SERVICE_ACCOUNT_KEY not set");
  // 환경변수가 이미 객체 형태의 JSON 문자열이면 1번만 파싱
  // 이중 인코딩된 경우 (문자열 안의 문자열) 2번 파싱
  const parsed = JSON.parse(keyJson);
  if (typeof parsed === "string") return JSON.parse(parsed);
  return parsed;
}

async function getAccessToken(): Promise<string> {
  const key = getServiceAccountKey();
  const header = Buffer.from(
    JSON.stringify({ alg: "RS256", typ: "JWT" })
  ).toString("base64url");
  const now = Math.floor(Date.now() / 1000);
  const payload = Buffer.from(
    JSON.stringify({
      iss: key.client_email,
      scope: "https://www.googleapis.com/auth/spreadsheets.readonly",
      aud: "https://oauth2.googleapis.com/token",
      iat: now,
      exp: now + 3600,
    })
  ).toString("base64url");

  const sign = crypto.createSign("RSA-SHA256");
  sign.update(`${header}.${payload}`);
  const signature = sign.sign(key.private_key, "base64url");
  const jwt = `${header}.${payload}.${signature}`;

  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    });
    const req = https.request(
      "https://oauth2.googleapis.com/token",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": postData.length,
        },
      },
      (res) => {
        let d = "";
        res.on("data", (c) => (d += c));
        res.on("end", () => {
          const parsed = JSON.parse(d);
          if (parsed.access_token) resolve(parsed.access_token);
          else reject(new Error(`Token error: ${d}`));
        });
      }
    );
    req.on("error", reject);
    req.write(postData);
    req.end();
  });
}

async function fetchSheetValues(
  token: string,
  range: string
): Promise<string[][]> {
  return new Promise((resolve, reject) => {
    const encoded = encodeURIComponent(range);
    https.get(
      `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${encoded}`,
      { headers: { Authorization: `Bearer ${token}` } },
      (res) => {
        let d = "";
        res.on("data", (c) => (d += c));
        res.on("end", () => {
          const parsed = JSON.parse(d);
          resolve(parsed.values || []);
        });
      }
    ).on("error", reject);
  });
}

// D열(이름)의 하이퍼링크를 가져옴 (row index → link URL)
async function fetchNameHyperlinks(
  token: string,
  tab: string
): Promise<Map<number, string>> {
  return new Promise((resolve, reject) => {
    const range = encodeURIComponent(`${tab}!D5:D100`);
    const fields = encodeURIComponent(
      "sheets.data.rowData.values(formattedValue,hyperlink)"
    );
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}?ranges=${range}&fields=${fields}&includeGridData=true`;
    https.get(url, { headers: { Authorization: `Bearer ${token}` } }, (res) => {
      let d = "";
      res.on("data", (c) => (d += c));
      res.on("end", () => {
        const data = JSON.parse(d);
        const rows =
          data.sheets?.[0]?.data?.[0]?.rowData || [];
        const map = new Map<number, string>();
        rows.forEach(
          (
            row: { values?: [{ hyperlink?: string }] },
            i: number
          ) => {
            const link = row.values?.[0]?.hyperlink;
            if (link) map.set(i + 4, link); // i+4 because data starts at row index 4
          }
        );
        resolve(map);
      });
    }).on("error", reject);
  });
}

function parseTabRows(
  crewName: string,
  rows: string[][],
  links: Map<number, string>
): AxProject[] {
  const projects: AxProject[] = [];
  // Row 1-2: empty, Row 3: header, Row 4: description, Row 5+: data
  for (let i = 4; i < rows.length; i++) {
    const row = rows[i];
    const no = parseInt(row[1] || "", 10);
    const name = (row[3] || "").trim();
    if (!name || isNaN(no)) continue;
    projects.push({
      no,
      crew: crewName,
      category: (row[2] || "").trim(),
      name,
      link: links.get(i) || null,
      stage: (row[4] || "").trim(),
      type: (row[5] || "").trim(),
      problem: (row[6] || "").trim(),
      solution: (row[7] || "").trim(),
      tools: (row[8] || "").trim(),
      impact: (row[9] || "").trim(),
      manager: (row[10] || "").trim(),
      note: (row[11] || "").trim(),
    });
  }
  return projects;
}

// 단계 문자열 정규화 (기획, 제작중, 적용, 개선 등 다양한 변형 처리)
function normalizeStage(stage: string): string {
  const s = stage.replace(/\s/g, "").toLowerCase();
  if (s.includes("기획")) return "기획";
  if (s.includes("제작") || s.includes("제작중")) return "제작중";
  if (s.includes("적용") && s.includes("개선")) return "적용/개선";
  if (s.includes("개선")) return "개선";
  if (s.includes("적용")) return "적용";
  return stage || "(미정)";
}

export async function fetchAllCrewData(): Promise<CrewSummary[]> {
  const token = await getAccessToken();
  const results: CrewSummary[] = [];

  const tabData = await Promise.all(
    CREW_TABS.map(async (tab) => {
      const [rows, links] = await Promise.all([
        fetchSheetValues(token, `${tab}!A1:L100`),
        fetchNameHyperlinks(token, tab),
      ]);
      return { tab, rows, links };
    })
  );

  for (const { tab, rows, links } of tabData) {
    const projects = parseTabRows(tab, rows, links);
    const byStage: Record<string, number> = {};
    const byType: Record<string, number> = {};

    for (const p of projects) {
      const stage = normalizeStage(p.stage);
      byStage[stage] = (byStage[stage] || 0) + 1;
      const type = p.type || "(미분류)";
      byType[type] = (byType[type] || 0) + 1;
    }

    results.push({
      name: tab,
      totalProjects: projects.length,
      byStage,
      byType,
      projects,
    });
  }

  return results.sort((a, b) => b.totalProjects - a.totalProjects);
}
