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
  return JSON.parse(keyJson);
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

function parseTabRows(crewName: string, rows: string[][]): AxProject[] {
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
      const rows = await fetchSheetValues(token, `${tab}!A1:L100`);
      return { tab, rows };
    })
  );

  for (const { tab, rows } of tabData) {
    const projects = parseTabRows(tab, rows);
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
