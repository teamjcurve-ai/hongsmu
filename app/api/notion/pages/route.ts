import { NextResponse } from "next/server";
import { queryEncyclopedia } from "@/lib/notion";

export const revalidate = 300;

export async function GET() {
  try {
    const items = await queryEncyclopedia();
    return NextResponse.json(items);
  } catch (error) {
    console.error("Notion query failed:", error);
    return NextResponse.json(
      { error: "Failed to fetch from Notion" },
      { status: 500 }
    );
  }
}
