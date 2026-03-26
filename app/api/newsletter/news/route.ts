import { NextResponse } from "next/server";
import { queryNewsArchive } from "@/lib/notion";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const items = await queryNewsArchive();
    return NextResponse.json(items);
  } catch (error) {
    console.error("News archive error:", error);
    return NextResponse.json(
      { error: "Failed to fetch news" },
      { status: 500 }
    );
  }
}
