import { NextResponse } from "next/server";
import { fetchAllCrewData } from "@/lib/sheets";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const data = await fetchAllCrewData();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Sheets API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch sheet data" },
      { status: 500 }
    );
  }
}
